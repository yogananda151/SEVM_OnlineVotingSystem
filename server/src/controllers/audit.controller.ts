import { Request, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/audit.repository';
import { reportService } from '../services/report.service';
import { sendSuccess, sendPaginated } from '../utils/response';

export class AuditController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const { data, total } = await auditRepository.findAll({
        userId: req.query.userId ? Number(req.query.userId) : undefined,
        electionId: req.query.electionId ? Number(req.query.electionId) : undefined,
        action: req.query.action as never,
        module: req.query.module as string,
        page,
        limit,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });
      sendPaginated(res, data, total, page, limit);
    } catch (err) { next(err); }
  }
}

export class ReportController {
  async electionSummaryPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.generateElectionSummaryPDF(Number(req.params.electionId), res);
    } catch (err) { next(err); }
  }

  async resultsExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.generateResultsExcel(Number(req.params.electionId), res);
    } catch (err) { next(err); }
  }

  async votersExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.generateVotersExcel(Number(req.params.stationId), res);
    } catch (err) { next(err); }
  }

  async auditLogPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reportService.generateAuditLogPDF({
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      }, res);
    } catch (err) { next(err); }
  }
}

export const auditController = new AuditController();
export const reportController = new ReportController();
