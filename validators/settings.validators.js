// validators/settings.validators.js
import { body, validationResult } from "express-validator";

const ALLOWED = ["mensual", "quincenal", "semanal"];

export const putCapitalValidator = [
  body("amount")
    .exists().withMessage("Por favor escribe cuánto dinero quieres establecer.")
    .isFloat({ gt: 0 }).withMessage("La cantidad debe ser un número mayor a 0.")
    .custom((v) => /^\d+(\.\d{1,2})?$/.test(String(v)))
    .withMessage("La cantidad solo puede tener hasta 2 decimales."),
  
  // periodicity opcional (solo obligatoria al crear por primera vez)
  body("periodicity")
    .optional()
    .isString().withMessage("La periodicidad debe ser texto (por ejemplo: mensual).")
    .custom((v) => ALLOWED.includes(String(v).toLowerCase()))
    .withMessage(`La periodicidad debe ser una de estas: ${ALLOWED.join(", ")}.`),

  handleValidationErrors,
];

export const deleteCapitalValidator = [
  body("confirm")
    .exists().withMessage("Para eliminar tu configuración debes enviar el campo 'confirm'.")
    .custom((v) => v === "DELETE")
    .withMessage('Para confirmar la eliminación escribe exactamente: "DELETE"'),
  
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();

  return res.status(422).json({
    error: {
      code: "VALIDATION_ERROR",
      fields: r.array().map((e) => ({
        field: e.path,
        message: e.msg, // mensajes más amigables
      })),
    },
  });
}