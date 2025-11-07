// routes/account.routes.js
import { Router } from "express";
import { verifyIdToken } from "../middlewares/auth.js";
import { deleteMyAccount } from "../controllers/account.controller.js";

const router = Router();
router.use(verifyIdToken);

// DELETE /api/account/me
router.delete("/me", deleteMyAccount);

export default router;
