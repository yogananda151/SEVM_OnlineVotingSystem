"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const crypto_1 = require("../utils/crypto");
class UserRepository {
    async findByEmail(email) {
        return database_1.prisma.user.findUnique({
            where: { email, deletedAt: null },
        });
    }
    async findById(id) {
        return database_1.prisma.user.findUnique({
            where: { id },
            include: { commissioner: true, officer: true },
        });
    }
    async findAllOfficers() {
        return database_1.prisma.electionOfficer.findMany({
            where: { deletedAt: null },
            include: {
                user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
                pollingStation: { select: { id: true, name: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createOfficer(data) {
        const passwordHash = await (0, crypto_1.hashPassword)(data.password);
        return database_1.prisma.user.create({
            data: {
                email: data.email,
                passwordHash,
                role: client_1.UserRole.OFFICER,
                officer: {
                    create: {
                        fullName: data.fullName,
                        employeeId: data.employeeId,
                        phone: data.phone,
                        pollingStationId: data.pollingStationId || null,
                    },
                },
            },
            include: { officer: true },
        });
    }
    async updateOfficer(id, data) {
        return database_1.prisma.electionOfficer.update({ where: { id }, data });
    }
    async deleteOfficer(id) {
        const officer = await database_1.prisma.electionOfficer.findUnique({ where: { id } });
        if (!officer)
            throw new Error('Officer not found');
        await database_1.prisma.electionOfficer.update({ where: { id }, data: { deletedAt: new Date() } });
        await database_1.prisma.user.update({ where: { id: officer.userId }, data: { isActive: false } });
    }
    async updateLastLogin(userId) {
        await database_1.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    }
    async logLogin(data) {
        await database_1.prisma.loginLog.create({ data });
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
//# sourceMappingURL=user.repository.js.map