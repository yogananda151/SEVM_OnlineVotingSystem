import { Request, Response, NextFunction } from 'express';
import { candidateRepository } from '../repositories/candidate.repository';
import { electionRepository } from '../repositories/election.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';
import { AppError } from '../middleware/error.middleware';
import { ElectionStatus } from '@prisma/client';
import { candidateExcelService } from '../services/candidate-excel.service';

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

  async downloadTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await candidateExcelService.generateTemplate(res);
    } catch (err) { next(err); }
  }

  async uploadExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400);

      const electionId = Number(req.body.electionId);
      if (!electionId) throw new AppError('electionId is required', 400);

      const defaultConstituencyId = req.body.defaultConstituencyId ? Number(req.body.defaultConstituencyId) : undefined;

      const result = await candidateExcelService.parseAndValidateExcel(
        req.file.buffer,
        electionId,
        defaultConstituencyId,
      );

      if (result.validCandidates.length > 0) {
        for (const candidate of result.validCandidates) {
          await candidateRepository.create(candidate);
        }
        await auditRepository.create({
          userId: req.user?.userId,
          action: 'CREATE',
          module: 'Candidate',
          description: `Bulk imported ${result.validCandidates.length} candidates for election ${electionId}`,
          ipAddress: req.ip,
        });
      }

      sendSuccess(res, result, 'Excel file processed successfully');
    } catch (err) { next(err); }
  }

  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { candidates } = req.body as { candidates: any[] };
      if (!Array.isArray(candidates) || candidates.length === 0) {
        throw new AppError('No candidates provided', 400);
      }

      const electionId = candidates[0]?.electionId;

      const created = [];
      for (const candidate of candidates) {
        created.push(await candidateRepository.create(candidate));
      }

      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Candidate',
        description: `Bulk registered ${created.length} candidates via manual json`,
        ipAddress: req.ip,
      });
      sendSuccess(res, { count: created.length }, 'Candidates registered successfully', 201);
    } catch (err) { next(err); }
  }
}

export const candidateController = new CandidateController();
