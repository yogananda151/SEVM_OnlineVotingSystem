import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
};

// ── Auth Schemas ──────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Region Schemas ────────────────────────────────────────────────

export const createRegionSchema = z.object({
  name: z.string().min(2, 'Region name must be at least 2 characters').max(150),
  code: z.string().min(2, 'Region code must be at least 2 characters').max(50),
  description: z.string().max(500).optional(),
});

// ── Election Schemas ──────────────────────────────────────────────

export const createElectionSchema = z.object({
  name: z.string().min(3, 'Election name must be at least 3 characters').max(200),
  description: z.string().optional(),
  electionType: z.string().min(1, 'Election type is required'),
  scheduledDate: z.string().datetime('Invalid date format'),
});

export const updateElectionSchema = createElectionSchema.partial();

export const setElectionConstituenciesSchema = z.object({
  constituencyIds: z.array(z.number().int().positive()).min(0),
});

// ── Constituency Schemas ──────────────────────────────────────────

export const createConstituencySchema = z.object({
  regionId: z.number({ required_error: 'Region is required. Please select a region.' }).int().positive(),
  name: z.string().min(2, 'Constituency name must be at least 2 characters').max(200),
  code: z.string().min(2, 'Constituency code must be at least 2 characters').max(50),
  description: z.string().max(500).optional(),
});

// ── Polling Station Schemas ───────────────────────────────────────

export const createPollingStationSchema = z.object({
  constituencyId: z.number({ required_error: 'Constituency is required. Please select a constituency.' }).int().positive(),
  name: z.string().min(3, 'Station name must be at least 3 characters').max(200),
  code: z.string().min(2, 'Station code must be at least 2 characters').max(50),
  address: z.string().min(5, 'Address is required'),
  capacity: z.number().int().positive().optional(),
  totalBooths: z.number().int().positive().optional(),
});

// ── Party Schemas ─────────────────────────────────────────────────

export const createPartySchema = z.object({
  name: z.string().min(2).max(200),
  abbreviation: z.string().min(1).max(20),
  symbol: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
});

// ── Candidate Schemas ─────────────────────────────────────────────

export const createCandidateSchema = z.object({
  electionId: z.number({ required_error: 'Election is required.' }).int().positive(),
  constituencyId: z.number({ required_error: 'Constituency is required.' }).int().positive(),
  partyId: z.number().int().positive().optional().nullable(),
  fullName: z.string().min(2).max(150),
  age: z.number().int().min(18, 'Candidate must be at least 18 years old').max(120),
  qualification: z.string().max(200).optional(),
  serialNumber: z.number().int().positive(),
  isIndependent: z.boolean().optional(),
});

// ── Officer Schemas ───────────────────────────────────────────────

export const createOfficerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2).max(150),
  employeeId: z.string().min(3).max(50),
  phone: z.string().min(10).max(20),
  pollingStationId: z.number().int().positive().optional().nullable(),
});

// ── Voter Schemas ─────────────────────────────────────────────────

export const createVoterSchema = z.object({
  constituencyId: z.number({ required_error: 'Constituency is required.' }).int().positive(),
  pollingStationId: z.number({ required_error: 'Polling station is required.' }).int().positive(),
  fullName: z.string().min(2).max(150),
  voterId: z.string().min(5).max(50),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must contain exactly 12 digits.').optional(),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['Male', 'Female', 'Other']),
  address: z.string().min(5),
  phone: z.string().max(20).optional(),
  serialNumber: z.number().int().positive(),
});

// ── Verification Schema ───────────────────────────────────────────

export const voterVerificationSchema = z.object({
  method: z.enum(['AADHAAR', 'VOTER_ID']),
  voterId: z.string().optional(),
  aadhaarNumber: z.string().length(12).optional(),
  pollingStationId: z.number().int().positive(),
});

export const otpVerifySchema = z.object({
  voterId: z.number().int().positive(),
  otp: z.string().length(6),
});

// ── Vote Schema ───────────────────────────────────────────────────

export const castVoteSchema = z.object({
  voterId: z.number().int().positive(),
  candidateId: z.number().int().positive(),
  pollingStationId: z.number().int().positive(),
});
