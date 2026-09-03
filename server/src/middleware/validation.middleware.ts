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
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

// ── Region Schemas ────────────────────────────────────────────────

export const createRegionSchema = z.object({
  name: z
    .string({ required_error: 'Region name is required.' })
    .min(2, 'Region name must be at least 2 characters.')
    .max(150, 'Region name must be at most 150 characters.'),
  code: z
    .string({ required_error: 'Region code is required.' })
    .min(2, 'Region code must be at least 2 characters.')
    .max(50, 'Region code must be at most 50 characters.'),
  description: z.string().max(500, 'Description must be at most 500 characters.').optional(),
});

// ── Election Schemas ──────────────────────────────────────────────

export const createElectionSchema = z.object({
  name: z
    .string({ required_error: 'Election name is required.' })
    .min(3, 'Election name must be at least 3 characters.')
    .max(200, 'Election name must be at most 200 characters.'),
  description: z.string().optional(),
  electionType: z
    .string({ required_error: 'Election type is required.' })
    .min(1, 'Please select an election type.'),
  scheduledDate: z
    .string({ required_error: 'Scheduled date is required.' })
    .datetime('Please enter a valid scheduled date.'),
});

export const updateElectionSchema = createElectionSchema.partial();

export const setElectionConstituenciesSchema = z.object({
  constituencyIds: z.array(z.number().int().positive()).min(0),
});

export const setElectionOfficerSchema = z.object({
  officerId: z
    .number({ required_error: 'Please select an Election Officer.', invalid_type_error: 'Please select a valid Election Officer.' })
    .int()
    .positive('Please select a valid Election Officer.')
    .nullable(),
});

// ── Constituency Schemas ──────────────────────────────────────────

export const createConstituencySchema = z.object({
  regionId: z
    .number({ required_error: 'Please select a region.', invalid_type_error: 'Please select a region.' })
    .int()
    .positive('Please select a valid region.'),
  name: z
    .string({ required_error: 'Constituency name is required.' })
    .min(2, 'Constituency name must be at least 2 characters.')
    .max(200, 'Constituency name must be at most 200 characters.'),
  code: z
    .string({ required_error: 'Constituency code is required.' })
    .min(2, 'Constituency code must be at least 2 characters.')
    .max(50, 'Constituency code must be at most 50 characters.'),
  description: z.string().max(500).optional(),
});

// ── Polling Station Schemas ───────────────────────────────────────

export const createPollingStationSchema = z.object({
  constituencyId: z
    .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
    .int()
    .positive('Please select a valid constituency.'),
  name: z
    .string({ required_error: 'Station name is required.' })
    .min(3, 'Station name must be at least 3 characters.')
    .max(200, 'Station name must be at most 200 characters.'),
  code: z
    .string({ required_error: 'Station code is required.' })
    .min(2, 'Station code must be at least 2 characters.')
    .max(50, 'Station code must be at most 50 characters.'),
  address: z
    .string({ required_error: 'Address is required.' })
    .min(5, 'Please enter a valid address (at least 5 characters).'),
  capacity: z.number().int().positive().optional(),
  totalBooths: z.number().int().positive().optional(),
});

// ── Party Schemas ─────────────────────────────────────────────────

export const createPartySchema = z.object({
  name: z
    .string({ required_error: 'Party name is required.' })
    .min(2, 'Party name must be at least 2 characters.')
    .max(200),
  abbreviation: z
    .string({ required_error: 'Abbreviation is required.' })
    .min(1, 'Abbreviation is required.')
    .max(20),
  symbol: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g. #1a73e8).').optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
});

// ── Candidate Schemas ─────────────────────────────────────────────

export const createCandidateSchema = z.object({
  electionId: z
    .number({ required_error: 'Please select an election.', invalid_type_error: 'Please select an election.' })
    .int()
    .positive('Please select a valid election.'),
  constituencyId: z
    .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
    .int()
    .positive('Please select a valid constituency.'),
  partyId: z.number().int().positive().optional().nullable(),
  fullName: z
    .string({ required_error: 'Candidate full name is required.' })
    .min(2, 'Full name must be at least 2 characters.')
    .max(150),
  age: z
    .number({ required_error: 'Age is required.', invalid_type_error: 'Please enter a valid age.' })
    .int()
    .min(18, 'Candidate must be at least 18 years old.')
    .max(120, 'Please enter a valid age.'),
  qualification: z.string().max(200).optional(),
  serialNumber: z
    .number({ required_error: 'Serial number is required.', invalid_type_error: 'Serial number must be a positive integer.' })
    .int()
    .positive('Serial number must be greater than 0.'),
  isIndependent: z.boolean().optional(),
});

// ── Officer Schemas ───────────────────────────────────────────────

export const createOfficerSchema = z.object({
  email: z.string({ required_error: 'Email address is required.' }).email('Please enter a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters.'),
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .min(2, 'Full name must be at least 2 characters.')
    .max(150),
  employeeId: z
    .string({ required_error: 'Employee ID is required.' })
    .min(3, 'Employee ID must be at least 3 characters.')
    .max(50),
  phone: z
    .string({ required_error: 'Phone number is required.' })
    .min(10, 'Phone number must be at least 10 digits.')
    .max(20),
  pollingStationId: z.number().int().positive().optional().nullable(),
});

// ── Voter Schemas ─────────────────────────────────────────────────

export const createVoterSchema = z.object({
  constituencyId: z
    .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
    .int()
    .positive('Please select a valid constituency.'),
  pollingStationId: z
    .number({ required_error: 'Please select a polling station.', invalid_type_error: 'Please select a polling station.' })
    .int()
    .positive('Please select a valid polling station.'),
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .min(2, 'Full name must be at least 2 characters.')
    .max(150),
  voterId: z
    .string({ required_error: 'Voter ID is required.' })
    .min(5, 'Voter ID must be at least 5 characters.')
    .max(50),
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar number must contain exactly 12 digits.')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  dateOfBirth: z.string({ required_error: 'Date of birth is required.' }).datetime('Please enter a valid date of birth.'),
  gender: z.enum(['Male', 'Female', 'Other'], {
    errorMap: () => ({ message: 'Please select a gender (Male, Female, or Other).' }),
  }),
  address: z
    .string({ required_error: 'Address is required.' })
    .min(5, 'Please enter a valid address.'),
  phone: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  serialNumber: z
    .number({ required_error: 'Serial number is required.', invalid_type_error: 'Serial number must be a positive integer.' })
    .int()
    .positive('Serial number must be greater than 0.'),
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
