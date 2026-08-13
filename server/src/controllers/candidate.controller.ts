import { Request, Response, NextFunction } from 'express';
import { candidateRepository } from '../repositories/candidate.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class CandidateController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
      const candidates = await candidateRepository.findAll(constituencyId);
      sendSuccess(res, candidates);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidate = await candidateRepository.findById(Number(req.params.id));
      if (!candidate) { res.status(404).json({ success: false, message: 'Candidate not found' }); return; }
      sendSuccess(res, candidate);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidate = await candidateRepository.create(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Candidate',
        description: `Registered candidate: ${candidate.fullName}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, candidate, 'Candidate registered', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const candidate = await candidateRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, candidate, 'Candidate updated');
    } catch (err) { next(err); }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const photoUrl = `/uploads/candidates/${req.file.filename}`;
      const candidate = await candidateRepository.update(Number(req.params.id), { photoUrl });
      sendSuccess(res, candidate, 'Photo uploaded');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await candidateRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Candidate deleted');
    } catch (err) { next(err); }
  }
}

export const candidateController = new CandidateController();
