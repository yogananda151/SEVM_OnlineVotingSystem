import { Router } from 'express';
import { candidateController } from '../controllers/candidate.controller';
import { partyController } from '../controllers/party.controller';
import { constituencyController, pollingStationController } from '../controllers/location.controller';
import { officerController } from '../controllers/officer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadCandidatePhoto, uploadPartySymbol, uploadVoterPhoto } from '../middleware/upload.middleware';
import { validate, createCandidateSchema, createPartySchema, createConstituencySchema, createPollingStationSchema, createOfficerSchema } from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

// ── Candidates ────────────────────────────────────────────────────
router.get('/candidates', candidateController.getAll.bind(candidateController));
router.get('/candidates/:id', candidateController.getById.bind(candidateController));
router.post('/candidates', authorize(UserRole.COMMISSIONER), validate(createCandidateSchema), candidateController.create.bind(candidateController));
router.put('/candidates/:id', authorize(UserRole.COMMISSIONER), candidateController.update.bind(candidateController));
router.post('/candidates/:id/photo', authorize(UserRole.COMMISSIONER), uploadCandidatePhoto, candidateController.uploadPhoto.bind(candidateController));
router.delete('/candidates/:id', authorize(UserRole.COMMISSIONER), candidateController.delete.bind(candidateController));

// ── Parties ───────────────────────────────────────────────────────
router.get('/parties', partyController.getAll.bind(partyController));
router.get('/parties/:id', partyController.getById.bind(partyController));
router.post('/parties', authorize(UserRole.COMMISSIONER), validate(createPartySchema), partyController.create.bind(partyController));
router.put('/parties/:id', authorize(UserRole.COMMISSIONER), partyController.update.bind(partyController));
router.post('/parties/:id/symbol', authorize(UserRole.COMMISSIONER), uploadPartySymbol, partyController.uploadSymbol.bind(partyController));
router.delete('/parties/:id', authorize(UserRole.COMMISSIONER), partyController.delete.bind(partyController));

// ── Constituencies ────────────────────────────────────────────────
router.get('/constituencies', constituencyController.getAll.bind(constituencyController));
router.get('/constituencies/:id', constituencyController.getById.bind(constituencyController));
router.post('/constituencies', authorize(UserRole.COMMISSIONER), validate(createConstituencySchema), constituencyController.create.bind(constituencyController));
router.put('/constituencies/:id', authorize(UserRole.COMMISSIONER), constituencyController.update.bind(constituencyController));
router.delete('/constituencies/:id', authorize(UserRole.COMMISSIONER), constituencyController.delete.bind(constituencyController));

// ── Polling Stations ──────────────────────────────────────────────
router.get('/polling-stations', pollingStationController.getAll.bind(pollingStationController));
router.get('/polling-stations/:id', pollingStationController.getById.bind(pollingStationController));
router.get('/polling-stations/:id/turnout', pollingStationController.getTurnout.bind(pollingStationController));
router.post('/polling-stations', authorize(UserRole.COMMISSIONER), validate(createPollingStationSchema), pollingStationController.create.bind(pollingStationController));
router.put('/polling-stations/:id', authorize(UserRole.COMMISSIONER), pollingStationController.update.bind(pollingStationController));
router.patch('/polling-stations/:id/machine-status', pollingStationController.updateMachineStatus.bind(pollingStationController));
router.delete('/polling-stations/:id', authorize(UserRole.COMMISSIONER), pollingStationController.delete.bind(pollingStationController));

// ── Officers ──────────────────────────────────────────────────────
router.get('/officers', authorize(UserRole.COMMISSIONER), officerController.getAll.bind(officerController));
router.post('/officers', authorize(UserRole.COMMISSIONER), validate(createOfficerSchema), officerController.create.bind(officerController));
router.put('/officers/:id', authorize(UserRole.COMMISSIONER), officerController.update.bind(officerController));
router.delete('/officers/:id', authorize(UserRole.COMMISSIONER), officerController.delete.bind(officerController));

export default router;
