import { prisma } from '../config/database';

export class ConstituencyRepository {
  async findAll(electionId?: number) {
    return prisma.constituency.findMany({
      where: { deletedAt: null, ...(electionId && { electionId }) },
      include: {
        election: { select: { id: true, name: true, status: true } },
        _count: { select: { pollingStations: true, candidates: true, voters: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.constituency.findUnique({
      where: { id },
      include: {
        election: true,
        pollingStations: { include: { officers: { include: { user: true } } } },
        candidates: { include: { party: true } },
        _count: { select: { voters: true } },
      },
    });
  }

  async create(data: { electionId: number; name: string; code: string; state: string; district: string; totalVoters?: number }) {
    return prisma.constituency.create({ data, include: { election: true } });
  }

  async update(id: number, data: Partial<{ name: string; code: string; state: string; district: string; totalVoters: number }>) {
    return prisma.constituency.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.constituency.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}

export const constituencyRepository = new ConstituencyRepository();
