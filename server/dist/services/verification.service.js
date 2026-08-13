"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = exports.VerificationService = void 0;
const voter_repository_1 = require("../repositories/voter.repository");
const database_1 = require("../config/database");
const crypto_1 = require("../utils/crypto");
const error_middleware_1 = require("../middleware/error.middleware");
class VerificationService {
    /**
     * Simulate voter identity verification.
     * In a real system this would call a government API.
     */
    async initiateVerification(data) {
        const { method, voterId, aadhaarNumber, pollingStationId } = data;
        let voter;
        if (method === 'VOTER_ID') {
            if (!voterId)
                throw new error_middleware_1.AppError('Voter ID is required.', 400);
            voter = await voter_repository_1.voterRepository.findByVoterId(voterId);
        }
        else {
            if (!aadhaarNumber)
                throw new error_middleware_1.AppError('Aadhaar number is required.', 400);
            const aadhaarHash = (0, crypto_1.hashAadhaar)(aadhaarNumber);
            voter = await voter_repository_1.voterRepository.findByAadhaarHash(aadhaarHash);
        }
        if (!voter)
            throw new error_middleware_1.AppError('Voter not found. Please check your details.', 404);
        if (!voter.isActive)
            throw new error_middleware_1.AppError('Voter record is inactive. Contact the officer.', 403);
        if (voter.hasVoted)
            throw new error_middleware_1.AppError('This voter has already cast their vote.', 409);
        if (voter.pollingStationId !== pollingStationId) {
            throw new error_middleware_1.AppError('You are not registered at this polling station.', 403);
        }
        // Simulate OTP generation (would be sent via SMS in production)
        const otp = (0, crypto_1.generateOTP)();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        await database_1.prisma.oTPVerification.create({
            data: {
                voterId: voter.id,
                otp,
                method: method,
                expiresAt,
            },
        });
        // In production: send SMS. In simulation: return OTP for display
        return {
            voterId: voter.id,
            voterName: voter.fullName,
            maskedPhone: voter.phone ? `+91-XXXXX${voter.phone.slice(-4)}` : 'N/A',
            simulatedOtp: otp, // SIMULATION ONLY — remove in production
            message: 'OTP sent to registered mobile number (SIMULATION).',
        };
    }
    async verifyOTP(voterId, otp) {
        const record = await database_1.prisma.oTPVerification.findFirst({
            where: {
                voterId,
                otp,
                status: 'PENDING',
                expiresAt: { gt: new Date() },
            },
        });
        if (!record)
            throw new error_middleware_1.AppError('Invalid or expired OTP.', 401);
        await database_1.prisma.oTPVerification.update({
            where: { id: record.id },
            data: { status: 'VERIFIED', verifiedAt: new Date() },
        });
        const voter = await voter_repository_1.voterRepository.findById(voterId);
        if (!voter)
            throw new error_middleware_1.AppError('Voter not found.', 404);
        return { verified: true, voter };
    }
    async simulateBiometric(voterId, type) {
        // Pure simulation — always returns success after a delay
        const voter = await voter_repository_1.voterRepository.findById(voterId);
        if (!voter)
            throw new error_middleware_1.AppError('Voter not found.', 404);
        if (voter.hasVoted)
            throw new error_middleware_1.AppError('Voter has already voted.', 409);
        return {
            verified: true,
            voter,
            message: `${type} verification successful (SIMULATION).`,
        };
    }
}
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
//# sourceMappingURL=verification.service.js.map