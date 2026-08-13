"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constituencyRepository = exports.ConstituencyRepository = void 0;
const database_1 = require("../config/database");
class ConstituencyRepository {
    async findAll(electionId) {
        return database_1.prisma.constituency.findMany({
            where: { deletedAt: null, ...(electionId && { electionId }) },
            include: {
                election: { select: { id: true, name: true, status: true } },
                _count: { select: { pollingStations: true, candidates: true, voters: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.constituency.findUnique({
            where: { id },
            include: {
                election: true,
                pollingStations: { include: { officers: { include: { user: true } } } },
                candidates: { include: { party: true } },
                _count: { select: { voters: true } },
            },
        });
    }
    async create(data) {
        return database_1.prisma.constituency.create({ data, include: { election: true } });
    }
    async update(id, data) {
        return database_1.prisma.constituency.update({ where: { id }, data });
    }
    async delete(id) {
        return database_1.prisma.constituency.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}
exports.ConstituencyRepository = ConstituencyRepository;
exports.constituencyRepository = new ConstituencyRepository();
//# sourceMappingURL=constituency.repository.js.map