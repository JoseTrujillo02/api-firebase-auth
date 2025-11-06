// routes/settings.routes.js
import { Router } from "express";
import { verifyIdToken } from "../middlewares/auth.js";
import { getCapital, putCapital } from "../controllers/settings.controller.js";
import { putCapitalValidator } from "../validators/settings.validators.js";

const router = Router();
router.use(verifyIdToken);

router.get("/capital", getCapital);
router.put("/capital", putCapitalValidator, putCapital);

export default router;
