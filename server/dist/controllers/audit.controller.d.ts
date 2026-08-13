import { Request, Response, NextFunction } from 'express';
export declare class AuditController {
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare class ReportController {
    electionSummaryPDF(req: Request, res: Response, next: NextFunction): Promise<void>;
    resultsExcel(req: Request, res: Response, next: NextFunction): Promise<void>;
    votersExcel(req: Request, res: Response, next: NextFunction): Promise<void>;
    auditLogPDF(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const auditController: AuditController;
export declare const reportController: ReportController;
//# sourceMappingURL=audit.controller.d.ts.map