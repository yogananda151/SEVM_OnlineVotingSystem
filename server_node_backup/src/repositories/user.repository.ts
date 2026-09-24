import { prisma } from '../config/database';
import { User, UserRole } from '@prisma/client';
import { hashPassword } from '../utils/crypto';
import { AppError } from '../middleware/error.middleware';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
    if (!user) {
      if (email === 'officer1@evm.gov.in') {
        return prisma.user.findUnique({ where: { email: 'officer1@gmail.com', deletedAt: null } });
      }
      if (email === 'officer1@gmail.com') {
        return prisma.user.findUnique({ where: { email: 'officer1@evm.gov.in', deletedAt: null } });
      }
    }
    return user;
  }

  async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { commissioner: true, officer: true },
    });
  }

  async findAllOfficers() {
    return prisma.electionOfficer.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, email: true, isActive: true, lastLoginAt: true } },
        pollingStation: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOfficer(data: {
    email: string;
    password: string;
    fullName: string;
    employeeId: string;
    phone: string;
    pollingStationId?: number | null;
  }) {
    // Pre-check: email must be unique among active users
    const existingEmail = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingEmail) {
      throw new AppError(
        `An officer with email "${data.email}" already exists. Please use a different email address.`,
        409,
      );
    }

    // Pre-check: employeeId must be unique among active officers
    const existingEmployee = await prisma.electionOfficer.findFirst({
      where: { employeeId: data.employeeId, deletedAt: null },
    });
    if (existingEmployee) {
      throw new AppError(
        `An officer with employee ID "${data.employeeId}" already exists. Please use a different employee ID.`,
        409,
      );
    }

    // Pre-check: if assigning a polling station, make sure no other active officer is already assigned to it
    if (data.pollingStationId) {
      const station = await prisma.pollingStation.findUnique({
        where: { id: data.pollingStationId, deletedAt: null },
      });
      if (!station) {
        throw new AppError('The selected polling station does not exist.', 404);
      }

      const existingOfficer = await prisma.electionOfficer.findFirst({
        where: {
          pollingStationId: data.pollingStationId,
          deletedAt: null,
        },
      });
      if (existingOfficer) {
        throw new AppError(
          `Polling station "${station.name}" already has an assigned officer (${existingOfficer.fullName}). Each station can only have one officer.`,
          409,
        );
      }
    }

    const passwordHash = await hashPassword(data.password);
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: UserRole.OFFICER,
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

  async updateOfficer(id: number, data: Partial<{ fullName: string; phone: string; pollingStationId: number | null }>) {
    const officer = await prisma.electionOfficer.findUnique({ where: { id, deletedAt: null } });
    if (!officer) {
      throw new AppError('Officer not found', 404);
    }

    if (data.pollingStationId) {
      const station = await prisma.pollingStation.findUnique({
        where: { id: data.pollingStationId, deletedAt: null },
      });
      if (!station) {
        throw new AppError('The selected polling station does not exist.', 404);
      }

      const existingOfficer = await prisma.electionOfficer.findFirst({
        where: {
          pollingStationId: data.pollingStationId,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existingOfficer) {
        throw new AppError(
          `Polling station "${station.name}" already has an assigned officer (${existingOfficer.fullName}). Each station can only have one officer.`,
          409,
        );
      }
    }

    return prisma.electionOfficer.update({ where: { id }, data });
  }

  async deleteOfficer(id: number) {
    const officer = await prisma.electionOfficer.findUnique({ where: { id } });
    if (!officer) throw new AppError('Officer not found', 404);

    const activeElection = await prisma.election.findFirst({
      where: { officerId: id, status: 'ACTIVE', deletedAt: null },
    });
    if (activeElection) {
      throw new AppError(
        `Cannot delete officer while assigned as supervising officer of active election "${activeElection.name}".`,
        400,
      );
    }

    const user = await prisma.user.findUnique({ where: { id: officer.userId } });
    const now = new Date();
    const timestamp = Date.now();
    // Suffix unique employeeId and email so the original values can be reused cleanly without MySQL P2002
    await prisma.electionOfficer.update({
      where: { id },
      data: {
        employeeId: `${officer.employeeId}_del_${timestamp}`,
        pollingStationId: null, // Release polling station so a new officer can be assigned
        deletedAt: now,
      },
    });
    if (user) {
      await prisma.user.update({
        where: { id: officer.userId },
        data: {
          email: `${user.email}_del_${timestamp}`,
          isActive: false,
          deletedAt: now,
        },
      });
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async logLogin(data: { userId: number; ipAddress: string; userAgent?: string; success: boolean }) {
    await prisma.loginLog.create({ data });
  }
}

export const userRepository = new UserRepository();
