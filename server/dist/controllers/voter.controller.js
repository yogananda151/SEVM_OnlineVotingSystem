"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voterController = exports.VoterController = void 0;
const voter_repository_1 = require("../repositories/voter.repository");
const crypto_1 = require("../utils/crypto");
const response_1 = require("../utils/response");
const audit_repository_1 = require("../repositories/audit.repository");
const voter_excel_service_1 = require("../services/voter-excel.service");
const error_middleware_1 = require("../middleware/error.middleware");
const database_1 = require("../config/database");
class VoterController {
    async getAll(req, res, next) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const { pollingStationId, constituencyId, search } = req.query;
            const { data, total } = await voter_repository_1.voterRepository.findAll({
                pollingStationId: pollingStationId ? Number(pollingStationId) : undefined,
                constituencyId: constituencyId ? Number(constituencyId) : undefined,
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
                dateOfBirth: new Date(dateOfBirth),
                aadhaarHash: aadhaarNumber ? (0, crypto_1.hashAadhaar)(aadhaarNumber) : undefined,
            });
            await audit_repository_1.auditRepository.create({
                userId: req.user?.userId,
                action: 'CREATE',
                module: 'Voter',
                description: `Registered voter "${voter.fullName}" (${voter.voterId})`,
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
    async downloadTemplate(_req, res, next) {
        try {
            await voter_excel_service_1.voterExcelService.generateTemplate(res);
        }
        catch (err) {
            next(err);
        }
    }
    async uploadExcel(req, res, next) {
        try {
            if (!req.file) {
                throw new error_middleware_1.AppError('No Excel file uploaded. Please select an .xlsx or .csv file.', 400);
            }
            const defaultCId = req.body.defaultConstituencyId ? Number(req.body.defaultConstituencyId) : undefined;
            const defaultSId = req.body.defaultPollingStationId ? Number(req.body.defaultPollingStationId) : undefined;
            const result = await voter_excel_service_1.voterExcelService.parseAndValidateExcel(req.file.buffer, defaultCId, defaultSId);
            if (result.validVoters.length > 0) {
                await voter_repository_1.voterRepository.bulkCreate(result.validVoters);
                await audit_repository_1.auditRepository.create({
                    userId: req.user?.userId,
                    action: 'CREATE',
                    module: 'Voter',
                    description: `Excel imported ${result.validVoters.length} voters (${result.skippedDuplicatesCount} duplicates skipped)`,
                    ipAddress: req.ip,
                });
            }
            const message = result.validVoters.length > 0
                ? `Successfully imported ${result.validVoters.length} voters!${result.skippedDuplicatesCount > 0 ? ` (${result.skippedDuplicatesCount} duplicates were skipped).` : ''}`
                : `No new voters imported (${result.skippedDuplicatesCount} duplicate records were skipped).`;
            (0, response_1.sendSuccess)(res, {
                totalRows: result.totalRows,
                imported: result.validVoters.length,
                skippedDuplicates: result.skippedDuplicatesCount,
                duplicateVoterIds: result.duplicateVoterIds,
                errors: result.errors,
            }, message, 201);
        }
        catch (err) {
            next(err);
        }
    }
    async bulkCreate(req, res, next) {
        try {
            const { voters } = req.body;
            if (!Array.isArray(voters) || voters.length === 0) {
                res.status(400).json({ success: false, message: 'An array of voters is required.' });
                return;
            }
            const MAX_BULK = 1000;
            if (voters.length > MAX_BULK) {
                res.status(400).json({
                    success: false,
                    message: `Bulk import is limited to ${MAX_BULK} voters per request. You sent ${voters.length}.`,
                });
                return;
            }
            const errors = [];
            const seenVoterIds = new Set();
            const internalDuplicates = [];
            const uniquePayloadRows = [];
            voters.forEach((v, idx) => {
                const row = idx + 1;
                const voterIdStr = String(v.voterId || '').trim().toUpperCase();
                if (!v.fullName || typeof v.fullName !== 'string' || String(v.fullName).trim().length < 2) {
                    errors.push(`Row ${row}: fullName is required (min 2 characters).`);
                }
                if (!voterIdStr || voterIdStr.length < 5) {
                    errors.push(`Row ${row}: voterId is required (min 5 characters).`);
                }
                else if (seenVoterIds.has(voterIdStr)) {
                    internalDuplicates.push(voterIdStr);
                    return;
                }
                else {
                    seenVoterIds.add(voterIdStr);
                }
                if (!v.constituencyId || isNaN(Number(v.constituencyId))) {
                    errors.push(`Row ${row}: constituencyId must be a valid number.`);
                }
                if (!v.pollingStationId || isNaN(Number(v.pollingStationId))) {
                    errors.push(`Row ${row}: pollingStationId must be a valid number.`);
                }
                if (!v.dateOfBirth || isNaN(Date.parse(String(v.dateOfBirth)))) {
                    errors.push(`Row ${row}: dateOfBirth is required and must be a valid date.`);
                }
                if (!v.gender || !['Male', 'Female', 'Other'].includes(String(v.gender))) {
                    errors.push(`Row ${row}: gender must be one of Male, Female, Other.`);
                }
                if (!v.address || typeof v.address !== 'string' || String(v.address).trim().length < 5) {
                    errors.push(`Row ${row}: address is required (min 5 characters).`);
                }
                if (!v.serialNumber || isNaN(Number(v.serialNumber)) || Number(v.serialNumber) < 1) {
                    errors.push(`Row ${row}: serialNumber must be a positive integer.`);
                }
                uniquePayloadRows.push({
                    constituencyId: Number(v.constituencyId),
                    pollingStationId: Number(v.pollingStationId),
                    fullName: String(v.fullName || '').trim(),
                    voterId: voterIdStr,
                    aadhaarHash: v.aadhaarNumber ? (0, crypto_1.hashAadhaar)(String(v.aadhaarNumber).trim()) : undefined,
                    dateOfBirth: new Date(String(v.dateOfBirth)),
                    gender: String(v.gender),
                    address: String(v.address || '').trim(),
                    phone: v.phone ? String(v.phone).trim() : undefined,
                    serialNumber: Number(v.serialNumber),
                });
            });
            if (errors.length > 0 && uniquePayloadRows.length === 0) {
                res.status(422).json({
                    success: false,
                    message: `Validation failed for ${errors.length} row(s).`,
                    errors,
                });
                return;
            }
            const payloadVoterIds = uniquePayloadRows.map((r) => r.voterId);
            const existingInDb = await database_1.prisma.voter.findMany({
                where: { voterId: { in: payloadVoterIds }, deletedAt: null },
                select: { voterId: true },
            });
            const existingDbSet = new Set(existingInDb.map((e) => e.voterId.toUpperCase()));
            const finalToInsert = uniquePayloadRows.filter((r) => !existingDbSet.has(r.voterId));
            const allDuplicatesCount = internalDuplicates.length + existingInDb.length;
            let count = { count: 0 };
            if (finalToInsert.length > 0) {
                count = await voter_repository_1.voterRepository.bulkCreate(finalToInsert);
                await audit_repository_1.auditRepository.create({
                    userId: req.user?.userId,
                    action: 'CREATE',
                    module: 'Voter',
                    description: `Bulk imported ${count.count} voters (${allDuplicatesCount} duplicates skipped)`,
                    ipAddress: req.ip,
                });
            }
            (0, response_1.sendSuccess)(res, {
                count: count.count,
                imported: count.count,
                skippedDuplicates: allDuplicatesCount,
            }, `Successfully imported ${count.count} voters${allDuplicatesCount > 0 ? ` (${allDuplicatesCount} duplicates skipped)` : ''}`, 201);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.VoterController = VoterController;
exports.voterController = new VoterController();
//# sourceMappingURL=voter.controller.js.map