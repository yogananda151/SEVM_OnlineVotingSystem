"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castVoteSchema = exports.otpVerifySchema = exports.voterVerificationSchema = exports.createVoterSchema = exports.createOfficerSchema = exports.createCandidateSchema = exports.createPartySchema = exports.createPollingStationSchema = exports.createConstituencySchema = exports.updateElectionSchema = exports.createElectionSchema = exports.loginSchema = exports.validate = void 0;
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
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
// ── Election Schemas ──────────────────────────────────────────────
exports.createElectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(200),
    description: zod_1.z.string().optional(),
    electionType: zod_1.z.string().min(1),
    scheduledDate: zod_1.z.string().datetime(),
});
exports.updateElectionSchema = exports.createElectionSchema.partial();
// ── Constituency Schemas ──────────────────────────────────────────
exports.createConstituencySchema = zod_1.z.object({
    electionId: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(2).max(200),
    code: zod_1.z.string().min(2).max(50),
    state: zod_1.z.string().min(2).max(100),
    district: zod_1.z.string().min(2).max(100),
    totalVoters: zod_1.z.number().int().nonnegative().optional(),
});
// ── Polling Station Schemas ───────────────────────────────────────
exports.createPollingStationSchema = zod_1.z.object({
    constituencyId: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(3).max(200),
    code: zod_1.z.string().min(2).max(50),
    address: zod_1.z.string().min(5),
    totalBooths: zod_1.z.number().int().positive().optional(),
});
// ── Party Schemas ─────────────────────────────────────────────────
exports.createPartySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200),
    abbreviation: zod_1.z.string().min(1).max(20),
    symbol: zod_1.z.string().optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    foundedYear: zod_1.z.number().int().min(1800).max(2100).optional(),
});
// ── Candidate Schemas ─────────────────────────────────────────────
exports.createCandidateSchema = zod_1.z.object({
    constituencyId: zod_1.z.number().int().positive(),
    partyId: zod_1.z.number().int().positive().optional().nullable(),
    fullName: zod_1.z.string().min(2).max(150),
    age: zod_1.z.number().int().min(18).max(120),
    qualification: zod_1.z.string().max(200).optional(),
    serialNumber: zod_1.z.number().int().positive(),
    isIndependent: zod_1.z.boolean().optional(),
});
// ── Officer Schemas ───────────────────────────────────────────────
exports.createOfficerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2).max(150),
    employeeId: zod_1.z.string().min(3).max(50),
    phone: zod_1.z.string().min(10).max(20),
    pollingStationId: zod_1.z.number().int().positive().optional().nullable(),
});
// ── Voter Schemas ─────────────────────────────────────────────────
exports.createVoterSchema = zod_1.z.object({
    constituencyId: zod_1.z.number().int().positive(),
    pollingStationId: zod_1.z.number().int().positive(),
    fullName: zod_1.z.string().min(2).max(150),
    voterId: zod_1.z.string().min(5).max(50),
    aadhaarNumber: zod_1.z.string().length(12).optional(),
    dateOfBirth: zod_1.z.string().datetime(),
    gender: zod_1.z.enum(['Male', 'Female', 'Other']),
    address: zod_1.z.string().min(5),
    phone: zod_1.z.string().max(20).optional(),
    serialNumber: zod_1.z.number().int().positive(),
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