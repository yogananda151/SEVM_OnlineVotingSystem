"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateController = exports.CandidateController = void 0;
const candidate_repository_1 = require("../repositories/candidate.repository");
const election_repository_1 = require("../repositories/election.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
const error_middleware_1 = require("../middleware/error.middleware");
const client_1 = require("@prisma/client");
const candidate_excel_service_1 = require("../services/candidate-excel.service");
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
    async downloadTemplate(req, res, next) {
        try {
            await candidate_excel_service_1.candidateExcelService.generateTemplate(res);
        }
        catch (err) {
            next(err);
        }
    }
    async uploadExcel(req, res, next) {
        try {
            if (!req.file)
                throw new error_middleware_1.AppError('No file uploaded', 400);
            const electionId = Number(req.body.electionId);
            if (!electionId)
                throw new error_middleware_1.AppError('electionId is required', 400);
            const defaultConstituencyId = req.body.defaultConstituencyId ? Number(req.body.defaultConstituencyId) : undefined;
            const result = await candidate_excel_service_1.candidateExcelService.parseAndValidateExcel(req.file.buffer, electionId, defaultConstituencyId);
            if (result.validCandidates.length > 0) {
                for (const candidate of result.validCandidates) {
                    await candidate_repository_1.candidateRepository.create(candidate);
                }
                await audit_repository_1.auditRepository.create({
                    userId: req.user?.userId,
                    action: 'CREATE',
                    module: 'Candidate',
                    description: `Bulk imported ${result.validCandidates.length} candidates for election ${electionId}`,
                    ipAddress: req.ip,
                });
            }
            (0, response_1.sendSuccess)(res, result, 'Excel file processed successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async bulkCreate(req, res, next) {
        try {
            const { candidates } = req.body;
            if (!Array.isArray(candidates) || candidates.length === 0) {
                throw new error_middleware_1.AppError('No candidates provided', 400);
            }
            const electionId = candidates[0]?.electionId;
            const created = [];
            for (const candidate of candidates) {
                created.push(await candidate_repository_1.candidateRepository.create(candidate));
            }
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Candidate',
                description: `Bulk registered ${created.length} candidates via manual json`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, { count: created.length }, 'Candidates registered successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.CandidateController = CandidateController;
exports.candidateController = new CandidateController();
//# sourceMappingURL=candidate.controller.js.map