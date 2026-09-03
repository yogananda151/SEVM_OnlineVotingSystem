"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateController = exports.CandidateController = void 0;
const candidate_repository_1 = require("../repositories/candidate.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
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
                res.status(404).json({ success: false, message: 'Candidate not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, c);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
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
            const candidate = await candidate_repository_1.candidateRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, candidate, 'Candidate updated');
        }
        catch (err) {
            next(err);
        }
    }
    async uploadPhoto(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file uploaded' });
                return;
            }
            const photoUrl = `/uploads/candidates/${req.file.filename}`;
            const candidate = await candidate_repository_1.candidateRepository.update(Number(req.params.id), { photoUrl });
            (0, response_1.sendSuccess)(res, candidate, 'Photo uploaded successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await candidate_repository_1.candidateRepository.delete(Number(req.params.id));
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