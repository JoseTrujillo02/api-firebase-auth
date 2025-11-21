// routes/auth.routes.js
import { Router } from 'express';
import { register, login, refresh, changePassword
 } from '../controllers/auth.controller.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  changePasswordValidator
} from '../validators/auth.validators.js';
import { verifyIdToken } from '../middlewares/auth.js';
const router = Router();

router.post('/auth/register', registerValidator, register);
router.post('/auth/login',    loginValidator,    login);
// 🔹 NUEVO endpoint para refrescar tokens
router.post('/auth/refresh',  refreshTokenValidator, refresh);
router.post(
  '/auth/change-password',
  verifyIdToken,
  changePasswordValidator,
  changePassword
);

export default router;
