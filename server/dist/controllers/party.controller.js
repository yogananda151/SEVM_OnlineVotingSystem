"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.partyController = exports.PartyController = void 0;
const party_repository_1 = require("../repositories/party.repository");
const response_1 = require("../utils/response");
class PartyController {
    async getAll(_req, res, next) {
        try {
            (0, response_1.sendSuccess)(res, await party_repository_1.partyRepository.findAll());
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const party = await party_repository_1.partyRepository.findById(Number(req.params.id));
            if (!party) {
                res.status(404).json({ success: false, message: 'Party not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, party);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const party = await party_repository_1.partyRepository.create(req.body);
            (0, response_1.sendSuccess)(res, party, 'Party created', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const party = await party_repository_1.partyRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, party, 'Party updated');
        }
        catch (err) {
            next(err);
        }
    }
    async uploadSymbol(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No file uploaded' });
                return;
            }
            const symbolUrl = `/uploads/parties/${req.file.filename}`;
            const party = await party_repository_1.partyRepository.update(Number(req.params.id), { symbolUrl });
            (0, response_1.sendSuccess)(res, party, 'Symbol uploaded');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await party_repository_1.partyRepository.delete(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Party deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PartyController = PartyController;
exports.partyController = new PartyController();
//# sourceMappingURL=party.controller.js.map