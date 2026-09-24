import { Router } from 'express';
import { auditController, reportController } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate, authorize(UserRole.COMMISSIONER));

// Audit logs
router.get('/audit-logs', auditController.getAll.bind(auditController));

// Reports
router.get('/reports/election/:electionId/summary/pdf', reportController.electionSummaryPDF.bind(reportController));
router.get('/reports/election/:electionId/results/excel', reportController.resultsExcel.bind(reportController));
router.get('/reports/station/:stationId/voters/excel', reportController.votersExcel.bind(reportController));
router.get('/reports/audit-log/pdf', reportController.auditLogPDF.bind(reportController));

export default router;
