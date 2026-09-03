"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voter_controller_1 = require("../controllers/voter.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', voter_controller_1.voterController.getAll.bind(voter_controller_1.voterController));
router.get('/:id', voter_controller_1.voterController.getById.bind(voter_controller_1.voterController));
router.post('/', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), (0, validation_middleware_1.validate)(validation_middleware_1.createVoterSchema), voter_controller_1.voterController.create.bind(voter_controller_1.voterController));
router.post('/bulk', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), voter_controller_1.voterController.bulkCreate.bind(voter_controller_1.voterController));
router.put('/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), voter_controller_1.voterController.update.bind(voter_controller_1.voterController));
router.post('/:id/photo', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), upload_middleware_1.uploadVoterPhoto, voter_controller_1.voterController.uploadPhoto.bind(voter_controller_1.voterController));
router.delete('/:id', (0, auth_middleware_1.authorize)(client_1.UserRole.COMMISSIONER), voter_controller_1.voterController.delete.bind(voter_controller_1.voterController));
exports.default = router;
//# sourceMappingURL=voter.routes.js.map