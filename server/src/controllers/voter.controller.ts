import { Request, Response, NextFunction } from 'express';
import { voterRepository } from '../repositories/voter.repository';
import { hashAadhaar } from '../utils/crypto';
import { sendSuccess, sendPaginated } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class VoterController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { pollingStationId, constituencyId, hasVoted, search } = req.query;

      const { data, total } = await voterRepository.findAll({
        pollingStationId: pollingStationId ? Number(pollingStationId) : undefined,
        constituencyId: constituencyId ? Number(constituencyId) : undefined,
        hasVoted: hasVoted !== undefined ? hasVoted === 'true' : undefined,
        search: search as string | undefined,
        page,
        limit,
      });

      sendPaginated(res, data, total, page, limit);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voter = await voterRepository.findById(Number(req.params.id));
      if (!voter) { res.status(404).json({ success: false, message: 'Voter not found' }); return; }
      sendSuccess(res, voter);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { aadhaarNumber, dateOfBirth, ...rest } = req.body;
      const voter = await voterRepository.create({
        ...rest,
        aadhaarHash: aadhaarNumber ? hashAadhaar(aadhaarNumber) : undefined,
        dateOfBirth: new Date(dateOfBirth),
      });
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Voter',
        description: `Registered voter: ${voter.fullName} (${voter.voterId})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, voter, 'Voter registered successfully', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voter = await voterRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, voter, 'Voter updated');
    } catch (err) { next(err); }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const photoUrl = `/uploads/voters/${req.file.filename}`;
      const voter = await voterRepository.update(Number(req.params.id), { photoUrl });
      sendSuccess(res, voter, 'Photo uploaded successfully');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await voterRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Voter deleted');
    } catch (err) { next(err); }
  }
}

export const voterController = new VoterController();
