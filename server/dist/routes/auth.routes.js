"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
router.post('/login', (0, validation_middleware_1.validate)(validation_middleware_1.loginSchema), auth_controller_1.authController.login.bind(auth_controller_1.authController));
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.authController.logout.bind(auth_controller_1.authController));
router.get('/profile', auth_middleware_1.authenticate, auth_controller_1.authController.getProfile.bind(auth_controller_1.authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map