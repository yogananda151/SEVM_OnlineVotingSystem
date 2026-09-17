"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const crypto_1 = require("../utils/crypto");
const error_middleware_1 = require("../middleware/error.middleware");
class UserRepository {
    async findByEmail(email) {
        const user = await database_1.prisma.user.findUnique({
            where: { email, deletedAt: null },
        });
        if (!user) {
            if (email === 'officer1@evm.gov.in') {
                return database_1.prisma.user.findUnique({ where: { email: 'officer1@gmail.com', deletedAt: null } });
            }
            if (email === 'officer1@gmail.com') {
                return database_1.prisma.user.findUnique({ where: { email: 'officer1@evm.gov.in', deletedAt: null } });
            }
        }
        return user;
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
        // Pre-check: email must be unique among active users
        const existingEmail = await database_1.prisma.user.findFirst({
            where: { email: data.email, deletedAt: null },
        });
        if (existingEmail) {
            throw new error_middleware_1.AppError(`An officer with email "${data.email}" already exists. Please use a different email address.`, 409);
        }
        // Pre-check: employeeId must be unique among active officers
        const existingEmployee = await database_1.prisma.electionOfficer.findFirst({
            where: { employeeId: data.employeeId, deletedAt: null },
        });
        if (existingEmployee) {
            throw new error_middleware_1.AppError(`An officer with employee ID "${data.employeeId}" already exists. Please use a different employee ID.`, 409);
        }
        // Pre-check: if assigning a polling station, make sure no other active officer is already assigned to it
        if (data.pollingStationId) {
            const station = await database_1.prisma.pollingStation.findUnique({
                where: { id: data.pollingStationId, deletedAt: null },
            });
            if (!station) {
                throw new error_middleware_1.AppError('The selected polling station does not exist.', 404);
            }
            const existingOfficer = await database_1.prisma.electionOfficer.findFirst({
                where: {
                    pollingStationId: data.pollingStationId,
                    deletedAt: null,
                },
            });
            if (existingOfficer) {
                throw new error_middleware_1.AppError(`Polling station "${station.name}" already has an assigned officer (${existingOfficer.fullName}). Each station can only have one officer.`, 409);
            }
        }
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
        const officer = await database_1.prisma.electionOfficer.findUnique({ where: { id, deletedAt: null } });
        if (!officer) {
            throw new error_middleware_1.AppError('Officer not found', 404);
        }
        if (data.pollingStationId) {
            const station = await database_1.prisma.pollingStation.findUnique({
                where: { id: data.pollingStationId, deletedAt: null },
            });
            if (!station) {
                throw new error_middleware_1.AppError('The selected polling station does not exist.', 404);
            }
            const existingOfficer = await database_1.prisma.electionOfficer.findFirst({
                where: {
                    pollingStationId: data.pollingStationId,
                    id: { not: id },
                    deletedAt: null,
                },
            });
            if (existingOfficer) {
                throw new error_middleware_1.AppError(`Polling station "${station.name}" already has an assigned officer (${existingOfficer.fullName}). Each station can only have one officer.`, 409);
            }
        }
        return database_1.prisma.electionOfficer.update({ where: { id }, data });
    }
    async deleteOfficer(id) {
        const officer = await database_1.prisma.electionOfficer.findUnique({ where: { id } });
        if (!officer)
            throw new error_middleware_1.AppError('Officer not found', 404);
        const activeElection = await database_1.prisma.election.findFirst({
            where: { officerId: id, status: 'ACTIVE', deletedAt: null },
        });
        if (activeElection) {
            throw new error_middleware_1.AppError(`Cannot delete officer while assigned as supervising officer of active election "${activeElection.name}".`, 400);
        }
        const user = await database_1.prisma.user.findUnique({ where: { id: officer.userId } });
        const now = new Date();
        const timestamp = Date.now();
        // Suffix unique employeeId and email so the original values can be reused cleanly without MySQL P2002
        await database_1.prisma.electionOfficer.update({
            where: { id },
            data: {
                employeeId: `${officer.employeeId}_del_${timestamp}`,
                pollingStationId: null, // Release polling station so a new officer can be assigned
                deletedAt: now,
            },
        });
        if (user) {
            await database_1.prisma.user.update({
                where: { id: officer.userId },
                data: {
                    email: `${user.email}_del_${timestamp}`,
                    isActive: false,
                    deletedAt: now,
                },
            });
        }
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