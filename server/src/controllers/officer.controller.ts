import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class OfficerController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await userRepository.findAllOfficers()); } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officer = await userRepository.createOfficer(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Officer',
        description: `Registered officer: ${req.body.fullName} (${req.body.email})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, officer, 'Election officer registered', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officer = await userRepository.updateOfficer(Number(req.params.id), req.body);
      sendSuccess(res, officer, 'Officer updated');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userRepository.deleteOfficer(Number(req.params.id));
      sendSuccess(res, null, 'Officer deleted');
    } catch (err) { next(err); }
  }
}

export const officerController = new OfficerController();
