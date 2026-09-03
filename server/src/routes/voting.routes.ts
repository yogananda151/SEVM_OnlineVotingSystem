import { Router } from 'express';
import { votingController } from '../controllers/voting.controller';
import { validate, voterVerificationSchema, otpVerifySchema, castVoteSchema } from '../middleware/validation.middleware';

const router = Router();

// Verification – no auth needed (voting machine is unauthenticated public terminal)
router.post('/verify/initiate', validate(voterVerificationSchema), votingController.initiateVerification.bind(votingController));
router.post('/verify/otp', validate(otpVerifySchema), votingController.verifyOTP.bind(votingController));
router.post('/verify/biometric', votingController.simulateBiometric.bind(votingController));

// Cast vote (public route – the machine handles its own security context)
router.post('/cast', validate(castVoteSchema), votingController.castVote.bind(votingController));

// VVPAT lookup (public)
router.get('/vvpat/:referenceNumber', votingController.getVVPAT.bind(votingController));

// Public ballot candidates & polling stations for EVM kiosk
router.get('/candidates', votingController.getBallotCandidates.bind(votingController));
router.get('/polling-stations', votingController.getPublicStations.bind(votingController));
router.get('/polling-stations/:id', votingController.getPublicStationById.bind(votingController));

export default router;
