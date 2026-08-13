"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voteRepository = exports.VoteRepository = void 0;
const database_1 = require("../config/database");
const crypto_1 = require("../utils/crypto");
const error_middleware_1 = require("../middleware/error.middleware");
const client_1 = require("@prisma/client");
class VoteRepository {
    async castVote(data) {
        const { voterId, candidateId, pollingStationId } = data;
        return database_1.prisma.$transaction(async (tx) => {
            // 1. Verify voter exists, hasn't voted, is in correct station
            const voter = await tx.voter.findUnique({
                where: { id: voterId },
                include: { constituency: { include: { election: true } } },
            });
            if (!voter)
                throw new error_middleware_1.AppError('Voter not found.', 404);
            if (voter.hasVoted)
                throw new error_middleware_1.AppError('Voter has already cast their vote.', 409);
            if (voter.pollingStationId !== pollingStationId)
                throw new error_middleware_1.AppError('Voter is not registered at this polling station.', 403);
            // 2. Verify election is active
            const election = voter.constituency.election;
            if (election.status !== client_1.ElectionStatus.ACTIVE)
                throw new error_middleware_1.AppError('Election is not currently active.', 400);
            // 3. Verify polling station is active
            const station = await tx.pollingStation.findUnique({ where: { id: pollingStationId } });
            if (!station)
                throw new error_middleware_1.AppError('Polling station not found.', 404);
            if (station.machineStatus !== client_1.MachineStatus.ACTIVE)
                throw new error_middleware_1.AppError('Voting machine is not active.', 400);
            // 4. Verify candidate belongs to same constituency
            const candidate = await tx.candidate.findUnique({
                where: { id: candidateId },
                include: { party: true },
            });
            if (!candidate || candidate.constituencyId !== voter.constituencyId)
                throw new error_middleware_1.AppError('Invalid candidate.', 400);
            // 5. Generate vote hash & reference number
            const timestamp = new Date().toISOString();
            const nonce = Math.random().toString(36).substring(2, 15);
            const voteHash = (0, crypto_1.generateVoteHash)({ voterId, candidateId, pollingStationId, timestamp, nonce });
            const referenceNumber = (0, crypto_1.generateReferenceNumber)();
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
    async getVvpat(referenceNumber) {
        return database_1.prisma.digitalVVPAT.findFirst({
            where: { referenceNumber },
            include: { candidate: { include: { party: true } } },
        });
    }
    async getResults(electionId) {
        const constituencies = await database_1.prisma.constituency.findMany({
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
        const [totalElections, activeElection, totalStations, totalVoters, totalCandidates, totalParties, totalVotes] = await Promise.all([
            database_1.prisma.election.count({ where: { deletedAt: null } }),
            database_1.prisma.election.findFirst({ where: { status: client_1.ElectionStatus.ACTIVE } }),
            database_1.prisma.pollingStation.count({ where: { deletedAt: null } }),
            database_1.prisma.voter.count({ where: { deletedAt: null } }),
            database_1.prisma.candidate.count({ where: { deletedAt: null } }),
            database_1.prisma.politicalParty.count({ where: { deletedAt: null } }),
            database_1.prisma.vote.count(),
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
exports.VoteRepository = VoteRepository;
exports.voteRepository = new VoteRepository();
//# sourceMappingURL=vote.repository.js.map