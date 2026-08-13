"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRepository = exports.CandidateRepository = void 0;
const database_1 = require("../config/database");
class CandidateRepository {
    async findAll(constituencyId) {
        return database_1.prisma.candidate.findMany({
            where: { deletedAt: null, ...(constituencyId && { constituencyId }) },
            include: {
                party: true,
                constituency: { select: { id: true, name: true, code: true } },
                _count: { select: { votes: true } },
            },
            orderBy: { serialNumber: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.candidate.findUnique({
            where: { id },
            include: { party: true, constituency: true, _count: { select: { votes: true } } },
        });
    }
    async create(data) {
        return database_1.prisma.candidate.create({ data, include: { party: true } });
    }
    async update(id, data) {
        return database_1.prisma.candidate.update({ where: { id }, data, include: { party: true } });
    }
    async delete(id) {
        return database_1.prisma.candidate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    }
}
exports.CandidateRepository = CandidateRepository;
exports.candidateRepository = new CandidateRepository();
//# sourceMappingURL=candidate.repository.js.map