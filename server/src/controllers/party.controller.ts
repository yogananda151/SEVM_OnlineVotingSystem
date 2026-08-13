import { Request, Response, NextFunction } from 'express';
import { partyRepository } from '../repositories/party.repository';
import { sendSuccess } from '../utils/response';

export class PartyController {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { sendSuccess(res, await partyRepository.findAll()); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const party = await partyRepository.findById(Number(req.params.id));
      if (!party) { res.status(404).json({ success: false, message: 'Party not found' }); return; }
      sendSuccess(res, party);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const party = await partyRepository.create(req.body);
      sendSuccess(res, party, 'Party created', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const party = await partyRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, party, 'Party updated');
    } catch (err) { next(err); }
  }

  async uploadSymbol(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: 'No file uploaded' }); return; }
      const symbolUrl = `/uploads/parties/${req.file.filename}`;
      const party = await partyRepository.update(Number(req.params.id), { symbolUrl });
      sendSuccess(res, party, 'Symbol uploaded');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await partyRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Party deleted');
    } catch (err) { next(err); }
  }
}

export const partyController = new PartyController();
