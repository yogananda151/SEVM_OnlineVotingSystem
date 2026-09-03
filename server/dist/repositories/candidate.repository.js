"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRepository = exports.CandidateRepository = void 0;
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class CandidateRepository {
    async findAll(electionId, constituencyId) {
        return database_1.prisma.candidate.findMany({
            where: {
                deletedAt: null,
                ...(electionId && { electionId }),
                ...(constituencyId && { constituencyId }),
            },
            include: {
                constituency: { select: { id: true, name: true, code: true } },
                party: true,
                _count: { select: { votes: true } },
            },
            orderBy: [{ constituencyId: 'asc' }, { serialNumber: 'asc' }],
        });
    }
    async findById(id) {
        return database_1.prisma.candidate.findUnique({
            where: { id },
            include: { constituency: true, party: true, _count: { select: { votes: true } } },
        });
    }
    async create(data) {
        // Validate constituency belongs to the election
        const link = await database_1.prisma.electionConstituency.findUnique({
            where: {
                electionId_constituencyId: {
                    electionId: data.electionId,
                    constituencyId: data.constituencyId,
                },
            },
        });
        if (!link) {
            throw new Error('The selected constituency is not part of this election. Please select a constituency that has been added to this election.');
        }
        // Pre-check: serial number must be unique per election+constituency among active candidates
        const existingSerial = await database_1.prisma.candidate.findFirst({
            where: {
                electionId: data.electionId,
                constituencyId: data.constituencyId,
                serialNumber: data.serialNumber,
                deletedAt: null,
            },
        });
        if (existingSerial) {
            throw new error_middleware_1.AppError(`Serial number ${data.serialNumber} is already assigned to another active candidate in this constituency. Please use a different serial number.`, 409);
        }
        return database_1.prisma.candidate.create({ data, include: { constituency: true, party: true } });
    }
    async update(id, data) {
        return database_1.prisma.candidate.update({ where: { id }, data });
    }
    async delete(id) {
        const candidate = await database_1.prisma.candidate.findUnique({ where: { id } });
        if (!candidate)
            throw new Error('Candidate not found');
        const voteCount = await database_1.prisma.vote.count({ where: { candidateId: id } });
        if (voteCount > 0) {
            throw new Error('Cannot remove candidate. They have already received votes.');
        }
        return database_1.prisma.candidate.update({
            where: { id },
            data: {
                serialNumber: -candidate.id,
                deletedAt: new Date(),
                isActive: false,
            },
        });
    }
}
exports.CandidateRepository = CandidateRepository;
exports.candidateRepository = new CandidateRepository();
//# sourceMappingURL=candidate.repository.js.map