"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voting_controller_1 = require("../controllers/voting.controller");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
// Verification – no auth needed (voting machine is unauthenticated public terminal)
router.post('/verify/initiate', (0, validation_middleware_1.validate)(validation_middleware_1.voterVerificationSchema), voting_controller_1.votingController.initiateVerification.bind(voting_controller_1.votingController));
router.post('/verify/otp', (0, validation_middleware_1.validate)(validation_middleware_1.otpVerifySchema), voting_controller_1.votingController.verifyOTP.bind(voting_controller_1.votingController));
router.post('/verify/biometric', voting_controller_1.votingController.simulateBiometric.bind(voting_controller_1.votingController));
// Cast vote (public route – the machine handles its own security context)
router.post('/cast', (0, validation_middleware_1.validate)(validation_middleware_1.castVoteSchema), voting_controller_1.votingController.castVote.bind(voting_controller_1.votingController));
// VVPAT lookup (public)
router.get('/vvpat/:referenceNumber', voting_controller_1.votingController.getVVPAT.bind(voting_controller_1.votingController));
// Public ballot candidates & polling stations for EVM kiosk
router.get('/candidates', voting_controller_1.votingController.getBallotCandidates.bind(voting_controller_1.votingController));
router.get('/polling-stations', voting_controller_1.votingController.getPublicStations.bind(voting_controller_1.votingController));
router.get('/polling-stations/:id', voting_controller_1.votingController.getPublicStationById.bind(voting_controller_1.votingController));
exports.default = router;
//# sourceMappingURL=voting.routes.js.map