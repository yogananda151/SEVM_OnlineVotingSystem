import { prisma } from '../config/database';
import { generateVoteHash, generateReferenceNumber } from '../utils/crypto';
import { AppError } from '../middleware/error.middleware';
import { ElectionStatus, MachineStatus } from '@prisma/client';

export class VoteRepository {
  async castVote(data: { voterId: number; candidateId: number; pollingStationId: number }) {
    const { voterId, candidateId, pollingStationId } = data;

    return prisma.$transaction(async (tx) => {
      // 1. Verify voter exists, is active, is in correct station
      const voter = await tx.voter.findUnique({
        where: { id: voterId },
        include: { constituency: true },
      });
      if (!voter) throw new AppError('Voter not found.', 404);
      if (voter.deletedAt) throw new AppError('Voter record not found.', 404);
      if (!voter.isActive) throw new AppError('Voter account is inactive.', 403);
      if (voter.pollingStationId !== pollingStationId) throw new AppError('Voter is not registered at this polling station.', 403);

      // 2. Verify election is active via ElectionConstituency (most recent active election for this constituency)
      const electionLink = await tx.electionConstituency.findFirst({
        where: {
          constituencyId: voter.constituencyId,
          election: { status: ElectionStatus.ACTIVE },
        },
        include: { election: true },
        orderBy: { election: { scheduledDate: 'desc' } },
      });
      const election = electionLink?.election;
      if (!election) throw new AppError('No active election found for this constituency.', 400);

      // 3. Check if voter has ALREADY voted in THIS specific election
      const existingStatus = await tx.electionVoterStatus.findUnique({
        where: { voterId_electionId: { voterId, electionId: election.id } },
      });
      if (existingStatus?.hasVoted) {
        throw new AppError('Voter has already cast their vote in this election.', 409);
      }

      // 4. Verify polling station is active
      const station = await tx.pollingStation.findUnique({ where: { id: pollingStationId } });
      if (!station) throw new AppError('Polling station not found.', 404);
      if (station.machineStatus !== MachineStatus.ACTIVE) throw new AppError('Voting machine is not active.', 400);

      // 5. Verify candidate belongs to same constituency AND this election
      const candidate = await tx.candidate.findUnique({
        where: { id: candidateId },
        include: { party: true },
      });
      if (!candidate || candidate.constituencyId !== voter.constituencyId) throw new AppError('Invalid candidate.', 400);
      if (candidate.electionId !== election.id) throw new AppError('Candidate does not belong to the current active election.', 400);

      // 6. Generate vote hash & reference number
      const timestamp = new Date().toISOString();
      const nonce = Math.random().toString(36).substring(2, 15);
      const voteHash = generateVoteHash({ voterId, candidateId, pollingStationId, timestamp, nonce });
      const referenceNumber = generateReferenceNumber();

      // 7. Create vote (now includes electionId)
      const vote = await tx.vote.create({
        data: { voterId, electionId: election.id, candidateId, pollingStationId, voteHash, referenceNumber },
      });

      // 8. Create VVPAT record
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

      // 9. Upsert per-election voter status (marks voter as voted for THIS election only)
      await tx.electionVoterStatus.upsert({
        where: { voterId_electionId: { voterId, electionId: election.id } },
        create: { voterId, electionId: election.id, hasVoted: true, votedAt: new Date() },
        update: { hasVoted: true, votedAt: new Date() },
      });

      // 10. Audit log
      await tx.auditLog.create({
        data: {
          action: 'VOTE_CAST',
          module: 'Voting',
          description: `Vote cast at station ${pollingStationId} for election "${election.name}" - Ref: ${referenceNumber}`,
          electionId: election.id,
          metadata: { referenceNumber, voteHash },
        },
      });

      return { vote, vvpat, candidate, election };
    });
  }

  async getVvpat(referenceNumber: string, pollingStationId?: number) {
    const cleanRef = referenceNumber.trim();
    const stationFilter = pollingStationId ? { vote: { pollingStationId } } : {};

    // 1. Search directly by Digital VVPAT reference number
    const directVvpat = await prisma.digitalVVPAT.findFirst({
      where: { referenceNumber: cleanRef, ...stationFilter },
      include: { candidate: { include: { party: true } } },
    });
    if (directVvpat) return directVvpat;

    // 2. Search by Vote reference number
    const voteByRef = await prisma.vote.findFirst({
      where: {
        referenceNumber: cleanRef,
        ...(pollingStationId ? { pollingStationId } : {}),
      },
      include: {
        vvpat: {
          include: { candidate: { include: { party: true } } },
        },
      },
    });
    if (voteByRef?.vvpat) return voteByRef.vvpat;

    // 3. Search by Voter ID card number (EPIC, e.g. DL/01/001/0001)
    //    When searching by voter ID, only return votes for the ACTIVE election.
    //    This prevents showing old election records when a voter tries to verify
    //    for a new election.
    const voter = await prisma.voter.findFirst({
      where: {
        voterId: cleanRef,
        deletedAt: null,
        ...(pollingStationId ? { pollingStationId } : {}),
      },
      include: {
        votes: {
          where: {
            election: { status: ElectionStatus.ACTIVE },
          },
          include: {
            vvpat: {
              include: { candidate: { include: { party: true } } },
            },
          },
          orderBy: { castAt: 'desc' },
          take: 1,
        },
        electionStatuses: {
          where: {
            election: { status: ElectionStatus.ACTIVE },
          },
          take: 1,
        },
      },
    });

    if (voter) {
      const latestVote = voter.votes[0];
      if (latestVote?.vvpat) {
        return latestVote.vvpat;
      }
      // Check if there is an active election at all for this voter's constituency
      const hasActiveElection = voter.electionStatuses.length > 0 || voter.votes.length === 0;
      if (hasActiveElection) {
        throw new AppError(
          `Voter "${voter.fullName}" (${voter.voterId}) has not yet cast a vote in the current election. Please cast your ballot at the voting machine to generate a digital VVPAT slip.`,
          404,
        );
      }
      throw new AppError(
        `Voter "${voter.fullName}" (${voter.voterId}) has not cast a vote in any active election.`,
        404,
      );
    }

    return null;
  }


  async getResults(electionId: number) {
    const electionLinks = await prisma.electionConstituency.findMany({
      where: { electionId },
      include: {
        constituency: {
          include: {
            candidates: {
              where: { electionId, deletedAt: null },
              include: {
                party: true,
                _count: { select: { votes: true } },
              },
              orderBy: { votes: { _count: 'desc' } },
            },
          },
        },
      },
    });
    return electionLinks.map((link) => link.constituency);
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

    // Turnout is only meaningful for the active election's voters
    let turnoutPercent = '0.00';
    if (activeElection) {
      // Get voter IDs in constituencies for the active election
      const activeElectionLinks = await prisma.electionConstituency.findMany({
        where: { electionId: activeElection.id },
        select: { constituencyId: true },
      });
      const activeConstituencyIds = activeElectionLinks.map((l) => l.constituencyId);

      const [activeVoters, activeVotes] = await Promise.all([
        prisma.voter.count({
          where: { deletedAt: null, constituencyId: { in: activeConstituencyIds } },
        }),
        prisma.vote.count({
          where: { electionId: activeElection.id },
        }),
      ]);
      turnoutPercent = activeVoters > 0
        ? ((activeVotes / activeVoters) * 100).toFixed(2)
        : '0.00';
    }

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
