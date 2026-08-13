"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollingStationController = exports.PollingStationController = exports.constituencyController = exports.ConstituencyController = void 0;
const constituency_repository_1 = require("../repositories/constituency.repository");
const polling_station_repository_1 = require("../repositories/polling-station.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
// ── Constituency Controller ───────────────────────────────────────
class ConstituencyController {
    async getAll(req, res, next) {
        try {
            const electionId = req.query.electionId ? Number(req.query.electionId) : undefined;
            (0, response_1.sendSuccess)(res, await constituency_repository_1.constituencyRepository.findAll(electionId));
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const con = await constituency_repository_1.constituencyRepository.findById(Number(req.params.id));
            if (!con) {
                res.status(404).json({ success: false, message: 'Constituency not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, con);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const con = await constituency_repository_1.constituencyRepository.create(req.body);
            await audit_repository_1.auditRepository.create({ userId: req.user?.userId, action: 'CREATE', module: 'Constituency', description: `Created: ${con.name}`, ipAddress: req.ip });
            (0, response_1.sendSuccess)(res, con, 'Constituency created', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const con = await constituency_repository_1.constituencyRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, con, 'Constituency updated');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await constituency_repository_1.constituencyRepository.delete(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Constituency deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ConstituencyController = ConstituencyController;
exports.constituencyController = new ConstituencyController();
// ── Polling Station Controller ────────────────────────────────────
class PollingStationController {
    async getAll(req, res, next) {
        try {
            const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
            (0, response_1.sendSuccess)(res, await polling_station_repository_1.pollingStationRepository.findAll(constituencyId));
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const station = await polling_station_repository_1.pollingStationRepository.findById(Number(req.params.id));
            if (!station) {
                res.status(404).json({ success: false, message: 'Station not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, station);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const station = await polling_station_repository_1.pollingStationRepository.create(req.body);
            await audit_repository_1.auditRepository.create({ userId: req.user?.userId, action: 'CREATE', module: 'PollingStation', description: `Created station: ${station.name}`, ipAddress: req.ip });
            (0, response_1.sendSuccess)(res, station, 'Polling station created', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const station = await polling_station_repository_1.pollingStationRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, station, 'Station updated');
        }
        catch (err) {
            next(err);
        }
    }
    async updateMachineStatus(req, res, next) {
        try {
            const { status, isPollingActive } = req.body;
            const id = Number(req.params.id);
            const station = await polling_station_repository_1.pollingStationRepository.updateMachineStatus(id, status, isPollingActive);
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: status === 'LOCKED' ? 'LOCK_MACHINE' : status === 'PAUSED' ? 'PAUSE_POLLING' : 'UNLOCK_MACHINE',
                module: 'PollingStation',
                description: `Machine status changed to ${status} at station ${id}`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, station, `Machine status updated to ${status}`);
        }
        catch (err) {
            next(err);
        }
    }
    async getTurnout(req, res, next) {
        try {
            const turnout = await polling_station_repository_1.pollingStationRepository.getTurnout(Number(req.params.id));
            (0, response_1.sendSuccess)(res, turnout);
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await polling_station_repository_1.pollingStationRepository.delete(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Station deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PollingStationController = PollingStationController;
exports.pollingStationController = new PollingStationController();
//# sourceMappingURL=location.controller.js.map