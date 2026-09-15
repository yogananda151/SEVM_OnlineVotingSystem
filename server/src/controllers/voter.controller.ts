import { Request, Response, NextFunction } from 'express';
import { voterRepository } from '../repositories/voter.repository';
import { hashAadhaar } from '../utils/crypto';
import { sendSuccess, sendPaginated } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';
import { voterExcelService } from '../services/voter-excel.service';
import { AppError } from '../middleware/error.middleware';
import { prisma } from '../config/database';

export class VoterController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { pollingStationId, constituencyId, search } = req.query;

      const { data, total } = await voterRepository.findAll({
        pollingStationId: pollingStationId ? Number(pollingStationId) : undefined,
        constituencyId: constituencyId ? Number(constituencyId) : undefined,
        search: search as string | undefined,
        page,
        limit,
      });

      sendPaginated(res, data, total, page, limit);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voter = await voterRepository.findById(Number(req.params.id));
      if (!voter) { res.status(404).json({ success: false, message: 'Voter not found' }); return; }
      sendSuccess(res, voter);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { aadhaarNumber, dateOfBirth, ...rest } = req.body;
      const voter = await voterRepository.create({
        ...rest,
        dateOfBirth: new Date(dateOfBirth),
        aadhaarHash: aadhaarNumber ? hashAadhaar(aadhaarNumber) : undefined,
      });

      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Voter',
        description: `Registered voter "${voter.fullName}" (${voter.voterId})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, voter, 'Voter registered successfully', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voter = await voterRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, voter, 'Voter updated');
    } catch (err) { next(err); }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const photoUrl = `/uploads/voters/${req.file.filename}`;
      const voter = await voterRepository.update(Number(req.params.id), { photoUrl });
      sendSuccess(res, voter, 'Photo uploaded successfully');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await voterRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Voter deleted');
    } catch (err) { next(err); }
  }

  async downloadTemplate(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await voterExcelService.generateTemplate(res);
    } catch (err) { next(err); }
  }

  async uploadExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No Excel file uploaded. Please select an .xlsx or .csv file.', 400);
      }

      const defaultCId = req.body.defaultConstituencyId ? Number(req.body.defaultConstituencyId) : undefined;
      const defaultSId = req.body.defaultPollingStationId ? Number(req.body.defaultPollingStationId) : undefined;

      const result = await voterExcelService.parseAndValidateExcel(req.file.buffer, defaultCId, defaultSId);

      if (result.validVoters.length > 0) {
        await voterRepository.bulkCreate(result.validVoters);

        await auditRepository.create({
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

      sendSuccess(
        res,
        {
          totalRows: result.totalRows,
          imported: result.validVoters.length,
          skippedDuplicates: result.skippedDuplicatesCount,
          duplicateVoterIds: result.duplicateVoterIds,
          errors: result.errors,
        },
        message,
        201,
      );
    } catch (err) { next(err); }
  }

  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const errors: string[] = [];
      const seenVoterIds = new Set<string>();
      const internalDuplicates: string[] = [];
      const uniquePayloadRows: any[] = [];

      voters.forEach((v: Record<string, unknown>, idx: number) => {
        const row = idx + 1;
        const voterIdStr = String(v.voterId || '').trim().toUpperCase();

        if (!v.fullName || typeof v.fullName !== 'string' || String(v.fullName).trim().length < 2) {
          errors.push(`Row ${row}: fullName is required (min 2 characters).`);
        }
        if (!voterIdStr || voterIdStr.length < 5) {
          errors.push(`Row ${row}: voterId is required (min 5 characters).`);
        } else if (seenVoterIds.has(voterIdStr)) {
          internalDuplicates.push(voterIdStr);
          return;
        } else {
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
          aadhaarHash: v.aadhaarNumber ? hashAadhaar(String(v.aadhaarNumber).trim()) : undefined,
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
      const existingInDb = await prisma.voter.findMany({
        where: { voterId: { in: payloadVoterIds }, deletedAt: null },
        select: { voterId: true },
      });
      const existingDbSet = new Set(existingInDb.map((e) => e.voterId.toUpperCase()));

      const finalToInsert = uniquePayloadRows.filter((r) => !existingDbSet.has(r.voterId));
      const allDuplicatesCount = internalDuplicates.length + existingInDb.length;

      let count = { count: 0 };
      if (finalToInsert.length > 0) {
        count = await voterRepository.bulkCreate(finalToInsert);

        await auditRepository.create({
          userId: req.user?.userId,
          action: 'CREATE',
          module: 'Voter',
          description: `Bulk imported ${count.count} voters (${allDuplicatesCount} duplicates skipped)`,
          ipAddress: req.ip,
        });
      }

      sendSuccess(
        res,
        {
          count: count.count,
          imported: count.count,
          skippedDuplicates: allDuplicatesCount,
        },
        `Successfully imported ${count.count} voters${allDuplicatesCount > 0 ? ` (${allDuplicatesCount} duplicates skipped)` : ''}`,
        201,
      );
    } catch (err) { next(err); }
  }
}

export const voterController = new VoterController();
