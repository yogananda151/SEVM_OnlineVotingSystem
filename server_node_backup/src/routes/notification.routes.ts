import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { notificationController, settingsController } from '../controllers/notification.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

// ── Notifications ─────────────────────────────────────────────────────────────
// All notification routes require authentication; write routes require COMMISSIONER role.

router.get('/notifications', notificationController.getAll.bind(notificationController));
router.get('/notifications/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.post('/notifications', authorize(UserRole.COMMISSIONER), notificationController.create.bind(notificationController));
router.patch('/notifications/read-all', authorize(UserRole.COMMISSIONER), notificationController.markAllRead.bind(notificationController));
router.delete('/notifications', authorize(UserRole.COMMISSIONER), notificationController.clearRead.bind(notificationController));
router.patch('/notifications/:id/read', notificationController.markRead.bind(notificationController));
router.delete('/notifications/:id', authorize(UserRole.COMMISSIONER), notificationController.delete.bind(notificationController));

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', settingsController.getAll.bind(settingsController));
router.put('/settings/:key', authorize(UserRole.COMMISSIONER), settingsController.update.bind(settingsController));
router.post('/settings/bulk', authorize(UserRole.COMMISSIONER), settingsController.bulkUpdate.bind(settingsController));

export default router;
