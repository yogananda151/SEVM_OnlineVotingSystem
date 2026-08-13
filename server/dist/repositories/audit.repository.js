"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRepository = exports.AuditRepository = void 0;
const database_1 = require("../config/database");
class AuditRepository {
    async create(data) {
        return database_1.prisma.auditLog.create({
            data: {
                action: data.action,
                module: data.module,
                description: data.description,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                metadata: data.metadata,
                ...(data.userId ? { user: { connect: { id: data.userId } } } : {}),
                ...(data.electionId ? { election: { connect: { id: data.electionId } } } : {}),
            },
        });
    }
    async findAll(filters) {
        const { userId, electionId, action, module: mod, page = 1, limit = 50, startDate, endDate } = filters;
        const skip = (page - 1) * limit;
        const where = {};
        if (userId)
            where.userId = userId;
        if (electionId)
            where.electionId = electionId;
        if (action)
            where.action = action;
        if (mod)
            where.module = mod;
        if (startDate || endDate) {
            where.createdAt = {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            };
        }
        const [data, total] = await Promise.all([
            database_1.prisma.auditLog.findMany({
                where,
                include: { user: { select: { email: true, role: true } } },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.auditLog.count({ where }),
        ]);
        return { data, total };
    }
}
exports.AuditRepository = AuditRepository;
exports.auditRepository = new AuditRepository();
//# sourceMappingURL=audit.repository.js.map