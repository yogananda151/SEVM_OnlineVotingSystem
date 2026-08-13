import 'dotenv/config';
import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './config/database';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connection established');

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
      logger.info(`📁 Environment: ${config.env}`);
      logger.info(`🔗 Client URL: ${config.client.url}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
