import { prisma } from '../config/database';
import { ElectionStatus } from '@prisma/client';

export class ElectionRepository {
  async findAll() {
    return prisma.election.findMany({
      where: { deletedAt: null },
      include: {
        officer: {
          select: { id: true, fullName: true, employeeId: true },
        },
        electionConstituencies: {
          include: {
            constituency: {
              select: { id: true, name: true, _count: { select: { voters: true, candidates: true } } },
            },
          },
        },
        _count: { select: { electionConstituencies: true, candidates: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.election.findUnique({
      where: { id, deletedAt: null },
      include: {
        officer: {
          include: {
            user: { select: { id: true, email: true, isActive: true } },
            pollingStation: { select: { id: true, name: true, code: true } },
          },
        },
        electionConstituencies: {
          include: {
            constituency: {
              include: {
                region: { select: { id: true, name: true } },
                pollingStations: { where: { deletedAt: null } },
                _count: { select: { voters: true } },
              },
            },
          },
        },
        candidates: { where: { deletedAt: null }, include: { party: true, constituency: true } },
      },
    });
  }

  async findActive() {
    return prisma.election.findFirst({
      where: { status: ElectionStatus.ACTIVE, deletedAt: null },
      include: {
        electionConstituencies: {
          include: {
            constituency: {
              include: {
                pollingStations: {
                  where: { deletedAt: null },
                  include: { officers: { where: { deletedAt: null }, include: { user: true } } },
                },
                candidates: { where: { deletedAt: null }, include: { party: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    electionType: string;
    scheduledDate: Date;
  }) {
    return prisma.election.create({ data });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      electionType: string;
      scheduledDate: Date;
      status: ElectionStatus;
      startTime: Date;
      endTime: Date;
      isResultPublished: boolean;
      officerId: number | null;
    }>,
  ) {
    return prisma.election.update({ where: { id }, data });
  }

  async setOfficer(electionId: number, officerId: number | null) {
    return prisma.election.update({
      where: { id: electionId },
      data: { officerId },
      include: {
        officer: {
          include: {
            user: { select: { id: true, email: true, isActive: true } },
            pollingStation: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
  }

  async delete(id: number) {
    return prisma.election.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getStats(electionId: number) {
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return null;

    const electionConstituencies = await prisma.electionConstituency.findMany({
      where: { electionId },
      select: { constituencyId: true },
    });
    const constituencyIds = electionConstituencies.map((ec) => ec.constituencyId);

    const [totalVoters, votedCount, totalCandidates, totalStations] = await Promise.all([
      prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
      prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, hasVoted: true } }),
      prisma.candidate.count({ where: { electionId, deletedAt: null } }),
      prisma.pollingStation.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
    ]);

    return {
      election,
      totalVoters,
      votedCount,
      turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
      totalCandidates,
      totalStations,
      totalConstituencies: constituencyIds.length,
    };
  }

  /** Pre-publish readiness checklist */
  async getReadiness(electionId: number) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        officer: { select: { id: true, fullName: true, employeeId: true } },
      },
    });
    if (!election) return null;

    const electionConstituencies = await prisma.electionConstituency.findMany({
      where: { electionId },
      include: {
        constituency: {
          include: {
            pollingStations: {
              where: { deletedAt: null },
              include: { officers: { where: { deletedAt: null } } },
            },
            _count: { select: { voters: true } },
          },
        },
      },
    });

    const constituencyIds = electionConstituencies.map((ec) => ec.constituencyId);
    const totalConstituencies = constituencyIds.length;

    // Candidates per constituency
    const candidatesByConstituency = await prisma.candidate.groupBy({
      by: ['constituencyId'],
      where: { electionId, deletedAt: null },
      _count: { id: true },
    });
    const constituenciesWithoutCandidates = constituencyIds.filter(
      (cid) => !candidatesByConstituency.find((c) => c.constituencyId === cid),
    );

    // Polling stations without officers
    const allStations = electionConstituencies.flatMap((ec) => ec.constituency.pollingStations);
    const stationsWithoutOfficer = allStations.filter((s) => s.officers.length === 0);

    // Total voters
    const totalVoters = await prisma.voter.count({
      where: { constituencyId: { in: constituencyIds }, deletedAt: null },
    });

    const issues: string[] = [];
    if (totalConstituencies === 0) issues.push('No constituencies selected for this election.');
    if (!election.officer) issues.push('No Election Officer assigned. Please assign an Election Officer.');
    if (constituenciesWithoutCandidates.length > 0) {
      const names = electionConstituencies
        .filter((ec) => constituenciesWithoutCandidates.includes(ec.constituencyId))
        .map((ec) => ec.constituency.name);
      issues.push(`${names.length} constituency(ies) have no candidates: ${names.join(', ')}`);
    }
    if (stationsWithoutOfficer.length > 0) {
      issues.push(`${stationsWithoutOfficer.length} polling station(s) have no officer assigned.`);
    }
    if (totalVoters === 0) issues.push('No voters registered in the selected constituencies.');

    return {
      election,
      officer: election.officer,
      totalConstituencies,
      totalStations: allStations.length,
      totalVoters,
      totalCandidates: candidatesByConstituency.reduce((s, c) => s + c._count.id, 0),
      stationsWithoutOfficer: stationsWithoutOfficer.length,
      constituenciesWithoutCandidates: constituenciesWithoutCandidates.length,
      hasElectionOfficer: !!election.officer,
      issues,
      isReady: issues.length === 0,
    };
  }
}

export const electionRepository = new ElectionRepository();
