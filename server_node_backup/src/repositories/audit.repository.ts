import { prisma } from '../config/database';
import { AuditAction } from '@prisma/client';

export class AuditRepository {
  async create(data: {
    userId?: number;
    electionId?: number;
    action: AuditAction;
    module: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.auditLog.create({
      data: {
        action: data.action,
        module: data.module,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata as object | undefined,
        ...(data.userId ? { user: { connect: { id: data.userId } } } : {}),
        ...(data.electionId ? { election: { connect: { id: data.electionId } } } : {}),
      },
    });
  }

  async findAll(filters: {
    userId?: number;
    electionId?: number;
    action?: AuditAction;
    module?: string;
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { userId, electionId, action, module: mod, page = 1, limit = 50, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (electionId) where.electionId = electionId;
    if (action) where.action = action;
    if (mod) where.module = mod;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      };
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, role: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }
}

export const auditRepository = new AuditRepository();
