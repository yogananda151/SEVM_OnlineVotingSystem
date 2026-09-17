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
import notificationRoutes from './routes/notification.routes';

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
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.env === 'development' ? 10000 : config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'development',
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', generalLimiter);

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
// Dedicated rate limit for login endpoint (e.g. 25 attempts per 15 min per IP in prod)
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.env === 'development' ? 200 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLoginLimiter);

app.use('/api/auth', authRoutes);

// Stricter rate limit for OTP/verification endpoints (10 req/min per IP in prod, 100 in dev)
const votingVerifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.env === 'development' ? 100 : 10,
  message: { success: false, message: 'Too many verification attempts. Please wait 1 minute before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/voting/verify', votingVerifyLimiter);

app.use('/api/voting', votingRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api', managementRoutes);
app.use('/api', reportRoutes);
app.use('/api', notificationRoutes);

// ── 404 & Error handlers ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
