"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionController = exports.ElectionController = void 0;
const election_repository_1 = require("../repositories/election.repository");
const vote_repository_1 = require("../repositories/vote.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middleware/error.middleware");
class ElectionController {
    async getAll(req, res, next) {
        try {
            const elections = await election_repository_1.electionRepository.findAll();
            (0, response_1.sendSuccess)(res, elections);
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const election = await election_repository_1.electionRepository.findById(Number(req.params.id));
            if (!election) {
                (0, response_1.sendError)(res, 'Election not found', 404);
                return;
            }
            (0, response_1.sendSuccess)(res, election);
        }
        catch (err) {
            next(err);
        }
    }
    async getStats(req, res, next) {
        try {
            const stats = await election_repository_1.electionRepository.getStats(Number(req.params.id));
            (0, response_1.sendSuccess)(res, stats);
        }
        catch (err) {
            next(err);
        }
    }
    async getDashboardStats(req, res, next) {
        try {
            const stats = await vote_repository_1.voteRepository.getDashboardStats();
            (0, response_1.sendSuccess)(res, stats);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const election = await election_repository_1.electionRepository.create({
                ...req.body,
                scheduledDate: new Date(req.body.scheduledDate),
            });
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: election.id,
                action: 'CREATE',
                module: 'Election',
                description: `Created election: ${election.name}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, election, 'Election created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = { ...req.body };
            if (data.scheduledDate)
                data.scheduledDate = new Date(data.scheduledDate);
            const election = await election_repository_1.electionRepository.update(id, data);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'UPDATE',
                module: 'Election',
                description: `Updated election: ${election.name}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, election, 'Election updated');
        }
        catch (err) {
            next(err);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { status } = req.body;
            if (!Object.values(client_1.ElectionStatus).includes(status)) {
                throw new error_middleware_1.AppError('Invalid election status.', 400);
            }
            const data = { status };
            if (status === client_1.ElectionStatus.ACTIVE)
                data.startTime = new Date();
            if (status === client_1.ElectionStatus.CLOSED)
                data.endTime = new Date();
            const election = await election_repository_1.electionRepository.update(id, data);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'UPDATE',
                module: 'Election',
                description: `Election status changed to: ${status}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, election, `Election status updated to ${status}`);
        }
        catch (err) {
            next(err);
        }
    }
    async publishResults(req, res, next) {
        try {
            const id = Number(req.params.id);
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            if (election.status !== client_1.ElectionStatus.CLOSED)
                throw new error_middleware_1.AppError('Only closed elections can have results published.', 400);
            await election_repository_1.electionRepository.update(id, {
                status: client_1.ElectionStatus.RESULTS_PUBLISHED,
                isResultPublished: true,
            });
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'PUBLISH_RESULTS',
                module: 'Election',
                description: `Results published for election: ${election.name}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, null, 'Results published successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async getResults(req, res, next) {
        try {
            const id = Number(req.params.id);
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            // Only show results if published (or commissioner requests)
            if (!election.isResultPublished && req.user?.role !== 'COMMISSIONER') {
                throw new error_middleware_1.AppError('Results have not been published yet.', 403);
            }
            const results = await vote_repository_1.voteRepository.getResults(id);
            (0, response_1.sendSuccess)(res, { election, results });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Number(req.params.id);
            await election_repository_1.electionRepository.delete(id);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'DELETE',
                module: 'Election',
                description: `Deleted election ID: ${id}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, null, 'Election deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ElectionController = ElectionController;
exports.electionController = new ElectionController();
//# sourceMappingURL=election.controller.js.map