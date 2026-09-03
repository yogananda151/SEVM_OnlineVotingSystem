import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';

// ── Password hashing ──────────────────────────────────────────────

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcrypt.rounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ── SHA-256 Vote Hash ─────────────────────────────────────────────

export const generateVoteHash = (data: {
  voterId: number;
  candidateId: number;
  pollingStationId: number;
  timestamp: string;
  nonce: string;
}): string => {
  const payload = JSON.stringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
};

// ── Aadhaar hash (salted HMAC simulation) ─────────────────────────

export const hashAadhaar = (aadhaar: string): string => {
  return crypto.createHmac('sha256', config.jwt.secret).update(aadhaar).digest('hex');
};

// ── Cryptographically secure OTP generation ──────────────────────

export const generateOTP = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

// ── Reference number for VVPAT ────────────────────────────────────

export const generateReferenceNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VOTE-${timestamp}-${random}`;
};
