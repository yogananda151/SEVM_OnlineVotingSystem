import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class CandidateRepository {
  async findAll(electionId?: number, constituencyId?: number) {
    return prisma.candidate.findMany({
      where: {
        deletedAt: null,
        ...(electionId && { electionId }),
        ...(constituencyId && { constituencyId }),
      },
      include: {
        constituency: { select: { id: true, name: true, code: true } },
        party: true,
        _count: { select: { votes: true } },
      },
      orderBy: [{ constituencyId: 'asc' }, { serialNumber: 'asc' }],
    });
  }

  async findById(id: number) {
    return prisma.candidate.findUnique({
      where: { id },
      include: { constituency: true, party: true, _count: { select: { votes: true } } },
    });
  }

  async create(data: {
    electionId: number;
    constituencyId: number;
    partyId?: number | null;
    fullName: string;
    age: number;
    qualification?: string;
    serialNumber: number;
    isIndependent?: boolean;
  }) {
    // Validate constituency belongs to the election
    const link = await prisma.electionConstituency.findUnique({
      where: {
        electionId_constituencyId: {
          electionId: data.electionId,
          constituencyId: data.constituencyId,
        },
      },
    });
    if (!link) {
      throw new Error(
        'The selected constituency is not part of this election. Please select a constituency that has been added to this election.',
      );
    }

    // Pre-check: serial number must be unique per election+constituency among active candidates
    const existingSerial = await prisma.candidate.findFirst({
      where: {
        electionId: data.electionId,
        constituencyId: data.constituencyId,
        serialNumber: data.serialNumber,
        deletedAt: null,
      },
    });
    if (existingSerial) {
      throw new AppError(
        `Serial number ${data.serialNumber} is already assigned to another active candidate in this constituency. Please use a different serial number.`,
        409,
      );
    }

    return prisma.candidate.create({ data, include: { constituency: true, party: true } });
  }

  async update(
    id: number,
    data: Partial<{
      fullName: string;
      age: number;
      qualification: string;
      serialNumber: number;
      partyId: number | null;
      isIndependent: boolean;
      photoUrl: string;
    }>,
  ) {
    return prisma.candidate.update({ where: { id }, data });
  }

  async delete(id: number) {
    const voteCount = await prisma.vote.count({ where: { candidateId: id } });
    if (voteCount > 0) {
      throw new Error('Cannot remove candidate. They have already received votes.');
    }
    return prisma.candidate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}

export const candidateRepository = new CandidateRepository();
