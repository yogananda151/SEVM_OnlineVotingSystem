import { Request, Response, NextFunction } from 'express';
import { electionRepository } from '../repositories/election.repository';
import { voteRepository } from '../repositories/vote.repository';
import { auditRepository } from '../repositories/audit.repository';
import { sendSuccess, sendError } from '../utils/response';
import { ElectionStatus } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

export class ElectionController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const elections = await electionRepository.findAll();
      sendSuccess(res, elections);
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
      const data = { ...req.body };
      if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate);
      const election = await electionRepository.update(id, data);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Updated election: ${election.name}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, election, 'Election updated');
    } catch (err) { next(err); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;

      if (!Object.values(ElectionStatus).includes(status)) {
        throw new AppError('Invalid election status.', 400);
      }

      const data: Partial<{ status: ElectionStatus; startTime: Date; endTime: Date }> = { status };
      if (status === ElectionStatus.ACTIVE) data.startTime = new Date();
      if (status === ElectionStatus.CLOSED) data.endTime = new Date();

      const election = await electionRepository.update(id, data);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'UPDATE',
        module: 'Election',
        description: `Election status changed to: ${status}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, election, `Election status updated to ${status}`);
    } catch (err) { next(err); }
  }

  async publishResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const election = await electionRepository.findById(id);
      if (!election) throw new AppError('Election not found.', 404);
      if (election.status !== ElectionStatus.CLOSED) throw new AppError('Only closed elections can have results published.', 400);

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

      // Only show results if published (or commissioner requests)
      if (!election.isResultPublished && req.user?.role !== 'COMMISSIONER') {
        throw new AppError('Results have not been published yet.', 403);
      }

      const results = await voteRepository.getResults(id);
      sendSuccess(res, { election, results });
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await electionRepository.delete(id);
      await auditRepository.create({
        userId: req.user!.userId,
        electionId: id,
        action: 'DELETE',
        module: 'Election',
        description: `Deleted election ID: ${id}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, null, 'Election deleted');
    } catch (err) { next(err); }
  }
}

export const electionController = new ElectionController();
