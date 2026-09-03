"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVoteSchema = exports.otpVerifySchema = exports.voterVerificationSchema = exports.createVoterSchema = exports.createOfficerSchema = exports.createCandidateSchema = exports.createPartySchema = exports.createPollingStationSchema = exports.createConstituencySchema = exports.setElectionOfficerSchema = exports.setElectionConstituenciesSchema = exports.updateElectionSchema = exports.createElectionSchema = exports.createRegionSchema = exports.loginSchema = exports.validate = void 0;
const zod_1 = require("zod");
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.validate = validate;
// ── Auth Schemas ──────────────────────────────────────────────────
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email address.'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters.'),
});
// ── Region Schemas ────────────────────────────────────────────────
exports.createRegionSchema = zod_1.z.object({
    name: zod_1.z
        .string({ required_error: 'Region name is required.' })
        .min(2, 'Region name must be at least 2 characters.')
        .max(150, 'Region name must be at most 150 characters.'),
    code: zod_1.z
        .string({ required_error: 'Region code is required.' })
        .min(2, 'Region code must be at least 2 characters.')
        .max(50, 'Region code must be at most 50 characters.'),
    description: zod_1.z.string().max(500, 'Description must be at most 500 characters.').optional(),
});
// ── Election Schemas ──────────────────────────────────────────────
exports.createElectionSchema = zod_1.z.object({
    name: zod_1.z
        .string({ required_error: 'Election name is required.' })
        .min(3, 'Election name must be at least 3 characters.')
        .max(200, 'Election name must be at most 200 characters.'),
    description: zod_1.z.string().optional(),
    electionType: zod_1.z
        .string({ required_error: 'Election type is required.' })
        .min(1, 'Please select an election type.'),
    scheduledDate: zod_1.z
        .string({ required_error: 'Scheduled date is required.' })
        .datetime('Please enter a valid scheduled date.'),
});
exports.updateElectionSchema = exports.createElectionSchema.partial();
exports.setElectionConstituenciesSchema = zod_1.z.object({
    constituencyIds: zod_1.z.array(zod_1.z.number().int().positive()).min(0),
});
exports.setElectionOfficerSchema = zod_1.z.object({
    officerId: zod_1.z
        .number({ required_error: 'Please select an Election Officer.', invalid_type_error: 'Please select a valid Election Officer.' })
        .int()
        .positive('Please select a valid Election Officer.')
        .nullable(),
});
// ── Constituency Schemas ──────────────────────────────────────────
exports.createConstituencySchema = zod_1.z.object({
    regionId: zod_1.z
        .number({ required_error: 'Please select a region.', invalid_type_error: 'Please select a region.' })
        .int()
        .positive('Please select a valid region.'),
    name: zod_1.z
        .string({ required_error: 'Constituency name is required.' })
        .min(2, 'Constituency name must be at least 2 characters.')
        .max(200, 'Constituency name must be at most 200 characters.'),
    code: zod_1.z
        .string({ required_error: 'Constituency code is required.' })
        .min(2, 'Constituency code must be at least 2 characters.')
        .max(50, 'Constituency code must be at most 50 characters.'),
    description: zod_1.z.string().max(500).optional(),
});
// ── Polling Station Schemas ───────────────────────────────────────
exports.createPollingStationSchema = zod_1.z.object({
    constituencyId: zod_1.z
        .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
        .int()
        .positive('Please select a valid constituency.'),
    name: zod_1.z
        .string({ required_error: 'Station name is required.' })
        .min(3, 'Station name must be at least 3 characters.')
        .max(200, 'Station name must be at most 200 characters.'),
    code: zod_1.z
        .string({ required_error: 'Station code is required.' })
        .min(2, 'Station code must be at least 2 characters.')
        .max(50, 'Station code must be at most 50 characters.'),
    address: zod_1.z
        .string({ required_error: 'Address is required.' })
        .min(5, 'Please enter a valid address (at least 5 characters).'),
    capacity: zod_1.z.number().int().positive().optional(),
    totalBooths: zod_1.z.number().int().positive().optional(),
});
// ── Party Schemas ─────────────────────────────────────────────────
exports.createPartySchema = zod_1.z.object({
    name: zod_1.z
        .string({ required_error: 'Party name is required.' })
        .min(2, 'Party name must be at least 2 characters.')
        .max(200),
    abbreviation: zod_1.z
        .string({ required_error: 'Abbreviation is required.' })
        .min(1, 'Abbreviation is required.')
        .max(20),
    symbol: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Please enter a valid hex color (e.g. #1a73e8).').optional(),
    foundedYear: zod_1.z.number().int().min(1800).max(2100).optional(),
});
// ── Candidate Schemas ─────────────────────────────────────────────
exports.createCandidateSchema = zod_1.z.object({
    electionId: zod_1.z
        .number({ required_error: 'Please select an election.', invalid_type_error: 'Please select an election.' })
        .int()
        .positive('Please select a valid election.'),
    constituencyId: zod_1.z
        .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
        .int()
        .positive('Please select a valid constituency.'),
    partyId: zod_1.z.number().int().positive().optional().nullable(),
    fullName: zod_1.z
        .string({ required_error: 'Candidate full name is required.' })
        .min(2, 'Full name must be at least 2 characters.')
        .max(150),
    age: zod_1.z
        .number({ required_error: 'Age is required.', invalid_type_error: 'Please enter a valid age.' })
        .int()
        .min(18, 'Candidate must be at least 18 years old.')
        .max(120, 'Please enter a valid age.'),
    qualification: zod_1.z.string().max(200).optional(),
    serialNumber: zod_1.z
        .number({ required_error: 'Serial number is required.', invalid_type_error: 'Serial number must be a positive integer.' })
        .int()
        .positive('Serial number must be greater than 0.'),
    isIndependent: zod_1.z.boolean().optional(),
});
// ── Officer Schemas ───────────────────────────────────────────────
exports.createOfficerSchema = zod_1.z.object({
    email: zod_1.z.string({ required_error: 'Email address is required.' }).email('Please enter a valid email address.'),
    password: zod_1.z
        .string({ required_error: 'Password is required.' })
        .min(8, 'Password must be at least 8 characters.'),
    fullName: zod_1.z
        .string({ required_error: 'Full name is required.' })
        .min(2, 'Full name must be at least 2 characters.')
        .max(150),
    employeeId: zod_1.z
        .string({ required_error: 'Employee ID is required.' })
        .min(3, 'Employee ID must be at least 3 characters.')
        .max(50),
    phone: zod_1.z
        .string({ required_error: 'Phone number is required.' })
        .min(10, 'Phone number must be at least 10 digits.')
        .max(20),
    pollingStationId: zod_1.z.number().int().positive().optional().nullable(),
});
// ── Voter Schemas ─────────────────────────────────────────────────
exports.createVoterSchema = zod_1.z.object({
    constituencyId: zod_1.z
        .number({ required_error: 'Please select a constituency.', invalid_type_error: 'Please select a constituency.' })
        .int()
        .positive('Please select a valid constituency.'),
    pollingStationId: zod_1.z
        .number({ required_error: 'Please select a polling station.', invalid_type_error: 'Please select a polling station.' })
        .int()
        .positive('Please select a valid polling station.'),
    fullName: zod_1.z
        .string({ required_error: 'Full name is required.' })
        .min(2, 'Full name must be at least 2 characters.')
        .max(150),
    voterId: zod_1.z
        .string({ required_error: 'Voter ID is required.' })
        .min(5, 'Voter ID must be at least 5 characters.')
        .max(50),
    aadhaarNumber: zod_1.z
        .string()
        .regex(/^\d{12}$/, 'Aadhaar number must contain exactly 12 digits.')
        .optional()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? undefined : val)),
    dateOfBirth: zod_1.z.string({ required_error: 'Date of birth is required.' }).datetime('Please enter a valid date of birth.'),
    gender: zod_1.z.enum(['Male', 'Female', 'Other'], {
        errorMap: () => ({ message: 'Please select a gender (Male, Female, or Other).' }),
    }),
    address: zod_1.z
        .string({ required_error: 'Address is required.' })
        .min(5, 'Please enter a valid address.'),
    phone: zod_1.z
        .string()
        .max(20)
        .optional()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? undefined : val)),
    serialNumber: zod_1.z
        .number({ required_error: 'Serial number is required.', invalid_type_error: 'Serial number must be a positive integer.' })
        .int()
        .positive('Serial number must be greater than 0.'),
});
// ── Verification Schema ───────────────────────────────────────────
exports.voterVerificationSchema = zod_1.z.object({
    method: zod_1.z.enum(['AADHAAR', 'VOTER_ID']),
    voterId: zod_1.z.string().optional(),
    aadhaarNumber: zod_1.z.string().length(12).optional(),
    pollingStationId: zod_1.z.number().int().positive(),
});
exports.otpVerifySchema = zod_1.z.object({
    voterId: zod_1.z.number().int().positive(),
    otp: zod_1.z.string().length(6),
});
// ── Vote Schema ───────────────────────────────────────────────────
exports.castVoteSchema = zod_1.z.object({
    voterId: zod_1.z.number().int().positive(),
    candidateId: zod_1.z.number().int().positive(),
    pollingStationId: zod_1.z.number().int().positive(),
});
//# sourceMappingURL=validation.middleware.js.map