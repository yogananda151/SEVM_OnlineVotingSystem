"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.regionController = exports.RegionController = void 0;
const region_repository_1 = require("../repositories/region.repository");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
class RegionController {
    async getAll(req, res, next) {
        try {
            (0, response_1.sendSuccess)(res, await region_repository_1.regionRepository.findAll());
        }
        catch (err) {
            next(err);
        }
    }
    async getById(req, res, next) {
        try {
            const region = await region_repository_1.regionRepository.findById(Number(req.params.id));
            if (!region) {
                res.status(404).json({ success: false, message: 'Region not found' });
                return;
            }
            (0, response_1.sendSuccess)(res, region);
        }
        catch (err) {
            next(err);
        }
    }
    async create(req, res, next) {
        try {
            const region = await region_repository_1.regionRepository.create(req.body);
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Region',
                description: `Created region: ${region.name} (${region.code})`,
                ipAddress: req.ip,
            });
            (0, response_1.sendSuccess)(res, region, 'Region created successfully', 201);
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const region = await region_repository_1.regionRepository.update(Number(req.params.id), req.body);
            (0, response_1.sendSuccess)(res, region, 'Region updated');
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            await region_repository_1.regionRepository.delete(Number(req.params.id));
            (0, response_1.sendSuccess)(res, null, 'Region deactivated');
        }
        catch (err) {
            next(err);
        }
    }
}
exports.RegionController = RegionController;
exports.regionController = new RegionController();
//# sourceMappingURL=region.controller.js.map