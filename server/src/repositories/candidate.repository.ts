import { prisma } from '../config/database';

export class CandidateRepository {
  async findAll(constituencyId?: number) {
    return prisma.candidate.findMany({
      where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
      include: {
        party: true,
        constituency: { select: { id: true, name: true, code: true } },
        _count: { select: { votes: true } },
      },
      orderBy: { serialNumber: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.candidate.findUnique({
      where: { id },
      include: { party: true, constituency: true, _count: { select: { votes: true } } },
    });
  }

  async create(data: {
    constituencyId: number;
    partyId?: number | null;
    fullName: string;
    age: number;
    qualification?: string;
    serialNumber: number;
    isIndependent?: boolean;
  }) {
    return prisma.candidate.create({ data, include: { party: true } });
  }

  async update(id: number, data: Partial<{
    fullName: string;
    age: number;
    qualification: string;
    photoUrl: string;
    partyId: number | null;
    isIndependent: boolean;
  }>) {
    return prisma.candidate.update({ where: { id }, data, include: { party: true } });
  }

  async delete(id: number) {
    return prisma.candidate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

export const candidateRepository = new CandidateRepository();
