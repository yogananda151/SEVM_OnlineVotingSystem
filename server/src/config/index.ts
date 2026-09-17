import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

// ── Environment Validation ──────────────────────────────────────────────────
// Validates all required env vars at startup. Throws with a clear error
// message if any required variable is missing or using an insecure default.
const INSECURE_SECRETS = new Set([
  'fallback_secret_change_me',
  'fallback_refresh_secret',
  'fallback_aadhaar_hmac_secret_change_me',
  'your_jwt_secret_here',
  'secret',
  'password',
]);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AADHAAR_HMAC_SECRET: z.string().default('fallback_aadhaar_hmac_secret_change_me'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL').default('http://localhost:5173'),
  UPLOAD_PATH: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('5242880'),
  BCRYPT_ROUNDS: z.string().default('12'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('2000'),
  LOG_LEVEL: z.string().default('info'),
  LOG_FILE: z.string().default('./logs/app.log'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error('\n❌  Environment validation failed. Check your server/.env file:\n');
  console.error(issues);
  console.error('\n  Copy server/.env.example → server/.env and fill in the required values.\n');
  process.exit(1);
}

const env = parsed.data;

// Warn about insecure secrets in production
if (env.NODE_ENV === 'production') {
  const insecure: string[] = [];
  if (INSECURE_SECRETS.has(env.JWT_SECRET)) insecure.push('JWT_SECRET');
  if (INSECURE_SECRETS.has(env.JWT_REFRESH_SECRET)) insecure.push('JWT_REFRESH_SECRET');
  if (insecure.length > 0) {
    console.error(`\n❌  SECURITY ERROR: Insecure default values detected for: ${insecure.join(', ')}`);
    console.error('  Please set strong random secrets before running in production.\n');
    process.exit(1);
  }
}

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  aadhaarHmacSecret: env.AADHAAR_HMAC_SECRET,

  client: {
    url: env.CLIENT_URL,
  },

  upload: {
    path: env.UPLOAD_PATH,
    maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
  },

  bcrypt: {
    rounds: parseInt(env.BCRYPT_ROUNDS, 10),
  },

  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX, 10),
  },

  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE,
  },
};
