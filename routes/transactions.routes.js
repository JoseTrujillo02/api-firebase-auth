// routes/transactions.routes.js
import { Router } from 'express';
import { verifyIdToken } from '../middlewares/auth.js';
import { createTxValidator, listTxValidator, patchTxValidator, deleteTxValidator } from '../validators/transactions.validators.js';
import { createTransaction, listTransactions, patchTransaction, deleteTransaction, listTransactionCategories } from '../controllers/transactions.controller.js';

const router = Router();
router.use(verifyIdToken);

router.post('/', createTxValidator, createTransaction);
router.get('/', listTxValidator, listTransactions);
router.patch('/:id', patchTxValidator, patchTransaction);
router.delete('/:id', deleteTxValidator, deleteTransaction);
router.get('/categories', listTransactionCategories);
export default router;
