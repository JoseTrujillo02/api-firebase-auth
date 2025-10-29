// controllers/transactions.controller.js
import { admin, db } from '../firebase.js';
const TX_PATH = (uid) => db.collection('users').doc(uid).collection('transactions');

// --- helpers ---
function parseIsoToTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error('INVALID_DATE');
  return admin.firestore.Timestamp.fromDate(d);
}
function encodeCursor(date, id) {
  const payload = { d: date.toMillis(), id };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function decodeCursor(cursor) {
  try {
    const { d, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return { date: admin.firestore.Timestamp.fromMillis(d), id };
  } catch {
    throw new Error('BAD_CURSOR');
  }
}

// --- handlers ---
export async function createTransaction(req, res) {
  try {
    const { uid } = req.user;
    const { type, amount, category, date, descripcion } = req.body;

    const txRef = TX_PATH(uid).doc();
    const payload = {
      type,
      amount: Number(amount),
      category: String(category).trim(),
      date: parseIsoToTimestamp(date),
      descripcion: descripcion ? String(descripcion).trim() : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: req.body.source || 'manual',
    };

    await txRef.set(payload);
    const saved = await txRef.get();
    const data = saved.data();
    return res.status(201).json({ id: saved.id, ...data, date: data.date.toDate().toISOString() });
  } catch (err) {
    const code = err.message === 'INVALID_DATE' ? 422 : 500;
    return res.status(code).json({ error: { code: code === 422 ? 'INVALID_DATE' : 'INTERNAL', message: err.message } });
  }
}

export async function listTransactions(req, res) {
  try {
    const { uid } = req.user;
    const { from, to, category, type, cursor, limit } = req.query;
    const pageSize = Math.min(Math.max(parseInt(limit || '20', 10), 1), 100);

    let q = TX_PATH(uid).orderBy('date', 'desc').orderBy(admin.firestore.FieldPath.documentId(), 'desc');

    if (type) q = q.where('type', '==', type);
    if (category) q = q.where('category', '==', String(category).trim());
    if (from) q = q.where('date', '>=', parseIsoToTimestamp(from));
    if (to)   q = q.where('date', '<=', parseIsoToTimestamp(to));
    if (cursor) {
      const c = decodeCursor(cursor);
      q = q.startAfter(c.date, c.id);
    }

    q = q.limit(pageSize);
    const snap = await q.get();

    const items = snap.docs.map(doc => {
      const d = doc.data();
      return { id: doc.id, ...d, date: d.date.toDate().toISOString() };
    });

    // nextCursor
    let nextCursor;
    if (snap.size === pageSize) {
      const last = snap.docs[snap.docs.length - 1];
      const d = last.data();
      nextCursor = encodeCursor(d.date, last.id);
    }

    return res.status(200).json({ items, nextCursor });
  } catch (err) {
    const code = err.message === 'BAD_CURSOR' ? 400 : 500;
    return res.status(code).json({ error: { code: code === 400 ? 'BAD_CURSOR' : 'INTERNAL', message: err.message } });
  }
}

export async function patchTransaction(req, res) {
  try {
    const { uid } = req.user;
    const { id } = req.params;
    const { type, amount, category, date, descripcion } = req.body;

    const ref = TX_PATH(uid).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });

    const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (type !== undefined) update.type = type;
    if (amount !== undefined) update.amount = Number(amount);
    if (category !== undefined) update.category = String(category).trim();
    if (date !== undefined) update.date = parseIsoToTimestamp(date);
    if (descripcion !== undefined) update.descripcion = descripcion ? String(descripcion).trim() : null;

    await ref.update(update);
    const updated = await ref.get();
    const data = updated.data();
    return res.status(200).json({ id: updated.id, ...data, date: data.date.toDate().toISOString() });
  } catch (err) {
    const code = err.message === 'INVALID_DATE' ? 422 : 500;
    return res.status(code).json({ error: { code: code === 422 ? 'INVALID_DATE' : 'INTERNAL', message: err.message } });
  }
}
