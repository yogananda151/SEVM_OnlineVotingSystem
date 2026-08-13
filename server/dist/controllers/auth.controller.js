"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const response_1 = require("../utils/response");
class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
            const userAgent = req.headers['user-agent'];
            const result = await auth_service_1.authService.login(email, password, ipAddress, userAgent);
            (0, response_1.sendSuccess)(res, result, 'Login successful');
        }
        catch (err) {
            next(err);
        }
    }
    async logout(req, res, next) {
        try {
            const userId = req.user.userId;
            const ipAddress = req.ip || 'unknown';
            const userAgent = req.headers['user-agent'];
            await auth_service_1.authService.logout(userId, ipAddress, userAgent);
            (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async getProfile(req, res, next) {
        try {
            const profile = await auth_service_1.authService.getProfile(req.user.userId);
            (0, response_1.sendSuccess)(res, profile);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map