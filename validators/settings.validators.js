// validators/settings.validators.js
import { body, validationResult } from "express-validator";

const ALLOWED = ["mensual", "quincenal", "semanal"];

export const putCapitalValidator = [
  body("amount")
    .exists().withMessage("amount requerido")
    .isFloat({ gt: 0 }).withMessage("amount debe ser > 0")
    .custom(v => /^\d+(\.\d{1,2})?$/.test(String(v))).withMessage("amount máx. 2 decimales"),
  body("periodicity")
    .exists().withMessage("periodicity requerida")
    .isString().withMessage("periodicity string")
    .custom(v => ALLOWED.includes(String(v).toLowerCase())).withMessage(`periodicity debe ser: ${ALLOWED.join(", ")}`),
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: "VALIDATION_ERROR",
      fields: r.array().map(e => ({ field: e.path, message: e.msg })),
    },
  });
}
