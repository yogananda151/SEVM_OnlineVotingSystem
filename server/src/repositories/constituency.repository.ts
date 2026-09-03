import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export class ConstituencyRepository {
  async findAll(regionId?: number) {
    return prisma.constituency.findMany({
      where: { deletedAt: null, ...(regionId && { regionId }) },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { pollingStations: true, voters: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findActive(regionId?: number) {
    return prisma.constituency.findMany({
      where: { deletedAt: null, isActive: true, ...(regionId && { regionId }) },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { pollingStations: true, voters: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: number) {
    return prisma.constituency.findUnique({
      where: { id },
      include: {
        region: true,
        pollingStations: {
          where: { deletedAt: null },
          include: {
            officers: { where: { deletedAt: null }, include: { user: true } },
            _count: { select: { voters: true } },
          },
        },
        candidates: { include: { party: true } },
        _count: { select: { voters: true } },
      },
    });
  }

  async create(data: {
    regionId: number;
    name: string;
    code: string;
    description?: string;
  }) {
    // Validate region exists and is active
    const region = await prisma.region.findUnique({ where: { id: data.regionId } });
    if (!region) throw new Error('Selected region does not exist. Please choose a valid region.');
    if (!region.isActive) throw new Error('The selected region is inactive. Please choose an active region.');

    // Pre-check: code must be unique among active (non-deleted) constituencies
    const existingCode = await prisma.constituency.findFirst({
      where: { code: data.code, deletedAt: null },
    });
    if (existingCode) {
      throw new AppError(
        `A constituency with code "${data.code}" already exists. Please use a different code.`,
        409,
      );
    }

    return prisma.constituency.create({ data, include: { region: true } });
  }

  async update(
    id: number,
    data: Partial<{ name: string; code: string; description: string; regionId: number; isActive: boolean }>,
  ) {
    if (data.regionId) {
      const region = await prisma.region.findUnique({ where: { id: data.regionId } });
      if (!region) throw new Error('Selected region does not exist.');
    }
    return prisma.constituency.update({ where: { id }, data });
  }

  async delete(id: number) {
    const con = await prisma.constituency.findUnique({ where: { id } });
    if (!con) throw new Error('Constituency not found');
    const stationCount = await prisma.pollingStation.count({ where: { constituencyId: id, deletedAt: null } });
    const voterCount = await prisma.voter.count({ where: { constituencyId: id, deletedAt: null } });
    if (stationCount > 0 || voterCount > 0) {
      throw new Error(
        `Cannot delete constituency. It has ${stationCount} polling station(s) and ${voterCount} voter(s). Remove them first.`,
      );
    }
    const now = new Date();
    const timestamp = Date.now();
    return prisma.constituency.update({
      where: { id },
      data: {
        code: `${con.code}_del_${timestamp}`,
        deletedAt: now,
        isActive: false,
      },
    });
  }
}

export const constituencyRepository = new ConstituencyRepository();
