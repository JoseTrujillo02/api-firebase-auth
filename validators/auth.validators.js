// validators/auth.validators.js
import { body, validationResult } from 'express-validator';

export const registerValidator = [
  body('email').isEmail().withMessage('email inválido'),
  body('password').isString().isLength({ min: 6 }).withMessage('password min 6'),
  body('displayName').optional().isString().isLength({ max: 120 }),
  handleValidationErrors,
];

export const loginValidator = [
  body('email').isEmail().withMessage('email inválido'),
  body('password').isString().isLength({ min: 6 }).withMessage('password min 6'),
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      fields: r.array().map(e => ({ field: e.path, message: e.msg })),
    },
  });
}
