import { Request, Response, NextFunction } from 'express';
import { regionRepository } from '../repositories/region.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class RegionController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, await regionRepository.findAll());
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const region = await regionRepository.findById(Number(req.params.id));
      if (!region) { res.status(404).json({ success: false, message: 'Region not found' }); return; }
      sendSuccess(res, region);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const region = await regionRepository.create(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Region',
        description: `Created region: ${region.name} (${region.code})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, region, 'Region created successfully', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const region = await regionRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, region, 'Region updated');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await regionRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Region deactivated');
    } catch (err) { next(err); }
  }
}

export const regionController = new RegionController();
