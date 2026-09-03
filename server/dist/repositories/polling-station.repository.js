"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollingStationRepository = exports.PollingStationRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class PollingStationRepository {
    async findAll(constituencyId) {
        return database_1.prisma.pollingStation.findMany({
            where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
            include: {
                constituency: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        region: { select: { id: true, name: true } },
                    },
                },
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
                constituency: { include: { region: true } },
                officers: { where: { deletedAt: null }, include: { user: true } },
                _count: { select: { voters: true, votes: true } },
            },
        });
    }
    async create(data) {
        // Validate constituency exists and is active
        const constituency = await database_1.prisma.constituency.findUnique({
            where: { id: data.constituencyId, deletedAt: null },
        });
        if (!constituency) {
            throw new Error('The selected constituency does not exist. Please select a valid constituency.');
        }
        // Pre-check: code must be unique among active (non-deleted) polling stations
        const existingCode = await database_1.prisma.pollingStation.findFirst({
            where: { code: data.code, deletedAt: null },
        });
        if (existingCode) {
            throw new error_middleware_1.AppError(`A polling station with code "${data.code}" already exists. Please use a different code.`, 409);
        }
        return database_1.prisma.pollingStation.create({ data, include: { constituency: { include: { region: true } } } });
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
        const station = await database_1.prisma.pollingStation.findUnique({ where: { id } });
        if (!station)
            throw new Error('Polling station not found');
        const voterCount = await database_1.prisma.voter.count({ where: { pollingStationId: id, deletedAt: null } });
        const voteCount = await database_1.prisma.vote.count({ where: { pollingStationId: id } });
        if (voteCount > 0) {
            throw new Error('Cannot delete polling station. Votes have already been cast here.');
        }
        if (voterCount > 0) {
            throw new Error(`Cannot delete polling station. It has ${voterCount} registered voter(s). Reassign or remove them first.`);
        }
        const now = new Date();
        const timestamp = Date.now();
        return database_1.prisma.pollingStation.update({
            where: { id },
            data: {
                code: `${station.code}_del_${timestamp}`,
                deletedAt: now,
                isActive: false,
            },
        });
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