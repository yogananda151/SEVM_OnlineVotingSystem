import { prisma } from '../config/database';

export class ElectionConstituencyRepository {
  async findByElection(electionId: number) {
    return prisma.electionConstituency.findMany({
      where: { electionId },
      include: {
        constituency: {
          include: {
            region: { select: { id: true, name: true } },
            pollingStations: {
              where: { deletedAt: null },
              include: {
                officers: { where: { deletedAt: null }, include: { user: { select: { email: true } } } },
                _count: { select: { voters: true } },
              },
              orderBy: { name: 'asc' },
            },
            _count: { select: { pollingStations: true, voters: true } },
          },
        },
      },
      orderBy: { constituency: { name: 'asc' } },
    });
  }

  async setConstituencies(electionId: number, constituencyIds: number[]) {
    // Delete removed ones, add new ones
    await prisma.electionConstituency.deleteMany({ where: { electionId } });
    if (constituencyIds.length === 0) return [];
    await prisma.electionConstituency.createMany({
      data: constituencyIds.map((constituencyId) => ({ electionId, constituencyId })),
      skipDuplicates: true,
    });
    return this.findByElection(electionId);
  }

  async addConstituency(electionId: number, constituencyId: number) {
    return prisma.electionConstituency.upsert({
      where: { electionId_constituencyId: { electionId, constituencyId } },
      create: { electionId, constituencyId },
      update: {},
    });
  }

  async removeConstituency(electionId: number, constituencyId: number) {
    return prisma.electionConstituency.deleteMany({
      where: { electionId, constituencyId },
    });
  }

  async getConstituencyIds(electionId: number): Promise<number[]> {
    const links = await prisma.electionConstituency.findMany({
      where: { electionId },
      select: { constituencyId: true },
    });
    return links.map((l) => l.constituencyId);
  }
}

export const electionConstituencyRepository = new ElectionConstituencyRepository();
