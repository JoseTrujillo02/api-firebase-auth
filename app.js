import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());

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

app.use("/api", authRoutes);

app.get("/", (req, res) => res.send("🔥 API Firebase Auth funcionando 🔥"));

export default app;
