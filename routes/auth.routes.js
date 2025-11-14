// routes/auth.routes.js
import { Router } from 'express';
import { register, login, refresh } from '../controllers/auth.controller.js';
import {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/auth/register', registerValidator, register);
router.post('/auth/login',    loginValidator,    login);
// 🔹 NUEVO endpoint para refrescar tokens
router.post('/auth/refresh',  refreshTokenValidator, refresh);

export default router;
