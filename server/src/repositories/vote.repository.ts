import { prisma } from '../config/database';
import { generateVoteHash, generateReferenceNumber } from '../utils/crypto';
import { AppError } from '../middleware/error.middleware';
import { ElectionStatus, MachineStatus } from '@prisma/client';

export class VoteRepository {
  async castVote(data: { voterId: number; candidateId: number; pollingStationId: number }) {
    const { voterId, candidateId, pollingStationId } = data;

    return prisma.$transaction(async (tx) => {
      // 1. Verify voter exists, hasn't voted, is in correct station
      const voter = await tx.voter.findUnique({
        where: { id: voterId },
        include: { constituency: { include: { election: true } } },
      });
      if (!voter) throw new AppError('Voter not found.', 404);
      if (voter.hasVoted) throw new AppError('Voter has already cast their vote.', 409);
      if (voter.pollingStationId !== pollingStationId) throw new AppError('Voter is not registered at this polling station.', 403);

      // 2. Verify election is active
      const election = voter.constituency.election;
      if (election.status !== ElectionStatus.ACTIVE) throw new AppError('Election is not currently active.', 400);

      // 3. Verify polling station is active
      const station = await tx.pollingStation.findUnique({ where: { id: pollingStationId } });
      if (!station) throw new AppError('Polling station not found.', 404);
      if (station.machineStatus !== MachineStatus.ACTIVE) throw new AppError('Voting machine is not active.', 400);

      // 4. Verify candidate belongs to same constituency
      const candidate = await tx.candidate.findUnique({
        where: { id: candidateId },
        include: { party: true },
      });
      if (!candidate || candidate.constituencyId !== voter.constituencyId) throw new AppError('Invalid candidate.', 400);

      // 5. Generate vote hash & reference number
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(2, 15);
      const voteHash = generateVoteHash({ voterId, candidateId, pollingStationId, timestamp, nonce });
      const referenceNumber = generateReferenceNumber();

      // 6. Create vote
      const vote = await tx.vote.create({
        data: { voterId, candidateId, pollingStationId, voteHash, referenceNumber },
      });

      // 7. Create VVPAT record
      const vvpat = await tx.digitalVVPAT.create({
        data: {
          voteId: vote.id,
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          partyName: candidate.party?.name ?? 'Independent',
          partySymbolUrl: candidate.party?.symbolUrl ?? null,
          electionName: election.name,
          referenceNumber,
          voteHash,
        },
      });

      // 8. Mark voter as voted
      await tx.voter.update({
        where: { id: voterId },
        data: { hasVoted: true, votedAt: new Date() },
      });

      // 9. Audit log
      await tx.auditLog.create({
        data: {
          action: 'VOTE_CAST',
          module: 'Voting',
          description: `Vote cast at station ${pollingStationId} - Ref: ${referenceNumber}`,
          electionId: election.id,
          metadata: { referenceNumber, voteHash },
        },
      });

      return { vote, vvpat, candidate, election };
    });
  }

  async getVvpat(referenceNumber: string) {
    return prisma.digitalVVPAT.findFirst({
      where: { referenceNumber },
      include: { candidate: { include: { party: true } } },
    });
  }

  async getResults(electionId: number) {
    const constituencies = await prisma.constituency.findMany({
      where: { electionId, deletedAt: null },
      include: {
        candidates: {
          include: {
            party: true,
            _count: { select: { votes: true } },
          },
          orderBy: { votes: { _count: 'desc' } },
        },
      },
    });
    return constituencies;
  }

  async getDashboardStats() {
    const [totalElections, activeElection, totalStations, totalVoters, totalCandidates, totalParties, totalVotes] =
      await Promise.all([
        prisma.election.count({ where: { deletedAt: null } }),
        prisma.election.findFirst({ where: { status: ElectionStatus.ACTIVE } }),
        prisma.pollingStation.count({ where: { deletedAt: null } }),
        prisma.voter.count({ where: { deletedAt: null } }),
        prisma.candidate.count({ where: { deletedAt: null } }),
        prisma.politicalParty.count({ where: { deletedAt: null } }),
        prisma.vote.count(),
      ]);

    const turnoutPercent = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : '0.00';

    return {
      totalElections,
      activeElection,
      totalStations,
      totalVoters,
      totalCandidates,
      totalParties,
      totalVotes,
      turnoutPercent,
    };
  }
}

export const voteRepository = new VoteRepository();
