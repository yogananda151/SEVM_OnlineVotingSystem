import { prisma } from '../config/database';
import { ElectionStatus } from '@prisma/client';

export class ElectionRepository {
  async findAll() {
    return prisma.election.findMany({
      where: { deletedAt: null },
      include: {
        constituencies: {
          select: { id: true, name: true, _count: { select: { voters: true, candidates: true } } },
        },
        _count: { select: { constituencies: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async findById(id: number) {
    return prisma.election.findUnique({
      where: { id, deletedAt: null },
      include: {
        constituencies: {
          include: {
            pollingStations: true,
            candidates: { include: { party: true } },
          },
        },
      },
    });
  }

  async findActive() {
    return prisma.election.findFirst({
      where: { status: ElectionStatus.ACTIVE, deletedAt: null },
      include: {
        constituencies: {
          include: {
            pollingStations: { include: { officers: { include: { user: true } } } },
            candidates: { include: { party: true } },
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

  async update(id: number, data: Partial<{
    name: string;
    description: string;
    electionType: string;
    scheduledDate: Date;
    status: ElectionStatus;
    startTime: Date;
    endTime: Date;
    isResultPublished: boolean;
  }>) {
    return prisma.election.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.election.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async getStats(electionId: number) {
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) return null;

    const constituencies = await prisma.constituency.findMany({
      where: { electionId, deletedAt: null },
      select: { id: true },
    });
    const constituencyIds = constituencies.map((c) => c.id);

    const [totalVoters, votedCount, totalCandidates, totalStations] = await Promise.all([
      prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
      prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, hasVoted: true } }),
      prisma.candidate.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
      prisma.pollingStation.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
    ]);

    return {
      election,
      totalVoters,
      votedCount,
      turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
      totalCandidates,
      totalStations,
      totalConstituencies: constituencies.length,
    };
  }
}

export const electionRepository = new ElectionRepository();
