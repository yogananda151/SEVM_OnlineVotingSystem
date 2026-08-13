"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        (0, response_1.sendError)(res, 'Access denied. No token provided.', 401);
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch {
        (0, response_1.sendError)(res, 'Invalid or expired token.', 401);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            (0, response_1.sendError)(res, 'Unauthorized.', 401);
            return;
        }
        if (!roles.includes(req.user.role)) {
            (0, response_1.sendError)(res, 'Forbidden. Insufficient permissions.', 403);
            return;
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map