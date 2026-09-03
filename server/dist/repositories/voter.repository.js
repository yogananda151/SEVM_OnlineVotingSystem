"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voterRepository = exports.VoterRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class VoterRepository {
    async findAll(filters) {
        const { pollingStationId, constituencyId, hasVoted, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (pollingStationId)
            where.pollingStationId = pollingStationId;
        if (constituencyId)
            where.constituencyId = constituencyId;
        if (hasVoted !== undefined)
            where.hasVoted = hasVoted;
        if (search) {
            where.OR = [
                { fullName: { contains: search } },
                { voterId: { contains: search } },
            ];
        }
        const [data, total] = await Promise.all([
            database_1.prisma.voter.findMany({
                where,
                include: {
                    pollingStation: { select: { id: true, name: true, code: true } },
                    constituency: { select: { id: true, name: true, code: true } },
                },
                skip,
                take: limit,
                orderBy: { serialNumber: 'asc' },
            }),
            database_1.prisma.voter.count({ where }),
        ]);
        return { data, total };
    }
    async findById(id) {
        return database_1.prisma.voter.findUnique({
            where: { id },
            include: {
                pollingStation: true,
                constituency: true,
                vote: { include: { candidate: { include: { party: true } } } },
            },
        });
    }
    async findByVoterId(voterId) {
        return database_1.prisma.voter.findFirst({
            where: { voterId, deletedAt: null },
            include: { pollingStation: true, constituency: { include: { region: true } } },
        });
    }
    async findByAadhaarHash(aadhaarHash) {
        return database_1.prisma.voter.findFirst({
            where: { aadhaarHash, deletedAt: null },
            include: { pollingStation: true, constituency: { include: { region: true } } },
        });
    }
    async create(data) {
        // Pre-check: voterId must be unique among active (non-deleted) voters
        const existingVoter = await database_1.prisma.voter.findFirst({
            where: { voterId: data.voterId, deletedAt: null },
        });
        if (existingVoter) {
            throw new error_middleware_1.AppError(`Voter ID "${data.voterId}" is already registered. Please use a different Voter ID.`, 409);
        }
        return database_1.prisma.voter.create({ data });
    }
    async update(id, data) {
        return database_1.prisma.voter.update({ where: { id }, data });
    }
    async markVoted(id) {
        await database_1.prisma.voter.update({ where: { id }, data: { hasVoted: true, votedAt: new Date() } });
    }
    async delete(id) {
        const voter = await database_1.prisma.voter.findUnique({ where: { id } });
        if (!voter)
            throw new Error('Voter not found');
        const now = new Date();
        const timestamp = Date.now();
        await database_1.prisma.voter.update({
            where: { id },
            data: {
                voterId: `${voter.voterId}_del_${timestamp}`,
                deletedAt: now,
                isActive: false,
            },
        });
    }
    async bulkCreate(voters) {
        return database_1.prisma.voter.createMany({ data: voters, skipDuplicates: true });
    }
}
exports.VoterRepository = VoterRepository;
exports.voterRepository = new VoterRepository();
//# sourceMappingURL=voter.repository.js.map