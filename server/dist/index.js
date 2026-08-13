"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const database_1 = require("./config/database");
const startServer = async () => {
    try {
        // Test database connection
        await database_1.prisma.$connect();
        logger_1.logger.info('✅ Database connection established');
        const server = app_1.app.listen(config_1.config.port, () => {
            logger_1.logger.info(`🚀 Server running on http://localhost:${config_1.config.port}`);
            logger_1.logger.info(`📁 Environment: ${config_1.config.env}`);
            logger_1.logger.info(`🔗 Client URL: ${config_1.config.client.url}`);
        });
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                await database_1.prisma.$disconnect();
                logger_1.logger.info('Server closed.');
                process.exit(0);
            });
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.error('Failed to start server', { error });
        await database_1.prisma.$disconnect();
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map