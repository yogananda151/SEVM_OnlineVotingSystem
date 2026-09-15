import { Router } from 'express';
import multer from 'multer';
import { voterController } from '../controllers/voter.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadVoterPhoto } from '../middleware/upload.middleware';
import { validate, createVoterSchema } from '../middleware/validation.middleware';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

const uploadExcelFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
}).single('file');

router.get('/', voterController.getAll.bind(voterController));
router.get('/template/excel', authorize(UserRole.COMMISSIONER), voterController.downloadTemplate.bind(voterController));
router.post('/upload-excel', authorize(UserRole.COMMISSIONER), uploadExcelFile, voterController.uploadExcel.bind(voterController));
router.post('/bulk', authorize(UserRole.COMMISSIONER), voterController.bulkCreate.bind(voterController));
router.get('/:id', voterController.getById.bind(voterController));
router.post('/', authorize(UserRole.COMMISSIONER), validate(createVoterSchema), voterController.create.bind(voterController));
router.put('/:id', authorize(UserRole.COMMISSIONER), voterController.update.bind(voterController));
router.post('/:id/photo', authorize(UserRole.COMMISSIONER), uploadVoterPhoto, voterController.uploadPhoto.bind(voterController));
router.delete('/:id', authorize(UserRole.COMMISSIONER), voterController.delete.bind(voterController));

export default router;

