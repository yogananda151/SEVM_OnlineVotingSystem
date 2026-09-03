import { prisma } from '../config/database';
import { MachineStatus } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

export class PollingStationRepository {
  async findAll(constituencyId?: number) {
    return prisma.pollingStation.findMany({
      where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
      include: {
        constituency: {
          select: {
            id: true,
            name: true,
            code: true,
            region: { select: { id: true, name: true } },
          },
        },
        officers: { where: { deletedAt: null }, include: { user: { select: { email: true } } } },
        _count: { select: { voters: true, votes: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.pollingStation.findUnique({
      where: { id },
      include: {
        constituency: { include: { region: true } },
        officers: { where: { deletedAt: null }, include: { user: true } },
        _count: { select: { voters: true, votes: true } },
      },
    });
  }

  async create(data: {
    constituencyId: number;
    name: string;
    code: string;
    address: string;
    capacity?: number;
    totalBooths?: number;
  }) {
    // Validate constituency exists and is active
    const constituency = await prisma.constituency.findUnique({
      where: { id: data.constituencyId, deletedAt: null },
    });
    if (!constituency) {
      throw new Error(
        'The selected constituency does not exist. Please select a valid constituency.',
      );
    }

    // Pre-check: code must be unique among active (non-deleted) polling stations
    const existingCode = await prisma.pollingStation.findFirst({
      where: { code: data.code, deletedAt: null },
    });
    if (existingCode) {
      throw new AppError(
        `A polling station with code "${data.code}" already exists. Please use a different code.`,
        409,
      );
    }

    return prisma.pollingStation.create({ data, include: { constituency: { include: { region: true } } } });
  }

  async update(
    id: number,
    data: Partial<{
      name: string;
      address: string;
      capacity: number;
      totalBooths: number;
      machineStatus: MachineStatus;
      isPollingActive: boolean;
    }>,
  ) {
    return prisma.pollingStation.update({ where: { id }, data });
  }

  async updateMachineStatus(id: number, machineStatus: MachineStatus, isPollingActive?: boolean) {
    return prisma.pollingStation.update({
      where: { id },
      data: { machineStatus, ...(isPollingActive !== undefined && { isPollingActive }) },
    });
  }

  async delete(id: number) {
    const station = await prisma.pollingStation.findUnique({ where: { id } });
    if (!station) throw new Error('Polling station not found');
    const voterCount = await prisma.voter.count({ where: { pollingStationId: id, deletedAt: null } });
    const voteCount = await prisma.vote.count({ where: { pollingStationId: id } });
    if (voteCount > 0) {
      throw new Error('Cannot delete polling station. Votes have already been cast here.');
    }
    if (voterCount > 0) {
      throw new Error(
        `Cannot delete polling station. It has ${voterCount} registered voter(s). Reassign or remove them first.`,
      );
    }
    const now = new Date();
    const timestamp = Date.now();
    return prisma.pollingStation.update({
      where: { id },
      data: {
        code: `${station.code}_del_${timestamp}`,
        deletedAt: now,
        isActive: false,
      },
    });
  }

  async getTurnout(id: number) {
    const [totalVoters, votedCount] = await Promise.all([
      prisma.voter.count({ where: { pollingStationId: id, deletedAt: null } }),
      prisma.voter.count({ where: { pollingStationId: id, hasVoted: true } }),
    ]);
    return {
      totalVoters,
      votedCount,
      remaining: totalVoters - votedCount,
      turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
    };
  }
}

export const pollingStationRepository = new PollingStationRepository();
