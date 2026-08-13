"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("../controllers/audit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER));
// Audit logs
router.get('/audit-logs', audit_controller_1.auditController.getAll.bind(audit_controller_1.auditController));
// Reports
router.get('/reports/election/:electionId/summary/pdf', audit_controller_1.reportController.electionSummaryPDF.bind(audit_controller_1.reportController));
router.get('/reports/election/:electionId/results/excel', audit_controller_1.reportController.resultsExcel.bind(audit_controller_1.reportController));
router.get('/reports/station/:stationId/voters/excel', audit_controller_1.reportController.votersExcel.bind(audit_controller_1.reportController));
router.get('/reports/audit-log/pdf', audit_controller_1.reportController.auditLogPDF.bind(audit_controller_1.reportController));
exports.default = router;
//# sourceMappingURL=report.routes.js.map