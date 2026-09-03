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
      const { referenceNumber } = req.params;
      const vvpat = await voteRepository.getVvpat(referenceNumber);
      if (!vvpat) { res.status(404).json({ success: false, message: 'VVPAT not found' }); return; }
      sendSuccess(res, vvpat);
    } catch (err) { next(err); }
  }

  async getBallotCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
      const electionId = req.query.electionId ? Number(req.query.electionId) : undefined;
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
