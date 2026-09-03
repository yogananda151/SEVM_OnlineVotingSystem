import { Router } from 'express';
import { electionController } from '../controllers/election.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  validate,
  createElectionSchema,
  setElectionConstituenciesSchema,
  setElectionOfficerSchema,
} from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/stats/dashboard', electionController.getDashboardStats.bind(electionController));
router.get('/', electionController.getAll.bind(electionController));
router.get('/:id', electionController.getById.bind(electionController));
router.get('/:id/stats', electionController.getStats.bind(electionController));
router.get('/:id/results', electionController.getResults.bind(electionController));
router.get('/:id/readiness', electionController.getReadiness.bind(electionController));
router.get('/:id/constituencies', electionController.getConstituencies.bind(electionController));
router.get('/:id/officer', electionController.getOfficer.bind(electionController));

// Commissioner only
router.post('/', authorize(UserRole.COMMISSIONER), validate(createElectionSchema), electionController.create.bind(electionController));
router.put('/:id', authorize(UserRole.COMMISSIONER), electionController.update.bind(electionController));
router.patch('/:id/status', authorize(UserRole.COMMISSIONER), electionController.updateStatus.bind(electionController));
router.put('/:id/constituencies', authorize(UserRole.COMMISSIONER), validate(setElectionConstituenciesSchema), electionController.setConstituencies.bind(electionController));
router.put('/:id/officer', authorize(UserRole.COMMISSIONER), validate(setElectionOfficerSchema), electionController.setOfficer.bind(electionController));
router.post('/:id/publish-results', authorize(UserRole.COMMISSIONER), electionController.publishResults.bind(electionController));
router.delete('/:id', authorize(UserRole.COMMISSIONER), electionController.delete.bind(electionController));

export default router;
