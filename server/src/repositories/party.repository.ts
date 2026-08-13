import { prisma } from '../config/database';

export class PartyRepository {
  async findAll() {
    return prisma.politicalParty.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { candidates: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.politicalParty.findUnique({
      where: { id },
      include: { candidates: { where: { deletedAt: null }, include: { constituency: true } } },
    });
  }

  async create(data: { name: string; abbreviation: string; symbol?: string; color?: string; foundedYear?: number }) {
    return prisma.politicalParty.create({ data });
  }

  async update(id: number, data: Partial<{
    name: string; abbreviation: string; symbol: string;
    symbolUrl: string; color: string; foundedYear: number; isActive: boolean;
  }>) {
    return prisma.politicalParty.update({ where: { id }, data });
  }

  async delete(id: number) {
    return prisma.politicalParty.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

export const partyRepository = new PartyRepository();
