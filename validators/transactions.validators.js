// validators/transactions.validators.js
import { body, query, param, validationResult } from 'express-validator';

export const createTxValidator = [
  body('type').isIn(['expense', 'income']).withMessage('type must be expense|income'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be > 0'),
  body('amount').custom(v => /^\d+(\.\d{1,2})?$/.test(String(v))).withMessage('amount max 2 decimals'),
  body('category').isString().trim().notEmpty().withMessage('category required'),
  body('date').isISO8601().withMessage('date must be ISO-8601 (YYYY-MM-DD or ISO string)'),
  body('descripcion').optional().isString().isLength({ max: 300 }).withMessage('note <= 300 chars'),
  handleValidationErrors,
];

export const patchTxValidator = [
  param('id').isString().notEmpty(),
  body('type').optional().isIn(['expense', 'income']),
  body('amount').optional().isFloat({ gt: 0 }),
  body('amount').optional().custom(v => /^\d+(\.\d{1,2})?$/.test(String(v))),
  body('category').optional().isString().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('descripcion').optional().isString().isLength({ max: 300 }),
  handleValidationErrors,
];

export const listTxValidator = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('category').optional().isString().trim().notEmpty(),
  query('type').optional().isIn(['expense', 'income']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('cursor').optional().isString(),
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      fields: result.array().map(e => ({ field: e.path, message: e.msg })),
    },
  });
}
