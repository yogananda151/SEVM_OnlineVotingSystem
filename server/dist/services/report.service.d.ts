import { Response } from 'express';
export declare class ReportService {
    generateElectionSummaryPDF(electionId: number, res: Response): Promise<void>;
    generateResultsExcel(electionId: number, res: Response): Promise<void>;
    generateVotersExcel(pollingStationId: number, res: Response): Promise<void>;
    generateAuditLogPDF(filters: {
        startDate?: Date;
        endDate?: Date;
    }, res: Response): Promise<void>;
}
export declare const reportService: ReportService;
//# sourceMappingURL=report.service.d.ts.map