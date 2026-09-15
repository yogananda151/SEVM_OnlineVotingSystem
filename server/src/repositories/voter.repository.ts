import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class VoterRepository {
  async findAll(filters: { pollingStationId?: number; constituencyId?: number; search?: string; page?: number; limit?: number }) {
    const { pollingStationId, constituencyId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (pollingStationId) where.pollingStationId = pollingStationId;
    if (constituencyId) where.constituencyId = constituencyId;
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
          electionStatuses: { select: { electionId: true, hasVoted: true, votedAt: true } },
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
        votes: { include: { candidate: { include: { party: true } } } },
        electionStatuses: true,
      },
    });
  }

  async findByVoterId(voterId: string) {
    return prisma.voter.findFirst({
      where: { voterId, deletedAt: null },
      include: { pollingStation: true, constituency: { include: { region: true } } },
    });
  }

  async findByAadhaarHash(aadhaarHash: string) {
    return prisma.voter.findFirst({
      where: { aadhaarHash, deletedAt: null },
      include: { pollingStation: true, constituency: { include: { region: true } } },
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
    // Pre-check: voterId must be unique among active (non-deleted) voters
    const existingVoter = await prisma.voter.findFirst({
      where: { voterId: data.voterId, deletedAt: null },
    });
    if (existingVoter) {
      throw new AppError(
        `Voter ID "${data.voterId}" is already registered. Please use a different Voter ID.`,
        409,
      );
    }

    return prisma.voter.create({ data });
  }

  async update(id: number, data: Partial<{ fullName: string; address: string; phone: string; photoUrl: string }>) {
    return prisma.voter.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    const voter = await prisma.voter.findUnique({
      where: { id },
      include: { votes: { take: 1 } },
    });
    if (!voter) throw new AppError('Voter not found', 404);
    if (voter.votes && voter.votes.length > 0) {
      throw new AppError('Cannot delete a voter who has already cast a vote.', 400);
    }
    const now = new Date();
    const timestamp = Date.now();
    await prisma.voter.update({
      where: { id },
      data: {
        voterId: `${voter.voterId}_del_${timestamp}`,
        deletedAt: now,
        isActive: false,
      },
    });
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
