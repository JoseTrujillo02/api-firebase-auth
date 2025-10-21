import express from "express";
import { body, validationResult } from "express-validator";
import admin from "../firebase.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("El nombre es requerido"),
    body("email").isEmail().withMessage("Email inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { name, email, password } = req.body;

    try {
      const user = await admin.auth().createUser({
        displayName: name,
        email,
        password,
      });

      res.status(201).json({
        message: "Usuario creado exitosamente",
        user: {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Email inválido"),
    body("password").notEmpty().withMessage("Contraseña requerida"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    const { email } = req.body;

    try {
      const user = await admin.auth().getUserByEmail(email);
      res.json({ message: "Login exitoso", user });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
