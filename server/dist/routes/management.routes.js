"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("../controllers/candidate.controller");
const party_controller_1 = require("../controllers/party.controller");
const location_controller_1 = require("../controllers/location.controller");
const officer_controller_1 = require("../controllers/officer.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// ── Candidates ────────────────────────────────────────────────────
router.get('/candidates', candidate_controller_1.candidateController.getAll.bind(candidate_controller_1.candidateController));
router.get('/candidates/:id', candidate_controller_1.candidateController.getById.bind(candidate_controller_1.candidateController));
router.post('/candidates', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createCandidateSchema), candidate_controller_1.candidateController.create.bind(candidate_controller_1.candidateController));
router.put('/candidates/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), candidate_controller_1.candidateController.update.bind(candidate_controller_1.candidateController));
router.post('/candidates/:id/photo', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), upload_middleware_1.uploadCandidatePhoto, candidate_controller_1.candidateController.uploadPhoto.bind(candidate_controller_1.candidateController));
router.delete('/candidates/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), candidate_controller_1.candidateController.delete.bind(candidate_controller_1.candidateController));
// ── Parties ───────────────────────────────────────────────────────
router.get('/parties', party_controller_1.partyController.getAll.bind(party_controller_1.partyController));
router.get('/parties/:id', party_controller_1.partyController.getById.bind(party_controller_1.partyController));
router.post('/parties', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createPartySchema), party_controller_1.partyController.create.bind(party_controller_1.partyController));
router.put('/parties/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), party_controller_1.partyController.update.bind(party_controller_1.partyController));
router.post('/parties/:id/symbol', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), upload_middleware_1.uploadPartySymbol, party_controller_1.partyController.uploadSymbol.bind(party_controller_1.partyController));
router.delete('/parties/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), party_controller_1.partyController.delete.bind(party_controller_1.partyController));
// ── Constituencies ────────────────────────────────────────────────
router.get('/constituencies', location_controller_1.constituencyController.getAll.bind(location_controller_1.constituencyController));
router.get('/constituencies/:id', location_controller_1.constituencyController.getById.bind(location_controller_1.constituencyController));
router.post('/constituencies', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createConstituencySchema), location_controller_1.constituencyController.create.bind(location_controller_1.constituencyController));
router.put('/constituencies/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), location_controller_1.constituencyController.update.bind(location_controller_1.constituencyController));
router.delete('/constituencies/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), location_controller_1.constituencyController.delete.bind(location_controller_1.constituencyController));
// ── Polling Stations ──────────────────────────────────────────────
router.get('/polling-stations', location_controller_1.pollingStationController.getAll.bind(location_controller_1.pollingStationController));
router.get('/polling-stations/:id', location_controller_1.pollingStationController.getById.bind(location_controller_1.pollingStationController));
router.get('/polling-stations/:id/turnout', location_controller_1.pollingStationController.getTurnout.bind(location_controller_1.pollingStationController));
router.post('/polling-stations', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createPollingStationSchema), location_controller_1.pollingStationController.create.bind(location_controller_1.pollingStationController));
router.put('/polling-stations/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), location_controller_1.pollingStationController.update.bind(location_controller_1.pollingStationController));
router.patch('/polling-stations/:id/machine-status', location_controller_1.pollingStationController.updateMachineStatus.bind(location_controller_1.pollingStationController));
router.delete('/polling-stations/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), location_controller_1.pollingStationController.delete.bind(location_controller_1.pollingStationController));
// ── Officers ──────────────────────────────────────────────────────
router.get('/officers', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), officer_controller_1.officerController.getAll.bind(officer_controller_1.officerController));
router.post('/officers', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createOfficerSchema), officer_controller_1.officerController.create.bind(officer_controller_1.officerController));
router.put('/officers/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), officer_controller_1.officerController.update.bind(officer_controller_1.officerController));
router.delete('/officers/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), officer_controller_1.officerController.delete.bind(officer_controller_1.officerController));
exports.default = router;
//# sourceMappingURL=management.routes.js.map