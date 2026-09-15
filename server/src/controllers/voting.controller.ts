import { Request, Response, NextFunction } from 'express';
import { verificationService } from '../services/verification.service';
import { voteRepository } from '../repositories/vote.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { pollingStationRepository } from '../repositories/polling-station.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class VotingController {
  async initiateVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await verificationService.initiateVerification(req.body);
      sendSuccess(res, result, 'OTP sent (simulation)');
    } catch (err) { next(err); }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { voterId, otp } = req.body;
      const result = await verificationService.verifyOTP(Number(voterId), otp);
      sendSuccess(res, result, 'Voter verified successfully');
    } catch (err) { next(err); }
  }

  async simulateBiometric(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { voterId, type } = req.body;
      const result = await verificationService.simulateBiometric(Number(voterId), type);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }

  async castVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { voterId, candidateId, pollingStationId } = req.body;
      const result = await voteRepository.castVote({
        voterId: Number(voterId),
        candidateId: Number(candidateId),
        pollingStationId: Number(pollingStationId),
      });
      sendSuccess(res, result, 'Vote cast successfully', 201);
    } catch (err) { next(err); }
  }

  async getVVPAT(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawRef = (req.query.referenceNumber || req.query.ref || req.params.referenceNumber) as string;
      if (!rawRef || !rawRef.trim()) {
        res.status(400).json({ success: false, message: 'Please enter a valid Vote Reference Number or Voter ID.' });
        return;
      }
      const pollingStationId = req.query.pollingStationId ? Number(req.query.pollingStationId) : undefined;
      const vvpat = await voteRepository.getVvpat(rawRef.trim(), pollingStationId);
      if (!vvpat) {
        res.status(404).json({
          success: false,
          message: `No verified vote record found for reference number or Voter ID "${rawRef.trim()}".`,
        });
        return;
      }
      sendSuccess(res, vvpat);
    } catch (err) { next(err); }
  }

  async getBallotCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
      let electionId = req.query.electionId ? Number(req.query.electionId) : undefined;

      // If no electionId provided, auto-resolve the ACTIVE election for this constituency.
      // This prevents candidates from past/future elections from appearing on the ballot.
      if (!electionId && constituencyId) {
        const { prisma } = await import('../config/database');
        const activeLink = await prisma.electionConstituency.findFirst({
          where: {
            constituencyId,
            election: { status: 'ACTIVE' },
          },
          select: { electionId: true },
        });
        if (activeLink) {
          electionId = activeLink.electionId;
        }
      } else if (!electionId) {
        // No constituency either — resolve the globally active election
        const { prisma } = await import('../config/database');
        const activeElection = await prisma.election.findFirst({
          where: { status: 'ACTIVE' },
          select: { id: true },
        });
        if (activeElection) electionId = activeElection.id;
      }

      const candidates = await candidateRepository.findAll(electionId, constituencyId);
      sendSuccess(res, candidates);
    } catch (err) { next(err); }
  }

  async getPublicStations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stations = await pollingStationRepository.findAll();
      sendSuccess(res, stations);
    } catch (err) { next(err); }
  }

  async getPublicStationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await pollingStationRepository.findById(Number(req.params.id));
      if (!station) { res.status(404).json({ success: false, message: 'Polling station not found' }); return; }
      sendSuccess(res, station);
    } catch (err) { next(err); }
  }
}

export const votingController = new VotingController();
