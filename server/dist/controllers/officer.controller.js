"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.officerController = exports.OfficerController = void 0;
const user_repository_1 = require("../repositories/user.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
class OfficerController {
    async getAll(_req, res, next) {
        try {
            (0, response_1.sendSuccess)(res, await user_repository_1.userRepository.findAllOfficers());
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const officer = await user_repository_1.userRepository.createOfficer(req.body);
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Officer',
                description: `Registered officer: ${req.body.fullName} (${req.body.email})`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, officer, 'Election officer registered', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const officer = await user_repository_1.userRepository.updateOfficer(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, officer, 'Officer updated');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await user_repository_1.userRepository.deleteOfficer(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Officer deleted');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.OfficerController = OfficerController;
exports.officerController = new OfficerController();
//# sourceMappingURL=officer.controller.js.map