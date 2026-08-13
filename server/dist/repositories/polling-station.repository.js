"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollingStationRepository = exports.PollingStationRepository = void 0;
const database_1 = require("../config/database");
class PollingStationRepository {
    async findAll(constituencyId) {
        return database_1.prisma.pollingStation.findMany({
            where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
            include: {
                constituency: { select: { id: true, name: true, code: true, election: { select: { id: true, name: true, status: true } } } },
                officers: { where: { deletedAt: null }, include: { user: { select: { email: true } } } },
                _count: { select: { voters: true, votes: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.pollingStation.findUnique({
            where: { id },
            include: {
                constituency: { include: { election: true } },
                officers: { include: { user: true } },
                _count: { select: { voters: true, votes: true } },
            },
        });
    }
    async create(data) {
        return database_1.prisma.pollingStation.create({ data, include: { constituency: true } });
    }
    async update(id, data) {
        return database_1.prisma.pollingStation.update({ where: { id }, data });
    }
    async updateMachineStatus(id, machineStatus, isPollingActive) {
        return database_1.prisma.pollingStation.update({
            where: { id },
            data: { machineStatus, ...(isPollingActive !== undefined && { isPollingActive }) },
        });
    }
    async delete(id) {
        return database_1.prisma.pollingStation.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async getTurnout(id) {
        const [totalVoters, votedCount] = await Promise.all([
            database_1.prisma.voter.count({ where: { pollingStationId: id, deletedAt: null } }),
            database_1.prisma.voter.count({ where: { pollingStationId: id, hasVoted: true } }),
        ]);
        return {
            totalVoters,
            votedCount,
            remaining: totalVoters - votedCount,
            turnoutPercent: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(2) : '0.00',
        };
    }
}
exports.PollingStationRepository = PollingStationRepository;
exports.pollingStationRepository = new PollingStationRepository();
//# sourceMappingURL=polling-station.repository.js.map