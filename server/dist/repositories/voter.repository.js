"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voterRepository = exports.VoterRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class VoterRepository {
    async findAll(filters) {
        const { pollingStationId, constituencyId, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null };
        if (pollingStationId)
            where.pollingStationId = pollingStationId;
        if (constituencyId)
            where.constituencyId = constituencyId;
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
                    electionStatuses: { select: { electionId: true, hasVoted: true, votedAt: true } },
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
                votes: { include: { candidate: { include: { party: true } } } },
                electionStatuses: true,
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
    async delete(id) {
        const voter = await database_1.prisma.voter.findUnique({
            where: { id },
            include: { votes: { take: 1 } },
        });
        if (!voter)
            throw new error_middleware_1.AppError('Voter not found', 404);
        if (voter.votes && voter.votes.length > 0) {
            throw new error_middleware_1.AppError('Cannot delete a voter who has already cast a vote.', 400);
        }
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