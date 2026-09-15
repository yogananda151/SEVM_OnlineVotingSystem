import { Router } from 'express';
import { electionController } from '../controllers/election.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  validate,
  createElectionSchema,
  updateElectionSchema,
  setElectionConstituenciesSchema,
  setElectionOfficerSchema,
} from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/my/assigned', authorize(UserRole.OFFICER), electionController.getMyElections.bind(electionController));
router.get('/stats/dashboard', electionController.getDashboardStats.bind(electionController));
router.get('/', electionController.getAll.bind(electionController));
router.get('/:id', electionController.getById.bind(electionController));
router.get('/:id/stats', electionController.getStats.bind(electionController));
router.get('/:id/results', electionController.getResults.bind(electionController));
router.get('/:id/readiness', electionController.getReadiness.bind(electionController));
router.get('/:id/constituencies', electionController.getConstituencies.bind(electionController));
router.get('/:id/officer', electionController.getOfficer.bind(electionController));

// Status update (Officers start/stop; Commissioner schedule only)
router.patch('/:id/status', authorize(UserRole.COMMISSIONER, UserRole.OFFICER), electionController.updateStatus.bind(electionController));

// Commissioner only
router.post('/', authorize(UserRole.COMMISSIONER), validate(createElectionSchema), electionController.create.bind(electionController));
router.put('/:id', authorize(UserRole.COMMISSIONER), validate(updateElectionSchema), electionController.update.bind(electionController));
router.put('/:id/constituencies', authorize(UserRole.COMMISSIONER), validate(setElectionConstituenciesSchema), electionController.setConstituencies.bind(electionController));
router.put('/:id/officer', authorize(UserRole.COMMISSIONER), validate(setElectionOfficerSchema), electionController.setOfficer.bind(electionController));
router.post('/:id/publish-results', authorize(UserRole.COMMISSIONER), electionController.publishResults.bind(electionController));
router.delete('/:id', authorize(UserRole.COMMISSIONER), electionController.delete.bind(electionController));

export default router;
