import { Request, Response, NextFunction } from 'express';
import { voterRepository } from '../repositories/voter.repository';
import { hashAadhaar } from '../utils/crypto';
import { sendSuccess, sendPaginated } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';

export class VoterController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { pollingStationId, constituencyId, hasVoted, search } = req.query;

      const { data, total } = await voterRepository.findAll({
        pollingStationId: pollingStationId ? Number(pollingStationId) : undefined,
        constituencyId: constituencyId ? Number(constituencyId) : undefined,
        hasVoted: hasVoted !== undefined ? hasVoted === 'true' : undefined,
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
        aadhaarHash: aadhaarNumber ? hashAadhaar(aadhaarNumber) : undefined,
        dateOfBirth: new Date(dateOfBirth),
      });
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Voter',
        description: `Registered voter: ${voter.fullName} (${voter.voterId})`,
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

  async bulkCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { voters } = req.body;
      if (!Array.isArray(voters) || voters.length === 0) {
        res.status(400).json({ success: false, message: 'An array of voters is required.' });
        return;
      }

      const MAX_BULK = 500;
      if (voters.length > MAX_BULK) {
        res.status(400).json({
          success: false,
          message: `Bulk import is limited to ${MAX_BULK} voters per request. You sent ${voters.length}.`,
        });
        return;
      }

      const errors: string[] = [];
      const formatted = voters.map((v: Record<string, unknown>, idx: number) => {
        const row = idx + 1;
        if (!v.fullName || typeof v.fullName !== 'string' || String(v.fullName).trim().length < 2) {
          errors.push(`Row ${row}: fullName is required (min 2 characters).`);
        }
        if (!v.voterId || typeof v.voterId !== 'string' || String(v.voterId).trim().length < 5) {
          errors.push(`Row ${row}: voterId is required (min 5 characters).`);
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

        return {
          constituencyId: Number(v.constituencyId),
          pollingStationId: Number(v.pollingStationId),
          fullName: String(v.fullName || '').trim(),
          voterId: String(v.voterId || '').trim(),
          aadhaarHash: v.aadhaarNumber ? hashAadhaar(String(v.aadhaarNumber).trim()) : undefined,
          dateOfBirth: new Date(String(v.dateOfBirth)),
          gender: String(v.gender),
          address: String(v.address || '').trim(),
          phone: v.phone ? String(v.phone).trim() : undefined,
          serialNumber: Number(v.serialNumber),
        };
      });

      if (errors.length > 0) {
        res.status(422).json({
          success: false,
          message: `Validation failed for ${errors.length} row(s).`,
          errors,
        });
        return;
      }

      const count = await voterRepository.bulkCreate(formatted);

      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Voter',
        description: `Bulk imported ${count.count} voters`,
        ipAddress: req.ip,
      });

      sendSuccess(res, count, `Successfully imported ${count.count} voters`, 201);
    } catch (err) { next(err); }
  }
}

export const voterController = new VoterController();
