"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportController = exports.auditController = exports.ReportController = exports.AuditController = void 0;
const audit_repository_1 = require("../repositories/audit.repository");
const report_service_1 = require("../services/report.service");
const response_1 = require("../utils/response");
class AuditController {
    async getAll(req, res, next) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 50;
            const { data, total } = await audit_repository_1.auditRepository.findAll({
                userId: req.query.userId ? Number(req.query.userId) : undefined,
                electionId: req.query.electionId ? Number(req.query.electionId) : undefined,
                action: req.query.action,
                module: req.query.module,
                page,
                limit,
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            });
            (0, response_1.sendPaginated)(res, data, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuditController = AuditController;
class ReportController {
    async electionSummaryPDF(req, res, next) {
        try {
            await report_service_1.reportService.generateElectionSummaryPDF(Number(req.params.electionId), res);
        }
        catch (err) {
            next(err);
        }
    }
    async resultsExcel(req, res, next) {
        try {
            await report_service_1.reportService.generateResultsExcel(Number(req.params.electionId), res);
        }
        catch (err) {
            next(err);
        }
    }
    async votersExcel(req, res, next) {
        try {
            await report_service_1.reportService.generateVotersExcel(Number(req.params.stationId), res);
        }
        catch (err) {
            next(err);
        }
    }
    async auditLogPDF(req, res, next) {
        try {
            await report_service_1.reportService.generateAuditLogPDF({
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            }, res);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReportController = ReportController;
exports.auditController = new AuditController();
exports.reportController = new ReportController();
//# sourceMappingURL=audit.controller.js.map