"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electionController = exports.ElectionController = void 0;
const election_repository_1 = require("../repositories/election.repository");
const election_constituency_repository_1 = require("../repositories/election-constituency.repository");
const vote_repository_1 = require("../repositories/vote.repository");
const audit_repository_1 = require("../repositories/audit.repository");
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middleware/error.middleware");
const database_1 = require("../config/database");
// Valid status transitions
const VALID_TRANSITIONS = {
    DRAFT: ['SCHEDULED'],
    SCHEDULED: ['ACTIVE', 'DRAFT'],
    ACTIVE: ['PAUSED', 'CLOSED'],
    PAUSED: ['ACTIVE', 'CLOSED'],
    CLOSED: ['RESULTS_PUBLISHED'],
    RESULTS_PUBLISHED: [],
};
class ElectionController {
    async getAll(req, res, next) {
        try {
            (0, response_1.sendSuccess)(res, await election_repository_1.electionRepository.findAll());
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
    async getReadiness(req, res, next) {
        try {
            const readiness = await election_repository_1.electionRepository.getReadiness(Number(req.params.id));
            if (!readiness) {
                (0, response_1.sendError)(res, 'Election not found', 404);
                return;
            }
            (0, response_1.sendSuccess)(res, readiness);
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
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            // Enforce valid transitions
            const allowed = VALID_TRANSITIONS[election.status] ?? [];
            if (!allowed.includes(status)) {
                throw new error_middleware_1.AppError(`Cannot change election from "${election.status}" to "${status}". ` +
                    `Valid transitions from ${election.status}: ${allowed.join(', ') || 'none'}.`, 400);
            }
            // Before activating or scheduling, check readiness
            if (status === client_1.ElectionStatus.ACTIVE || status === client_1.ElectionStatus.SCHEDULED) {
                const readiness = await election_repository_1.electionRepository.getReadiness(id);
                if (readiness && !readiness.isReady) {
                    throw new error_middleware_1.AppError(`Cannot activate election. Issues found:\n• ${readiness.issues.join('\n• ')}`, 400);
                }
            }
            const data = { status };
            if (status === client_1.ElectionStatus.ACTIVE)
                data.startTime = new Date();
            if (status === client_1.ElectionStatus.CLOSED)
                data.endTime = new Date();
            const updated = await election_repository_1.electionRepository.update(id, data);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'UPDATE',
                module: 'Election',
                description: `Election status changed to: ${status}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, updated, `Election status updated to ${status}`);
        }
        catch (err) {
            next(err);
        }
    }
    async getConstituencies(req, res, next) {
        try {
            const links = await election_constituency_repository_1.electionConstituencyRepository.findByElection(Number(req.params.id));
            (0, response_1.sendSuccess)(res, links);
        }
        catch (err) {
            next(err);
        }
    }
    async setConstituencies(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { constituencyIds } = req.body;
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            if (election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError('Cannot change constituencies after the election has been activated.', 400);
            }
            const links = await election_constituency_repository_1.electionConstituencyRepository.setConstituencies(id, constituencyIds);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'UPDATE',
                module: 'Election',
                description: `Updated election constituencies: ${constituencyIds.length} selected`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, links, 'Election constituencies updated');
        }
        catch (err) {
            next(err);
        }
    }
    // ── Election Officer ───────────────────────────────────────────────
    async getOfficer(req, res, next) {
        try {
            const id = Number(req.params.id);
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election) {
                (0, response_1.sendError)(res, 'Election not found', 404);
                return;
            }
            (0, response_1.sendSuccess)(res, election.officer ?? null, 'Election officer retrieved');
        }
        catch (err) {
            next(err);
        }
    }
    async setOfficer(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { officerId } = req.body;
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            if (election.status !== client_1.ElectionStatus.DRAFT && election.status !== client_1.ElectionStatus.SCHEDULED) {
                throw new error_middleware_1.AppError('Cannot change the Election Officer after the election has been activated.', 400);
            }
            if (officerId !== null && officerId !== undefined) {
                // Validate officer exists and is active
                const officer = await database_1.prisma.electionOfficer.findUnique({
                    where: { id: officerId },
                    include: { user: { select: { isActive: true } } },
                });
                if (!officer || officer.deletedAt) {
                    throw new error_middleware_1.AppError('The selected officer does not exist. Please select a valid Election Officer.', 404);
                }
                if (!officer.user.isActive) {
                    throw new error_middleware_1.AppError('The selected Election Officer is inactive and cannot be assigned. Please select an active officer.', 400);
                }
            }
            const updated = await election_repository_1.electionRepository.setOfficer(id, officerId ?? null);
            await audit_repository_1.auditRepository.create({
                userId: req.user.userId,
                electionId: id,
                action: 'UPDATE',
                module: 'Election',
                description: officerId
                    ? `Assigned Election Officer ID ${officerId} to election: ${election.name}`
                    : `Removed Election Officer from election: ${election.name}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, updated.officer, 'Election officer assigned successfully');
        }
        catch (err) {
            next(err);
        }
    }
    // ── Results ────────────────────────────────────────────────────────
    async publishResults(req, res, next) {
        try {
            const id = Number(req.params.id);
            const election = await election_repository_1.electionRepository.findById(id);
            if (!election)
                throw new error_middleware_1.AppError('Election not found.', 404);
            if (election.status !== client_1.ElectionStatus.CLOSED) {
                throw new error_middleware_1.AppError('Only closed elections can have results published.', 400);
            }
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