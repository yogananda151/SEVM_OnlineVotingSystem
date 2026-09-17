"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateController = exports.CandidateController = void 0;
const candidate_repository_1 = require("../repositories/candidate.repository");
const election_repository_1 = require("../repositories/election.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
const error_middleware_1 = require("../middleware/error.middleware");
const client_1 = require("@prisma/client");
class CandidateController {
    async getAll(req, res, next) {
        try {
            const electionId = req.query.electionId ? Number(req.query.electionId) : undefined;
            const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
            (0, response_1.sendSuccess)(res, await candidate_repository_1.candidateRepository.findAll(electionId, constituencyId));
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const c = await candidate_repository_1.candidateRepository.findById(Number(req.params.id));
            if (!c) {
                throw new error_middleware_1.AppError('Candidate not found', 404);
            }
            (0, response_1.sendSuccess)(res, c);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const electionId = Number(req.body.electionId);
            const election = await election_repository_1.electionRepository.findById(electionId);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            if (election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError(`Cannot add candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`, 400);
            }
            const candidate = await candidate_repository_1.candidateRepository.create(req.body);
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Candidate',
                description: `Registered candidate: ${candidate.fullName}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, candidate, 'Candidate registered successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const candidate = await candidate_repository_1.candidateRepository.findById(id);
            if (!candidate)
                throw new error_middleware_1.AppError('Candidate not found.', 404);
            const election = await election_repository_1.electionRepository.findById(candidate.electionId);
            if (election && election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError(`Cannot edit candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`, 400);
            }
            const updated = await candidate_repository_1.candidateRepository.update(id, req.body);
            (0, response_1.sendSuccess)(res, updated, 'Candidate updated');
        }
        catch (err) {
            next(err);
        }
    }
    async uploadPhoto(req, res, next) {
        try {
            const id = Number(req.params.id);
            const candidate = await candidate_repository_1.candidateRepository.findById(id);
            if (!candidate)
                throw new error_middleware_1.AppError('Candidate not found.', 404);
            const election = await election_repository_1.electionRepository.findById(candidate.electionId);
            if (election && election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError(`Cannot update candidate photo. Election "${election.name}" is in "${election.status}" status (configuration is locked).`, 400);
            }
            if (!req.file) {
                throw new error_middleware_1.AppError('No file uploaded', 400);
            }
            const photoUrl = `/uploads/candidates/${req.file.filename}`;
            const updated = await candidate_repository_1.candidateRepository.update(id, { photoUrl });
            (0, response_1.sendSuccess)(res, updated, 'Photo uploaded successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Number(req.params.id);
            const candidate = await candidate_repository_1.candidateRepository.findById(id);
            if (!candidate)
                throw new error_middleware_1.AppError('Candidate not found.', 404);
            const election = await election_repository_1.electionRepository.findById(candidate.electionId);
            if (election && election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError(`Cannot remove candidate. Election "${election.name}" is in "${election.status}" status (configuration is locked).`, 400);
            }
            await candidate_repository_1.candidateRepository.delete(id);
            (0, response_1.sendSuccess)(res, null, 'Candidate removed');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CandidateController = CandidateController;
exports.candidateController = new CandidateController();
//# sourceMappingURL=candidate.controller.js.map