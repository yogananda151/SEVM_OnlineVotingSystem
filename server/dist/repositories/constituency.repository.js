"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constituencyRepository = exports.ConstituencyRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class ConstituencyRepository {
    async findAll(regionId) {
        return database_1.prisma.constituency.findMany({
            where: { deletedAt: null, ...(regionId && { regionId }) },
            include: {
                region: { select: { id: true, name: true, code: true } },
                _count: { select: { pollingStations: true, voters: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findActive(regionId) {
        return database_1.prisma.constituency.findMany({
            where: { deletedAt: null, isActive: true, ...(regionId && { regionId }) },
            include: {
                region: { select: { id: true, name: true, code: true } },
                _count: { select: { pollingStations: true, voters: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.constituency.findUnique({
            where: { id },
            include: {
                region: true,
                pollingStations: {
                    where: { deletedAt: null },
                    include: {
                        officers: { where: { deletedAt: null }, include: { user: true } },
                        _count: { select: { voters: true } },
                    },
                },
                candidates: { include: { party: true } },
                _count: { select: { voters: true } },
            },
        });
    }
    async create(data) {
        // Validate region exists and is active
        const region = await database_1.prisma.region.findUnique({ where: { id: data.regionId } });
        if (!region)
            throw new Error('Selected region does not exist. Please choose a valid region.');
        if (!region.isActive)
            throw new Error('The selected region is inactive. Please choose an active region.');
        // Pre-check: code must be unique among active (non-deleted) constituencies
        const existingCode = await database_1.prisma.constituency.findFirst({
            where: { code: data.code, deletedAt: null },
        });
        if (existingCode) {
            throw new error_middleware_1.AppError(`A constituency with code "${data.code}" already exists. Please use a different code.`, 409);
        }
        return database_1.prisma.constituency.create({ data, include: { region: true } });
    }
    async update(id, data) {
        if (data.regionId) {
            const region = await database_1.prisma.region.findUnique({ where: { id: data.regionId } });
            if (!region)
                throw new Error('Selected region does not exist.');
        }
        return database_1.prisma.constituency.update({ where: { id }, data });
    }
    async delete(id) {
        const con = await database_1.prisma.constituency.findUnique({ where: { id } });
        if (!con)
            throw new Error('Constituency not found');
        const stationCount = await database_1.prisma.pollingStation.count({ where: { constituencyId: id, deletedAt: null } });
        const voterCount = await database_1.prisma.voter.count({ where: { constituencyId: id, deletedAt: null } });
        if (stationCount > 0 || voterCount > 0) {
            throw new Error(`Cannot delete constituency. It has ${stationCount} polling station(s) and ${voterCount} voter(s). Remove them first.`);
        }
        const now = new Date();
        const timestamp = Date.now();
        return database_1.prisma.constituency.update({
            where: { id },
            data: {
                code: `${con.code}_del_${timestamp}`,
                deletedAt: now,
                isActive: false,
            },
        });
    }
}
exports.ConstituencyRepository = ConstituencyRepository;
exports.constituencyRepository = new ConstituencyRepository();
//# sourceMappingURL=constituency.repository.js.map