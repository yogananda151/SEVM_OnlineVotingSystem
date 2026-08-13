"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => {
    const body = { success: true, message, data };
    if (meta)
        body.meta = meta;
    res.status(statusCode).json(body);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 400, errors) => {
    const body = { success: false, message };
    if (errors !== undefined)
        body.errors = errors;
    res.status(statusCode).json(body);
};
exports.sendError = sendError;
const sendPaginated = (res, data, total, page, limit, message = 'Success') => {
    res.status(200).json({
        success: true,
        message,
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
};
exports.sendPaginated = sendPaginated;
//# sourceMappingURL=response.js.map