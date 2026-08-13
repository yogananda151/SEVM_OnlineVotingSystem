"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    logger_1.logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
    }
    // Known application errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Prisma unique constraint
    if (err.code === 'P2002') {
        res.status(409).json({
            success: false,
            message: 'A record with this value already exists.',
        });
        return;
    }
    // Prisma not found
    if (err.code === 'P2025') {
        res.status(404).json({
            success: false,
            message: 'Record not found.',
        });
        return;
    }
    // Default 500
    res.status(500).json({
        success: false,
        message: 'Internal server error.',
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found.`,
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=error.middleware.js.map