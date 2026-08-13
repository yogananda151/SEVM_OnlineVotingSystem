import { prisma } from '../config/database';
import { MachineStatus } from '@prisma/client';

export class PollingStationRepository {
  async findAll(constituencyId?: number) {
    return prisma.pollingStation.findMany({
      where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
      include: {
        constituency: { select: { id: true, name: true, code: true, election: { select: { id: true, name: true, status: true } } } },
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
        constituency: { include: { election: true } },
        officers: { include: { user: true } },
        _count: { select: { voters: true, votes: true } },
      },
    });
  }

  async create(data: { constituencyId: number; name: string; code: string; address: string; totalBooths?: number }) {
    return prisma.pollingStation.create({ data, include: { constituency: true } });
  }

  async update(id: number, data: Partial<{
    name: string; address: string; totalBooths: number;
    machineStatus: MachineStatus; isPollingActive: boolean;
  }>) {
    return prisma.pollingStation.update({ where: { id }, data });
  }

  async updateMachineStatus(id: number, machineStatus: MachineStatus, isPollingActive?: boolean) {
    return prisma.pollingStation.update({
      where: { id },
      data: { machineStatus, ...(isPollingActive !== undefined && { isPollingActive }) },
    });
  }

  async delete(id: number) {
    return prisma.pollingStation.update({ where: { id }, data: { deletedAt: new Date() } });
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
