import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// Ensure log directory exists
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  }),
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: config.logging.file, maxsize: 10485760, maxFiles: 5 }),
    new winston.transports.File({ filename: config.logging.file.replace('.log', '.error.log'), level: 'error' }),
  ],
});

if (config.env !== 'production') {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}
