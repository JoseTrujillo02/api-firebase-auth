// routes/auth.routes.js
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator } from '../validators/auth.validators.js';

const router = Router();

router.post('/auth/register', registerValidator, register);
router.post('/auth/login',    loginValidator,    login);

export default router;
