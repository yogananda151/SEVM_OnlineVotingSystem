import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, loginSchema } from '../middleware/validation.middleware';

const router = Router();

router.post('/login', validate(loginSchema), authController.login.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/profile', authenticate, authController.getProfile.bind(authController));

export default router;
