import { Request, Response, NextFunction } from 'express';
import { constituencyRepository } from '../repositories/constituency.repository';
import { pollingStationRepository } from '../repositories/polling-station.repository';
import { sendSuccess } from '../utils/response';
import { auditRepository } from '../repositories/audit.repository';
import { MachineStatus } from '@prisma/client';

// ── Constituency Controller ───────────────────────────────────────

export class ConstituencyController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
      sendSuccess(res, await constituencyRepository.findAll(regionId));
    } catch (err) { next(err); }
  }

  async getActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const regionId = req.query.regionId ? Number(req.query.regionId) : undefined;
      sendSuccess(res, await constituencyRepository.findActive(regionId));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const con = await constituencyRepository.findById(Number(req.params.id));
      if (!con) { res.status(404).json({ success: false, message: 'Constituency not found' }); return; }
      sendSuccess(res, con);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const con = await constituencyRepository.create(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'Constituency',
        description: `Created constituency: ${con.name} (${con.code})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, con, 'Constituency created', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const con = await constituencyRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, con, 'Constituency updated');
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await constituencyRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Constituency deleted');
    } catch (err) { next(err); }
  }
}

export const constituencyController = new ConstituencyController();

// ── Polling Station Controller ────────────────────────────────────

export class PollingStationController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const constituencyId = req.query.constituencyId ? Number(req.query.constituencyId) : undefined;
      sendSuccess(res, await pollingStationRepository.findAll(constituencyId));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await pollingStationRepository.findById(Number(req.params.id));
      if (!station) { res.status(404).json({ success: false, message: 'Station not found' }); return; }
      sendSuccess(res, station);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await pollingStationRepository.create(req.body);
      await auditRepository.create({
        userId: req.user?.userId,
        action: 'CREATE',
        module: 'PollingStation',
        description: `Created station: ${station.name} (${station.code})`,
        ipAddress: req.ip,
      });
      sendSuccess(res, station, 'Polling station created', 201);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const station = await pollingStationRepository.update(Number(req.params.id), req.body);
      sendSuccess(res, station, 'Station updated');
    } catch (err) { next(err); }
  }

  async updateMachineStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, isPollingActive } = req.body;
      const id = Number(req.params.id);
      const station = await pollingStationRepository.updateMachineStatus(id, status as MachineStatus, isPollingActive);
      await auditRepository.create({
        userId: req.user?.userId,
        action: status === 'LOCKED' ? 'LOCK_MACHINE' : status === 'PAUSED' ? 'PAUSE_POLLING' : 'UNLOCK_MACHINE',
        module: 'PollingStation',
        description: `Machine status changed to ${status} at station ${id}`,
        ipAddress: req.ip,
      });
      sendSuccess(res, station, `Machine status updated to ${status}`);
    } catch (err) { next(err); }
  }

  async getTurnout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const turnout = await pollingStationRepository.getTurnout(Number(req.params.id));
      sendSuccess(res, turnout);
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await pollingStationRepository.delete(Number(req.params.id));
      sendSuccess(res, null, 'Station deleted');
    } catch (err) { next(err); }
  }
}

export const pollingStationController = new PollingStationController();
