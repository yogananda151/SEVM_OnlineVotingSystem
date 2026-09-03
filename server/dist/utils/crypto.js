"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReferenceNumber = exports.generateOTP = exports.hashAadhaar = exports.generateVoteHash = exports.comparePassword = exports.hashPassword = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("../config");
// ── Password hashing ──────────────────────────────────────────────
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, config_1.config.bcrypt.rounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
// ── SHA-256 Vote Hash ─────────────────────────────────────────────
const generateVoteHash = (data) => {
    const payload = JSON.stringify(data);
    return crypto_1.default.createHash('sha256').update(payload).digest('hex');
};
exports.generateVoteHash = generateVoteHash;
// ── Aadhaar hash (salted HMAC simulation) ─────────────────────────
const hashAadhaar = (aadhaar) => {
    return crypto_1.default.createHmac('sha256', config_1.config.jwt.secret).update(aadhaar).digest('hex');
};
exports.hashAadhaar = hashAadhaar;
// ── Cryptographically secure OTP generation ──────────────────────
const generateOTP = () => {
    return crypto_1.default.randomInt(100000, 1000000).toString();
};
exports.generateOTP = generateOTP;
// ── Reference number for VVPAT ────────────────────────────────────
const generateReferenceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `VOTE-${timestamp}-${random}`;
};
exports.generateReferenceNumber = generateReferenceNumber;
//# sourceMappingURL=crypto.js.map