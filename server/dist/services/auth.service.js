"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const user_repository_1 = require("../repositories/user.repository");
const crypto_1 = require("../utils/crypto");
const jwt_1 = require("../utils/jwt");
const error_middleware_1 = require("../middleware/error.middleware");
const audit_repository_1 = require("../repositories/audit.repository");
class AuthService {
    async login(email, password, ipAddress, userAgent) {
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user) {
            throw new error_middleware_1.AppError('Invalid email or password.', 401);
        }
        if (!user.isActive) {
            throw new error_middleware_1.AppError('Your account has been deactivated. Contact administrator.', 403);
        }
        const isPasswordValid = await (0, crypto_1.comparePassword)(password, user.passwordHash);
        // Log attempt regardless of success
        await user_repository_1.userRepository.logLogin({ userId: user.id, ipAddress, userAgent, success: isPasswordValid });
        if (!isPasswordValid) {
            throw new error_middleware_1.AppError('Invalid email or password.', 401);
        }
        // Get profile (commissioner or officer)
        const profile = await user_repository_1.userRepository.findById(user.id);
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            stationId: profile?.officer?.pollingStationId ?? undefined,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(payload);
        await user_repository_1.userRepository.updateLastLogin(user.id);
        // Audit log
        await audit_repository_1.auditRepository.create({
            userId: user.id,
            action: 'LOGIN',
            module: 'Auth',
            description: `User ${email} logged in successfully`,
            ipAddress,
            userAgent,
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                profile: profile?.commissioner || profile?.officer,
            },
        };
    }
    async logout(userId, ipAddress, userAgent) {
        await audit_repository_1.auditRepository.create({
            userId,
            action: 'LOGOUT',
            module: 'Auth',
            description: `User logged out`,
            ipAddress,
            userAgent,
        });
    }
    async getProfile(userId) {
        const user = await user_repository_1.userRepository.findById(userId);
        if (!user)
            throw new error_middleware_1.AppError('User not found.', 404);
        return user;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map