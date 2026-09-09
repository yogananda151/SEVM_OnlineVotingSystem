import { Request, Response, NextFunction } from 'express';
import { candidateRepository } from '../repositories/candidate.repository';
import { electionRepository } from '../repositories/election.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/error.middleware';
import { ElectionStatus } from '@prisma/client';

export class CandidateController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const electionId = req.query.electionId ? Number(req.query.electionId) : undefined;
      const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
      sendSuccess(res, await candidateRepository.findAll(electionId, constituencyId));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const c = await candidateRepository.findById(Number(req.params.id));
      if (!c) { throw new AppError('Candidate not found', 404); }
      sendSuccess(res, c);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const electionId = Number(req.body.electionId);
      const election = await electionRepository.findById(electionId);
      if (!election) throw new AppError('Election not found.', 404);

      if (election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError(
          `Cannot add candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`,
          400,
        );
      }

      const candidate = await candidateRepository.create(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Candidate',
        description: `Registered candidate: ${candidate.fullName}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, candidate, 'Candidate registered successfully', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const candidate = await candidateRepository.findById(id);
      if (!candidate) throw new AppError('Candidate not found.', 404);

      const election = await electionRepository.findById(candidate.electionId);
      if (election && election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError(
          `Cannot edit candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`,
          400,
        );
      }

      const updated = await candidateRepository.update(id, req.body);
      sendSuccess(res, updated, 'Candidate updated');
    } catch (err) { next(err); }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const candidate = await candidateRepository.findById(id);
      if (!candidate) throw new AppError('Candidate not found.', 404);

      const election = await electionRepository.findById(candidate.electionId);
      if (election && election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError(
          `Cannot update candidate photo. Election "${election.name}" is in "${election.status}" status (configuration is locked).`,
          400,
        );
      }

      if (!req.file) { throw new AppError('No file uploaded', 400); }
      const photoUrl = `/uploads/candidates/${req.file.filename}`;
      const updated = await candidateRepository.update(id, { photoUrl });
      sendSuccess(res, updated, 'Photo uploaded successfully');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const candidate = await candidateRepository.findById(id);
      if (!candidate) throw new AppError('Candidate not found.', 404);

      const election = await electionRepository.findById(candidate.electionId);
      if (election && election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.SCHEDULED) {
        throw new AppError(
          `Cannot remove candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`,
          400,
        );
      }

      await candidateRepository.delete(id);
      sendSuccess(res, null, 'Candidate removed');
    } catch (err) { next(err); }
  }
}

export const candidateController = new CandidateController();
