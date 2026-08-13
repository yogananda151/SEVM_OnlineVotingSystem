import { Router } from 'express';
import { voterController } from '../controllers/voter.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadVoterPhoto } from '../middleware/upload.middleware';
import { validate, createVoterSchema } from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', voterController.getAll.bind(voterController));
router.get('/:id', voterController.getById.bind(voterController));
router.post('/', authorize(UserRole.COMMISSIONER), validate(createVoterSchema), voterController.create.bind(voterController));
router.put('/:id', authorize(UserRole.COMMISSIONER), voterController.update.bind(voterController));
router.post('/:id/photo', authorize(UserRole.COMMISSIONER), uploadVoterPhoto, voterController.uploadPhoto.bind(voterController));
router.delete('/:id', authorize(UserRole.COMMISSIONER), voterController.delete.bind(voterController));

export default router;
