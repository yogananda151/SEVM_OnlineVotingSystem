import { prisma } from '../config/database';

export class VoterRepository {
  async findAll(filters: { pollingStationId?: number; constituencyId?: number; hasVoted?: boolean; search?: string; page?: number; limit?: number }) {
    const { pollingStationId, constituencyId, hasVoted, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (pollingStationId) where.pollingStationId = pollingStationId;
    if (constituencyId) where.constituencyId = constituencyId;
    if (hasVoted !== undefined) where.hasVoted = hasVoted;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { voterId: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.voter.findMany({
        where,
        include: {
          pollingStation: { select: { id: true, name: true, code: true } },
          constituency: { select: { id: true, name: true, code: true } },
        },
        skip,
        take: limit,
        orderBy: { serialNumber: 'asc' },
      }),
      prisma.voter.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number) {
    return prisma.voter.findUnique({
      where: { id },
      include: {
        pollingStation: true,
        constituency: true,
        vote: { include: { candidate: { include: { party: true } } } },
      },
    });
  }

  async findByVoterId(voterId: string) {
    return prisma.voter.findUnique({
      where: { voterId },
      include: { pollingStation: true, constituency: { include: { election: true } } },
    });
  }

  async findByAadhaarHash(aadhaarHash: string) {
    return prisma.voter.findFirst({
      where: { aadhaarHash, deletedAt: null },
      include: { pollingStation: true, constituency: { include: { election: true } } },
    });
  }

  async create(data: {
    constituencyId: number;
    pollingStationId: number;
    fullName: string;
    voterId: string;
    aadhaarHash?: string;
    dateOfBirth: Date;
    gender: string;
    address: string;
    phone?: string;
    serialNumber: number;
  }) {
    return prisma.voter.create({ data });
  }

  async update(id: number, data: Partial<{ fullName: string; address: string; phone: string; photoUrl: string }>) {
    return prisma.voter.update({ where: { id }, data });
  }

  async markVoted(id: number): Promise<void> {
    await prisma.voter.update({ where: { id }, data: { hasVoted: true, votedAt: new Date() } });
  }

  async delete(id: number): Promise<void> {
    await prisma.voter.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  async bulkCreate(voters: Array<{
    constituencyId: number;
    pollingStationId: number;
    fullName: string;
    voterId: string;
    aadhaarHash?: string;
    dateOfBirth: Date;
    gender: string;
    address: string;
    phone?: string;
    serialNumber: number;
  }>) {
    return prisma.voter.createMany({ data: voters, skipDuplicates: true });
  }
}

export const voterRepository = new VoterRepository();
