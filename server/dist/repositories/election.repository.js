"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionRepository = exports.ElectionRepository = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
class ElectionRepository {
    async findAll() {
        return database_1.prisma.election.findMany({
            where: { deletedAt: null },
            include: {
                constituencies: {
                    select: { id: true, name: true, _count: { select: { voters: true, candidates: true } } },
                },
                _count: { select: { constituencies: true } },
            },
            orderBy: { scheduledDate: 'desc' },
        });
    }
    async findById(id) {
        return database_1.prisma.election.findUnique({
            where: { id, deletedAt: null },
            include: {
                constituencies: {
                    include: {
                        pollingStations: true,
                        candidates: { include: { party: true } },
                    },
                },
            },
        });
    }
    async findActive() {
        return database_1.prisma.election.findFirst({
            where: { status: client_1.ElectionStatus.ACTIVE, deletedAt: null },
            include: {
                constituencies: {
                    include: {
                        pollingStations: { include: { officers: { include: { user: true } } } },
                        candidates: { include: { party: true } },
                    },
                },
            },
        });
    }
    async create(data) {
        return database_1.prisma.election.create({ data });
    }
    async update(id, data) {
        return database_1.prisma.election.update({ where: { id }, data });
    }
    async delete(id) {
        return database_1.prisma.election.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async getStats(electionId) {
        const election = await database_1.prisma.election.findUnique({ where: { id: electionId } });
        if (!election)
            return null;
        const constituencies = await database_1.prisma.constituency.findMany({
            where: { electionId, deletedAt: null },
            select: { id: true },
        });
        const constituencyIds = constituencies.map((c) => c.id);
        const [totalVoters, votedCount, totalCandidates, totalStations] = await Promise.all([
            database_1.prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
            database_1.prisma.voter.count({ where: { constituencyId: { in: constituencyIds }, hasVoted: true } }),
            database_1.prisma.candidate.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
            database_1.prisma.pollingStation.count({ where: { constituencyId: { in: constituencyIds }, deletedAt: null } }),
        ]);
        return {
            election,
            totalVoters,
            votedCount,
            turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
            totalCandidates,
            totalStations,
            totalConstituencies: constituencies.length,
        };
    }
}
exports.ElectionRepository = ElectionRepository;
exports.electionRepository = new ElectionRepository();
//# sourceMappingURL=election.repository.js.map