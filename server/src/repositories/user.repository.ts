import { prisma } from '../config/database';
import { User, UserRole } from '@prisma/client';
import { hashPassword } from '../utils/crypto';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email, deletedAt: null },
    });
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
    return prisma.electionOfficer.update({ where: { id }, data });
  }

  async deleteOfficer(id: number) {
    const officer = await prisma.electionOfficer.findUnique({ where: { id } });
    if (!officer) throw new Error('Officer not found');
    await prisma.electionOfficer.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.user.update({ where: { id: officer.userId }, data: { isActive: false } });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  async logLogin(data: { userId: number; ipAddress: string; userAgent?: string; success: boolean }) {
    await prisma.loginLog.create({ data });
  }
}

export const userRepository = new UserRepository();
