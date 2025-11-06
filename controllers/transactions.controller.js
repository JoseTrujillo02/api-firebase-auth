// controllers/transactions.controller.js
import { admin, db } from '../firebase.js';

const TX_PATH = (uid) => db.collection('users').doc(uid).collection('transactions');
const CAPITAL_REF = (uid) => db.collection('users').doc(uid).collection('settings').doc('capital');

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
    const capRef = CAPITAL_REF(uid);
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

    // Transacción Firestore: crea tx + actualiza capital (atómico)
    await db.runTransaction(async (t) => {
      const capSnap = await t.get(capRef);
      if (!capSnap.exists) {
        const err = new Error('CAPITAL_NOT_CONFIGURED');
        err.status = 409;
        throw err;
      }
      const cap = capSnap.data();
      const current = Number(cap.amount) || 0;
      const change = payload.type === 'income' ? payload.amount : -payload.amount;
      const next = Math.max(0, current + change); // evita negativo por reglas

      // Guardar la transacción con snapshot del capital restante
      t.set(txRef, { ...payload, remainingCapital: next });

      // Actualizar capital
      t.update(capRef, {
        amount: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Leer doc para responder con timestamps resueltos
    const saved = await txRef.get();
    const data = saved.data();
    return res
      .status(201)
      .json({
        id: saved.id,
        ...data,
        date: data.date.toDate().toISOString(),
      });
  } catch (err) {
    if (err.message === 'INVALID_DATE') {
      return res.status(422).json({ error: { code: 'INVALID_DATE', message: 'date must be ISO-8601' } });
    }
    if (err.message === 'CAPITAL_NOT_CONFIGURED' || err.status === 409) {
      return res.status(409).json({ error: { code: 'CAPITAL_NOT_CONFIGURED', message: 'Configura tu capital en /api/settings/capital antes de registrar transacciones.' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
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
    const { type, amount, category, date, descripcion, source } = req.body;

    const ref = TX_PATH(uid).doc(id);
    const capRef = CAPITAL_REF(uid);

    // Transacción Firestore: leer tx + capital, calcular delta, actualizar ambos
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) {
        const err = new Error('NOT_FOUND');
        err.status = 404;
        throw err;
      }
      const old = snap.data();

      // Aplica cambios (parciales) en memoria
      const newType = (type !== undefined) ? type : old.type;
      const newAmount = (amount !== undefined) ? Number(amount) : old.amount;
      const newCategory = (category !== undefined) ? String(category).trim() : old.category;
      const newDate = (date !== undefined) ? parseIsoToTimestamp(date) : old.date;
      const newDescripcion = (descripcion !== undefined) ? (descripcion ? String(descripcion).trim() : null) : old.descripcion;
      const newSource = (source !== undefined) ? source : (old.source || 'manual');

      // Delta sobre capital = (signo_nuevo * monto_nuevo) - (signo_viejo * monto_viejo)
      const signOld = old.type === 'income' ? 1 : -1;
      const signNew = newType === 'income' ? 1 : -1;
      const delta = (signNew * newAmount) - (signOld * old.amount);

      // Lee capital
      const capSnap = await t.get(capRef);
      if (!capSnap.exists) {
        const err = new Error('CAPITAL_NOT_CONFIGURED');
        err.status = 409;
        throw err;
      }
      const cap = capSnap.data();
      const current = Number(cap.amount) || 0;
      const next = Math.max(0, current + delta); // evita negativo (reglas)

      // Actualiza transacción
      t.update(ref, {
        type: newType,
        amount: newAmount,
        category: newCategory,
        date: newDate,
        descripcion: newDescripcion,
        source: newSource,
        remainingCapital: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Actualiza capital
      t.update(capRef, {
        amount: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Leer doc actualizado para responder con timestamps resueltos
    const updated = await ref.get();
    const data = updated.data();
    return res.status(200).json({
      id: updated.id,
      ...data,
      date: data.date.toDate().toISOString(),
    });
  } catch (err) {
    if (err.message === 'INVALID_DATE') {
      return res.status(422).json({ error: { code: 'INVALID_DATE', message: 'date must be ISO-8601' } });
    }
    if (err.message === 'NOT_FOUND' || err.status === 404) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
    }
    if (err.message === 'CAPITAL_NOT_CONFIGURED' || err.status === 409) {
      return res.status(409).json({ error: { code: 'CAPITAL_NOT_CONFIGURED', message: 'Configura tu capital en /api/settings/capital antes de editar transacciones.' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL', message: err.message } });
  }
}
