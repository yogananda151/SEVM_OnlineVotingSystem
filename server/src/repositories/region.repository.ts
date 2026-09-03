import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class RegionRepository {
  async findAll() {
    return prisma.region.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { constituencies: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.region.findUnique({
      where: { id },
      include: {
        constituencies: {
          where: { deletedAt: null },
          include: {
            _count: { select: { pollingStations: true, voters: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { constituencies: true } },
      },
    });
  }

  async findActive() {
    return prisma.region.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: { name: string; code: string; description?: string }) {
    // Pre-check: name and code must be unique among active (non-deleted) regions
    const existingName = await prisma.region.findFirst({
      where: { name: data.name, deletedAt: null },
    });
    if (existingName) {
      throw new AppError(
        `A region named "${data.name}" already exists. Please use a different name.`,
        409,
      );
    }

    const existingCode = await prisma.region.findFirst({
      where: { code: data.code, deletedAt: null },
    });
    if (existingCode) {
      throw new AppError(
        `A region with code "${data.code}" already exists. Please use a different code.`,
        409,
      );
    }

    return prisma.region.create({ data });
  }

  async update(
    id: number,
    data: Partial<{ name: string; code: string; description: string; isActive: boolean }>,
  ) {
    return prisma.region.update({ where: { id }, data });
  }

  async delete(id: number) {
    const region = await prisma.region.findUnique({ where: { id } });
    if (!region) throw new Error('Region not found');
    // Check if any constituencies are attached
    const count = await prisma.constituency.count({
      where: { regionId: id, deletedAt: null },
    });
    if (count > 0) {
      throw new Error(
        `Cannot delete region. It has ${count} active constituent${count !== 1 ? 'cies' : 'cy'} attached. Remove them first.`,
      );
    }
    const now = new Date();
    const timestamp = Date.now();
    return prisma.region.update({
      where: { id },
      data: {
        name: `${region.name}_del_${timestamp}`,
        code: `${region.code}_del_${timestamp}`,
        deletedAt: now,
        isActive: false,
      },
    });
  }
}

export const regionRepository = new RegionRepository();
