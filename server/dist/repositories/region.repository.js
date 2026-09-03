"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionRepository = exports.RegionRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class RegionRepository {
    async findAll() {
        return database_1.prisma.region.findMany({
            where: { deletedAt: null },
            include: {
                _count: { select: { constituencies: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.region.findUnique({
            where: { id },
            include: {
                constituencies: {
                    where: { deletedAt: null },
                    include: {
                        _count: { select: { pollingStations: true, voters: true } },
                    },
                    orderBy: { name: 'asc' },
                },
                _count: { select: { constituencies: true } },
            },
        });
    }
    async findActive() {
        return database_1.prisma.region.findMany({
            where: { deletedAt: null, isActive: true },
            orderBy: { name: 'asc' },
        });
    }
    async create(data) {
        // Pre-check: name and code must be unique among active (non-deleted) regions
        const existingName = await database_1.prisma.region.findFirst({
            where: { name: data.name, deletedAt: null },
        });
        if (existingName) {
            throw new error_middleware_1.AppError(`A region named "${data.name}" already exists. Please use a different name.`, 409);
        }
        const existingCode = await database_1.prisma.region.findFirst({
            where: { code: data.code, deletedAt: null },
        });
        if (existingCode) {
            throw new error_middleware_1.AppError(`A region with code "${data.code}" already exists. Please use a different code.`, 409);
        }
        return database_1.prisma.region.create({ data });
    }
    async update(id, data) {
        return database_1.prisma.region.update({ where: { id }, data });
    }
    async delete(id) {
        const region = await database_1.prisma.region.findUnique({ where: { id } });
        if (!region)
            throw new Error('Region not found');
        // Check if any constituencies are attached
        const count = await database_1.prisma.constituency.count({
            where: { regionId: id, deletedAt: null },
        });
        if (count > 0) {
            throw new Error(`Cannot delete region. It has ${count} active constituent${count !== 1 ? 'cies' : 'cy'} attached. Remove them first.`);
        }
        const now = new Date();
        const timestamp = Date.now();
        return database_1.prisma.region.update({
            where: { id },
            data: {
                name: `${region.name}_del_${timestamp}`,
                code: `${region.code}_del_${timestamp}`,
                deletedAt: now,
                isActive: false,
            },
        });
    }
}
exports.RegionRepository = RegionRepository;
exports.regionRepository = new RegionRepository();
//# sourceMappingURL=region.repository.js.map