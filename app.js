import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";
import transactionsRoutes from './routes/transactions.routes.js';
import helmet from 'helmet'; import rateLimit from 'express-rate-limit';
import settingsroutes from './routes/settings.routes.js';
import accountRoutes from "./routes/account.routes.js";
const app = express();

app.use(cors());
app.use(express.json());

app.use(helmet());
const authLimiter = rateLimit({ windowMs: 60_000, max: 5, standardHeaders: true, legacyHeaders: false });

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Firebase Auth API",
      version: "1.0.0",
      description: "API REST de autenticación con Firebase",
    },
  },
  apis: ["./routes/*.js"],
};
app.use('/api/auth', authLimiter);
app.use("/api/account", accountRoutes);
app.use("/api", authRoutes);
app.use("/api/settings", settingsroutes);
app.use('/api/transactions', transactionsRoutes);
app.get('/health', (req, res) => res.status(200).json({ ok: true }));
app.get("/", (req, res) => res.send("🔥 API Firebase Auth funcionando 🔥"));

export default app;
