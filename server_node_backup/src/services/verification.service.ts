import { voterRepository } from '../repositories/voter.repository';
import { prisma } from '../config/database';
import { hashAadhaar, generateOTP } from '../utils/crypto';
import { AppError } from '../middleware/error.middleware';
import { VerificationMethod, ElectionStatus } from '@prisma/client';

export class VerificationService {
  /**
   * Simulate voter identity verification.
   * In a real system this would call a government API.
   */
  async initiateVerification(data: {
    method: 'AADHAAR' | 'VOTER_ID';
    voterId?: string;
    aadhaarNumber?: string;
    pollingStationId: number;
  }) {
    const { method, voterId, aadhaarNumber, pollingStationId } = data;

    let voter;

    if (method === 'VOTER_ID') {
      if (!voterId) throw new AppError('Voter ID is required.', 400);
      voter = await voterRepository.findByVoterId(voterId);
    } else {
      if (!aadhaarNumber) throw new AppError('Aadhaar number is required.', 400);
      const aadhaarHash = hashAadhaar(aadhaarNumber);
      voter = await voterRepository.findByAadhaarHash(aadhaarHash);
    }

    if (!voter) throw new AppError('Voter not found. Please check your details.', 404);
    if (!voter.isActive) throw new AppError('Voter record is inactive. Contact the officer.', 403);
    if (voter.pollingStationId !== pollingStationId) {
      throw new AppError('You are not registered at this polling station.', 403);
    }

    // Check if there is an active election for this voter's constituency
    const electionLink = await prisma.electionConstituency.findFirst({
      where: {
        constituencyId: voter.constituencyId,
        election: { status: ElectionStatus.ACTIVE },
      },
      include: { election: true },
    });
    if (!electionLink) {
      throw new AppError('No active election found for your constituency.', 400);
    }
    const electionId = electionLink.election.id;

    // Check per-election voting status (replaces global hasVoted flag)
    const electionStatus = await prisma.electionVoterStatus.findUnique({
      where: { voterId_electionId: { voterId: voter.id, electionId } },
    });
    if (electionStatus?.hasVoted) {
      throw new AppError('This voter has already cast their vote in the current election.', 409);
    }

    // Simulate OTP generation (would be sent via SMS in production)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.oTPVerification.create({
      data: {
        voterId: voter.id,
        otp,
        method: method as VerificationMethod,
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

  async verifyOTP(voterId: number, otp: string) {
    const record = await prisma.oTPVerification.findFirst({
      where: {
        voterId,
        otp,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) throw new AppError('Invalid or expired OTP.', 401);

    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { status: 'VERIFIED', verifiedAt: new Date() },
    });

    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new AppError('Voter not found.', 404);

    return { verified: true, voter };
  }

  async simulateBiometric(voterId: number, type: 'FINGERPRINT' | 'FACE') {
    // Pure simulation — always returns success after a delay
    const voter = await voterRepository.findById(voterId);
    if (!voter) throw new AppError('Voter not found.', 404);

    // Check per-election status for active election
    const electionLink = await prisma.electionConstituency.findFirst({
      where: {
        constituencyId: voter.constituencyId,
        election: { status: ElectionStatus.ACTIVE },
      },
    });
    if (electionLink) {
      const evs = await prisma.electionVoterStatus.findUnique({
        where: { voterId_electionId: { voterId, electionId: electionLink.electionId } },
      });
      if (evs?.hasVoted) throw new AppError('Voter has already voted in the current election.', 409);
    }

    return {
      verified: true,
      voter,
      message: `${type} verification successful (SIMULATION).`,
    };
  }
}

export const verificationService = new VerificationService();
