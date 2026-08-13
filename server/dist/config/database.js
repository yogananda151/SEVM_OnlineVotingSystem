"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
    ],
});
exports.prisma = prisma;
prisma.$on('error', (e) => {
    logger_1.logger.error('Prisma error', { message: e.message, target: e.target });
});
prisma.$on('warn', (e) => {
    logger_1.logger.warn('Prisma warning', { message: e.message, target: e.target });
});
//# sourceMappingURL=database.js.map