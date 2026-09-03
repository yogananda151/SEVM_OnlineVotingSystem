"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionConstituencyRepository = exports.ElectionConstituencyRepository = void 0;
const database_1 = require("../config/database");
class ElectionConstituencyRepository {
    async findByElection(electionId) {
        return database_1.prisma.electionConstituency.findMany({
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
    async setConstituencies(electionId, constituencyIds) {
        // Delete removed ones, add new ones
        await database_1.prisma.electionConstituency.deleteMany({ where: { electionId } });
        if (constituencyIds.length === 0)
            return [];
        await database_1.prisma.electionConstituency.createMany({
            data: constituencyIds.map((constituencyId) => ({ electionId, constituencyId })),
            skipDuplicates: true,
        });
        return this.findByElection(electionId);
    }
    async addConstituency(electionId, constituencyId) {
        return database_1.prisma.electionConstituency.upsert({
            where: { electionId_constituencyId: { electionId, constituencyId } },
            create: { electionId, constituencyId },
            update: {},
        });
    }
    async removeConstituency(electionId, constituencyId) {
        return database_1.prisma.electionConstituency.deleteMany({
            where: { electionId, constituencyId },
        });
    }
    async getConstituencyIds(electionId) {
        const links = await database_1.prisma.electionConstituency.findMany({
            where: { electionId },
            select: { constituencyId: true },
        });
        return links.map((l) => l.constituencyId);
    }
}
exports.ElectionConstituencyRepository = ElectionConstituencyRepository;
exports.electionConstituencyRepository = new ElectionConstituencyRepository();
//# sourceMappingURL=election-constituency.repository.js.map