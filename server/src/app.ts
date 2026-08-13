import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import electionRoutes from './routes/election.routes';
import managementRoutes from './routes/management.routes';
import voterRoutes from './routes/voter.routes';
import votingRoutes from './routes/voting.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded images
}));

// ── CORS ──────────────────────────────────────────────────────────
app.use(cors({
  origin: config.client.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

// ── Parsing & Compression ─────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ── Static file serving for uploads ──────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), config.upload.path)));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.env });
});

// ── API Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api', managementRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/voting', votingRoutes);
app.use('/api', reportRoutes);

// ── 404 & Error handlers ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
