"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const election_controller_1 = require("../controllers/election.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/stats/dashboard', election_controller_1.electionController.getDashboardStats.bind(election_controller_1.electionController));
router.get('/', election_controller_1.electionController.getAll.bind(election_controller_1.electionController));
router.get('/:id', election_controller_1.electionController.getById.bind(election_controller_1.electionController));
router.get('/:id/stats', election_controller_1.electionController.getStats.bind(election_controller_1.electionController));
router.get('/:id/results', election_controller_1.electionController.getResults.bind(election_controller_1.electionController));
router.get('/:id/readiness', election_controller_1.electionController.getReadiness.bind(election_controller_1.electionController));
router.get('/:id/constituencies', election_controller_1.electionController.getConstituencies.bind(election_controller_1.electionController));
router.get('/:id/officer', election_controller_1.electionController.getOfficer.bind(election_controller_1.electionController));
// Commissioner only
router.post('/', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createElectionSchema), election_controller_1.electionController.create.bind(election_controller_1.electionController));
router.put('/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), election_controller_1.electionController.update.bind(election_controller_1.electionController));
router.patch('/:id/status', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), election_controller_1.electionController.updateStatus.bind(election_controller_1.electionController));
router.put('/:id/constituencies', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.setElectionConstituenciesSchema), election_controller_1.electionController.setConstituencies.bind(election_controller_1.electionController));
router.put('/:id/officer', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.setElectionOfficerSchema), election_controller_1.electionController.setOfficer.bind(election_controller_1.electionController));
router.post('/:id/publish-results', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), election_controller_1.electionController.publishResults.bind(election_controller_1.electionController));
router.delete('/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), election_controller_1.electionController.delete.bind(election_controller_1.electionController));
exports.default = router;
//# sourceMappingURL=election.routes.js.map