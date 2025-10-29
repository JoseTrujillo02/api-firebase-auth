// routes/transactions.routes.js
import { Router } from 'express';
import { verifyIdToken } from '../middlewares/auth.js';
import { createTxValidator, listTxValidator, patchTxValidator } from '../validators/transactions.validators.js';
import { createTransaction, listTransactions, patchTransaction } from '../controllers/transactions.controller.js';

const router = Router();
router.use(verifyIdToken);

router.post('/', createTxValidator, createTransaction);
router.get('/', listTxValidator, listTransactions);
router.patch('/:id', patchTxValidator, patchTransaction);

export default router;
