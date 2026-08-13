"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingController = exports.VotingController = void 0;
const verification_service_1 = require("../services/verification.service");
const vote_repository_1 = require("../repositories/vote.repository");
const response_1 = require("../utils/response");
class VotingController {
    async initiateVerification(req, res, next) {
        try {
            const result = await verification_service_1.verificationService.initiateVerification(req.body);
            (0, response_1.sendSuccess)(res, result, 'OTP sent (simulation)');
        }
        catch (err) {
            next(err);
        }
    }
    async verifyOTP(req, res, next) {
        try {
            const { voterId, otp } = req.body;
            const result = await verification_service_1.verificationService.verifyOTP(Number(voterId), otp);
            (0, response_1.sendSuccess)(res, result, 'Voter verified successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async simulateBiometric(req, res, next) {
        try {
            const { voterId, type } = req.body;
            const result = await verification_service_1.verificationService.simulateBiometric(Number(voterId), type);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (err) {
            next(err);
        }
    }
    async castVote(req, res, next) {
        try {
            const { voterId, candidateId, pollingStationId } = req.body;
            const result = await vote_repository_1.voteRepository.castVote({
                voterId: Number(voterId),
                candidateId: Number(candidateId),
                pollingStationId: Number(pollingStationId),
            });
            (0, response_1.sendSuccess)(res, result, 'Vote cast successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async getVVPAT(req, res, next) {
        try {
            const { referenceNumber } = req.params;
            const vvpat = await vote_repository_1.voteRepository.getVvpat(referenceNumber);
            if (!vvpat) {
                res.status(404).json({ success: false, message: 'VVPAT not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, vvpat);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VotingController = VotingController;
exports.votingController = new VotingController();
//# sourceMappingURL=voting.controller.js.map