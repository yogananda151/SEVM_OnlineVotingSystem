import { Request, Response, NextFunction } from 'express';
import { electionRepository } from '../repositories/election.repository';
import { electionConstituencyRepository } from '../repositories/election-constituency.repository';
import { voteRepository } from '../repositories/vote.repository';
import { auditRepository } from '../repositories/audit.repository';
import { sendSuccess, sendError } from '../utils/response';
import { ElectionStatus, UserRole } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SCHEDULED', 'ACTIVE'],
  SCHEDULED: ['ACTIVE', 'DRAFT'],
  ACTIVE: ['PAUSED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  CLOSED: ['RESULTS_PUBLISHED'],
  RESULTS_PUBLISHED: [],
};

export class ElectionController {
  async getMyElections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401);
      }
      const officer = await prisma.electionOfficer.findUnique({
        where: { userId: req.user.userId },
      });
      if (!officer || officer.deletedAt) {
        sendSuccess(res, []);
        return;
      }
      const elections = await electionRepository.findByOfficer(officer.id, officer.pollingStationId);
      sendSuccess(res, elections);
    } catch (err) { next(err); }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await electionRepository.findAll());
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const election = await electionRepository.findById(Number(req.params.id));
      if (!election) { sendError(res, 'Election not found', 404); return; }
      sendSuccess(res, election);
    } catch (err) { next(err); }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await electionRepository.getStats(Number(req.params.id));
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await voteRepository.getDashboardStats();
      sendSuccess(res, stats);
    } catch (err) { next(err); }
  }

  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const readiness = await electionRepository.getReadiness(Number(req.params.id));
      if (!readiness) { sendError(res, 'Election not found', 404); return; }
      sendSuccess(res, readiness);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const election = await electionRepository.create({
        ...req.body,
        scheduledDate: new Date(req.body.scheduledDate),
      });
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: election.id,
        action: 'CREATE',
        module: 'Election',
        description: `Created election: ${election.name}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, election, 'Election created successfully', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);

      if (
        election.status === ElectionStatus.ACTIVE ||
        election.status === ElectionStatus.CLOSED ||
        election.status === ElectionStatus.RESULTS_PUBLISHED
      ) {
        throw new AppError(
          `Cannot edit election in "${election.status}" status. Election configuration is locked once activated or completed.`,
          400,
        );
      }

      const data = { ...req.body };
      if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
      const updated = await electionRepository.update(id, data);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Updated election: ${updated.name}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated, 'Election updated');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!Object.values(ElectionStatus).includes(status)) {
        throw new AppError('Invalid election status.', 400);
      }

      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);

      // Starting and stopping elections (ACTIVE, PAUSED, CLOSED) can ONLY be done by Election Officers
      if (status === ElectionStatus.ACTIVE || status === ElectionStatus.CLOSED || status === ElectionStatus.PAUSED) {
        if (req.user?.role !== UserRole.OFFICER) {
          throw new AppError('Elections can only be started and stopped by assigned Election Officers.', 403);
        }

        const officer = await prisma.electionOfficer.findUnique({
          where: { userId: req.user.userId },
        });
        if (!officer || officer.deletedAt) {
          throw new AppError('Election Officer profile not found.', 404);
        }

        // Check if officer is assigned to this election (directly as supervising officer or via polling station)
        const isSupervisingOfficer = election.officerId === officer.id;
        const isStationOfficer = !!officer.pollingStationId && election.electionConstituencies.some((ec) =>
          ec.constituency.pollingStations.some((ps) => ps.id === officer.pollingStationId),
        );

        if (!isSupervisingOfficer && !isStationOfficer) {
          throw new AppError('You are not assigned to this election.', 403);
        }
      }

      // Enforce valid transitions
      const allowed = VALID_TRANSITIONS[election.status] ?? [];
      if (!allowed.includes(status)) {
        throw new AppError(
          `Cannot change election from "${election.status}" to "${status}". ` +
          `Valid transitions from ${election.status}: ${allowed.join(', ') || 'none'}.`,
          400,
        );
      }

      // Before activating or scheduling, check readiness
      if (status === ElectionStatus.ACTIVE || status === ElectionStatus.SCHEDULED) {
        const readiness = await electionRepository.getReadiness(id);
        if (readiness && !readiness.isReady) {
          throw new AppError(
            `Cannot activate election. Issues found:\n• ${readiness.issues.join('\n• ')}`,
            400,
          );
        }
      }

      const data: Partial<{ status: ElectionStatus; startTime: Date; endTime: Date }> = { status };
      if (status === ElectionStatus.ACTIVE) data.startTime = new Date();
      if (status === ElectionStatus.CLOSED) data.endTime = new Date();

      const updated = await electionRepository.update(id, data);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Election status changed to: ${status}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated, `Election status updated to ${status}`);
    } catch (err) { next(err); }
  }

  async getConstituencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const links = await electionConstituencyRepository.findByElection(Number(req.params.id));
      sendSuccess(res, links);
    } catch (err) { next(err); }
  }

  async setConstituencies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { constituencyIds } = req.body as { constituencyIds: number[] };

      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);
      if (election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError('Cannot change constituencies after the election has been activated.', 400);
      }

      const links = await electionConstituencyRepository.setConstituencies(id, constituencyIds);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Updated election constituencies: ${constituencyIds.length} selected`,
        ipAddress: req.ip,
      });
      sendSuccess(res, links, 'Election constituencies updated');
    } catch (err) { next(err); }
  }

  // ── Election Officer ───────────────────────────────────────────────

  async getOfficer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) { sendError(res, 'Election not found', 404); return; }
      sendSuccess(res, election.officer ?? null, 'Election officer retrieved');
    } catch (err) { next(err); }
  }

  async setOfficer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { officerId } = req.body as { officerId: number | null };

      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);
      if (election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError('Cannot change the Election Officer after the election has been activated.', 400);
      }

      if (officerId !== null && officerId !== undefined) {
        // Validate officer exists and is active
        const officer = await prisma.electionOfficer.findUnique({
          where: { id: officerId },
          include: { user: { select: { isActive: true } } },
        });
        if (!officer || officer.deletedAt) {
          throw new AppError('The selected officer does not exist. Please select a valid Election Officer.', 404);
        }
        if (!officer.user.isActive) {
          throw new AppError(
            'The selected Election Officer is inactive and cannot be assigned. Please select an active officer.',
            400,
          );
        }
      }

      const updated = await electionRepository.setOfficer(id, officerId ?? null);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: officerId
          ? `Assigned Election Officer ID ${officerId} to election: ${election.name}`
          : `Removed Election Officer from election: ${election.name}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, updated.officer, 'Election officer assigned successfully');
    } catch (err) { next(err); }
  }

  // ── Results ────────────────────────────────────────────────────────

  async publishResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);
      if (election.status !== ElectionStatus.CLOSED) {
        throw new AppError('Only closed elections can have results published.', 400);
      }

      await electionRepository.update(id, {
        status: ElectionStatus.RESULTS_PUBLISHED,
        isResultPublished: true,
      });
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'PUBLISH_RESULTS',
        module: 'Election',
        description: `Results published for election: ${election.name}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, null, 'Results published successfully');
    } catch (err) { next(err); }
  }

  async getResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);

      if (!election.isResultPublished && req.user?.role !== 'COMMISSIONER') {
        throw new AppError('Results have not been published yet.', 403);
      }

      const results = await voteRepository.getResults(id);
      sendSuccess(res, { election, results });
    } catch (err) { next(err); }
  }

  async clone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const original = await electionRepository.findById(id);
      if (!original) throw new AppError('Election not found.', 404);

      const baseName = `Copy of ${original.name}`;
      const name = baseName.length > 200 ? baseName.substring(0, 200) : baseName;

      const cloned = await electionRepository.create({
        name,
        description: original.description ?? undefined,
        electionType: original.electionType,
        scheduledDate: original.scheduledDate,
      });

      if (original.electionConstituencies && original.electionConstituencies.length > 0) {
        const constituencyIds = original.electionConstituencies.map((ec) => ec.constituencyId);
        await electionConstituencyRepository.setConstituencies(cloned.id, constituencyIds);
      }

      await auditRepository.create({
        userId: req.user!.userId,
        electionId: cloned.id,
        action: 'CREATE',
        module: 'Election',
        description: `Cloned election from ID ${id} (${original.name}) into new draft ID ${cloned.id}`,
        ipAddress: req.ip,
      });

      const fullCloned = await electionRepository.findById(cloned.id);
      sendSuccess(res, fullCloned, 'Election cloned successfully', 201);
    } catch (err) { next(err); }
  }

  async autoAssignOfficers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);

      if (election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError('Cannot assign officers after election has started.', 400);
      }

      const participatingLinks = await electionConstituencyRepository.findByElection(id);
      const constituencyIds = participatingLinks.map((link) => link.constituencyId);

      if (constituencyIds.length === 0) {
        throw new AppError('No constituencies are selected for this election. Select constituencies first.', 400);
      }

      const stations = await prisma.pollingStation.findMany({
        where: {
          constituencyId: { in: constituencyIds },
          deletedAt: null,
        },
        include: {
          officers: {
            where: { deletedAt: null },
          },
        },
      });

      const unassignedStations = stations.filter((s) => s.officers.length === 0);
      if (unassignedStations.length === 0) {
        sendSuccess(res, { count: 0 }, 'All polling stations already have assigned officers.');
        return;
      }

      const availableOfficers = await prisma.electionOfficer.findMany({
        where: {
          deletedAt: null,
          pollingStationId: null,
          id: election.officerId ? { not: election.officerId } : undefined,
          user: { isActive: true },
        },
        orderBy: { id: 'asc' },
      });

      if (availableOfficers.length === 0) {
        throw new AppError('No unassigned officers available. Please register more officers in Master Data → Officers.', 400);
      }

      let assignedCount = 0;
      const assignLimit = Math.min(unassignedStations.length, availableOfficers.length);

      for (let i = 0; i < assignLimit; i++) {
        const station = unassignedStations[i];
        const officer = availableOfficers[i];

        await prisma.electionOfficer.update({
          where: { id: officer.id },
          data: { pollingStationId: station.id },
        });
        assignedCount++;
      }

      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Auto-assigned ${assignedCount} officers to polling stations for election ${election.name}`,
        ipAddress: req.ip,
      });

      sendSuccess(
        res,
        { count: assignedCount, totalNeeded: unassignedStations.length },
        `Successfully auto-assigned ${assignedCount} officer(s) to polling stations.${
          assignedCount < unassignedStations.length ? ` (${unassignedStations.length - assignedCount} station(s) still need officers)` : ''
        }`
      );
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);

      if (election.status === ElectionStatus.ACTIVE) {
        throw new AppError(
          'Cannot delete an active election while voting is in progress. Please pause or close the election first.',
          400,
        );
      }

      await electionRepository.delete(id);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'DELETE',
        module: 'Election',
        description: `Deleted election ID: ${id} (${election.name})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, null, 'Election deleted');
    } catch (err) { next(err); }
  }
}

export const electionController = new ElectionController();
