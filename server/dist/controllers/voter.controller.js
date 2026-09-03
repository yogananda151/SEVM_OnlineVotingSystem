"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voterController = exports.VoterController = void 0;
const voter_repository_1 = require("../repositories/voter.repository");
const crypto_1 = require("../utils/crypto");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
class VoterController {
    async getAll(req, res, next) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const { pollingStationId, constituencyId, hasVoted, search } = req.query;
            const { data, total } = await voter_repository_1.voterRepository.findAll({
                pollingStationId: pollingStationId ? Number(pollingStationId) : undefined,
                constituencyId: constituencyId ? Number(constituencyId) : undefined,
                hasVoted: hasVoted !== undefined ? hasVoted === 'true' : undefined,
                search: search,
                page,
                limit,
            });
            (0, response_1.sendPaginated)(res, data, total, page, limit);
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const voter = await voter_repository_1.voterRepository.findById(Number(req.params.id));
            if (!voter) {
                res.status(404).json({ success: false, message: 'Voter not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, voter);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const { aadhaarNumber, dateOfBirth, ...rest } = req.body;
            const voter = await voter_repository_1.voterRepository.create({
                ...rest,
                aadhaarHash: aadhaarNumber ? (0, crypto_1.hashAadhaar)(aadhaarNumber) : undefined,
                dateOfBirth: new Date(dateOfBirth),
            });
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Voter',
                description: `Registered voter: ${voter.fullName} (${voter.voterId})`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, voter, 'Voter registered successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const voter = await voter_repository_1.voterRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, voter, 'Voter updated');
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
            const photoUrl = `/uploads/voters/${req.file.filename}`;
            const voter = await voter_repository_1.voterRepository.update(Number(req.params.id), { photoUrl });
            (0, response_1.sendSuccess)(res, voter, 'Photo uploaded successfully');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await voter_repository_1.voterRepository.delete(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Voter deleted');
        }
        catch (err) {
            next(err);
        }
    }
    async bulkCreate(req, res, next) {
        try {
            const { voters } = req.body;
            if (!Array.isArray(voters) || voters.length === 0) {
                res.status(400).json({ success: false, message: 'Array of voters is required.' });
                return;
            }
            const formatted = voters.map((v) => ({
                constituencyId: Number(v.constituencyId),
                pollingStationId: Number(v.pollingStationId),
                fullName: String(v.fullName || '').trim(),
                voterId: String(v.voterId || '').trim(),
                aadhaarHash: v.aadhaarNumber ? (0, crypto_1.hashAadhaar)(String(v.aadhaarNumber).trim()) : undefined,
                dateOfBirth: new Date(v.dateOfBirth || '2000-01-01'),
                gender: v.gender || 'Other',
                address: v.address || 'Address not specified',
                phone: v.phone ? String(v.phone).trim() : undefined,
                serialNumber: Number(v.serialNumber) || 1,
            }));
            const count = await voter_repository_1.voterRepository.bulkCreate(formatted);
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Voter',
                description: `Bulk imported ${count.count} voters`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, count, `Successfully imported ${count.count} voters`, 201);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VoterController = VoterController;
exports.voterController = new VoterController();
//# sourceMappingURL=voter.controller.js.map