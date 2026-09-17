"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.votingController = exports.VotingController = void 0;
const verification_service_1 = require("../services/verification.service");
const vote_repository_1 = require("../repositories/vote.repository");
const candidate_repository_1 = require("../repositories/candidate.repository");
const polling_station_repository_1 = require("../repositories/polling-station.repository");
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
            const rawRef = (req.query.referenceNumber || req.query.ref || req.params.referenceNumber);
            if (!rawRef || !rawRef.trim()) {
                res.status(400).json({ success: false, message: 'Please enter a valid Vote Reference Number or Voter ID.' });
                return;
            }
            const pollingStationId = req.query.pollingStationId ? Number(req.query.pollingStationId) : undefined;
            const vvpat = await vote_repository_1.voteRepository.getVvpat(rawRef.trim(), pollingStationId);
            if (!vvpat) {
                res.status(404).json({
                    success: false,
                    message: `No verified vote record found for reference number or Voter ID "${rawRef.trim()}".`,
                });
                return;
            }
            (0, response_1.sendSuccess)(res, vvpat);
        }
        catch (err) {
            next(err);
        }
    }
    async getBallotCandidates(req, res, next) {
        try {
            const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
            let electionId = req.query.electionId ? Number(req.query.electionId) : undefined;
            // If no electionId provided, auto-resolve the ACTIVE election for this constituency.
            // This prevents candidates from past/future elections from appearing on the ballot.
            if (!electionId && constituencyId) {
                const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
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
            }
            else if (!electionId) {
                // No constituency either — resolve the globally active election
                const { prisma } = await Promise.resolve().then(() => __importStar(require('../config/database')));
                const activeElection = await prisma.election.findFirst({
                    where: { status: 'ACTIVE' },
                    select: { id: true },
                });
                if (activeElection)
                    electionId = activeElection.id;
            }
            const candidates = await candidate_repository_1.candidateRepository.findAll(electionId, constituencyId);
            (0, response_1.sendSuccess)(res, candidates);
        }
        catch (err) {
            next(err);
        }
    }
    async getPublicStations(_req, res, next) {
        try {
            const stations = await polling_station_repository_1.pollingStationRepository.findAll();
            (0, response_1.sendSuccess)(res, stations);
        }
        catch (err) {
            next(err);
        }
    }
    async getPublicStationById(req, res, next) {
        try {
            const station = await polling_station_repository_1.pollingStationRepository.findById(Number(req.params.id));
            if (!station) {
                res.status(404).json({ success: false, message: 'Polling station not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, station);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VotingController = VotingController;
exports.votingController = new VotingController();
//# sourceMappingURL=voting.controller.js.map