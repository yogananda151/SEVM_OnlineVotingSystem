"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partyRepository = exports.PartyRepository = void 0;
const database_1 = require("../config/database");
class PartyRepository {
    async findAll() {
        return database_1.prisma.politicalParty.findMany({
            where: { deletedAt: null },
            include: { _count: { select: { candidates: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async findById(id) {
        return database_1.prisma.politicalParty.findUnique({
            where: { id },
            include: { candidates: { where: { deletedAt: null }, include: { constituency: true } } },
        });
    }
    async create(data) {
        return database_1.prisma.politicalParty.create({ data });
    }
    async update(id, data) {
        return database_1.prisma.politicalParty.update({ where: { id }, data });
    }
    async delete(id) {
        return database_1.prisma.politicalParty.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    }
}
exports.PartyRepository = PartyRepository;
exports.partyRepository = new PartyRepository();
//# sourceMappingURL=party.repository.js.map