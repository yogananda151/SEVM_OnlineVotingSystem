import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendPaginated } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

// ── Notifications Controller ──────────────────────────────────────────────────

export class NotificationController {
  /** GET /api/notifications  — paginated, optional ?isRead=true|false */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Number(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (req.query.isRead === 'true') where.isRead = true;
      if (req.query.isRead === 'false') where.isRead = false;

      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          include: { election: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({ where }),
      ]);

      sendPaginated(res, data, total, page, limit);
    } catch (err) { next(err); }
  }

  /** GET /api/notifications/unread-count */
  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await prisma.notification.count({ where: { isRead: false } });
      sendSuccess(res, { count });
    } catch (err) { next(err); }
  }

  /** PATCH /api/notifications/:id/read */
  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: Number(req.params.id) },
      });
      if (!notification) throw new AppError('Notification not found', 404);

      const updated = await prisma.notification.update({
        where: { id: Number(req.params.id) },
        data: { isRead: true },
      });
      sendSuccess(res, updated);
    } catch (err) { next(err); }
  }

  /** PATCH /api/notifications/read-all */
  async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (err) { next(err); }
  }

  /** DELETE /api/notifications/:id */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: Number(req.params.id) },
      });
      if (!notification) throw new AppError('Notification not found', 404);

      await prisma.notification.delete({ where: { id: Number(req.params.id) } });
      sendSuccess(res, { message: 'Notification deleted' });
    } catch (err) { next(err); }
  }

  /** DELETE /api/notifications  — clear all read notifications */
  async clearRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { count } = await prisma.notification.deleteMany({ where: { isRead: true } });
      sendSuccess(res, { message: `Cleared ${count} read notifications` });
    } catch (err) { next(err); }
  }

  /** POST /api/notifications  — create a system notification (Commissioner only) */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, message, type = 'info', electionId } = req.body;
      if (!title || !message) throw new AppError('title and message are required', 400);

      const notification = await prisma.notification.create({
        data: {
          title,
          message,
          type,
          ...(electionId ? { election: { connect: { id: Number(electionId) } } } : {}),
        },
      });
      sendSuccess(res, notification, 'Notification created', 201);
    } catch (err) { next(err); }
  }
}

// ── Settings Controller ───────────────────────────────────────────────────────

export class SettingsController {
  /** GET /api/settings  — all settings grouped */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.setting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });

      // Group by `group` field
      const grouped = settings.reduce((acc: Record<string, typeof settings>, s) => {
        const g = s.group || 'general';
        if (!acc[g]) acc[g] = [];
        acc[g].push(s);
        return acc;
      }, {});

      sendSuccess(res, { settings, grouped });
    } catch (err) { next(err); }
  }

  /** PUT /api/settings/:key  — update a single setting by key */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined || value === null) throw new AppError('value is required', 400);

      const setting = await prisma.setting.findUnique({ where: { key } });
      if (!setting) throw new AppError(`Setting "${key}" not found`, 404);

      const updated = await prisma.setting.update({ where: { key }, data: { value: String(value) } });
      sendSuccess(res, updated);
    } catch (err) { next(err); }
  }

  /** POST /api/settings/bulk  — upsert multiple settings at once */
  async bulkUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { updates } = req.body as { updates: Array<{ key: string; value: string }> };
      if (!Array.isArray(updates) || updates.length === 0) {
        throw new AppError('updates array is required', 400);
      }

      const results = await Promise.all(
        updates.map(({ key, value }) =>
          prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value), label: key, group: 'general' },
          }),
        ),
      );
      sendSuccess(res, results);
    } catch (err) { next(err); }
  }
}

export const notificationController = new NotificationController();
export const settingsController = new SettingsController();
