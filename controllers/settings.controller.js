// controllers/settings.controller.js
import { admin, db } from "../firebase.js";

const CAPITAL_REF = (uid) =>
  db.collection("users").doc(uid).collection("settings").doc("capital");
const TX_COL = (uid) =>
  db.collection("users").doc(uid).collection("transactions");

// Normaliza periodicidad a minúsculas
function normalizePeriodicity(p) {
  return String(p).toLowerCase();
}

export async function getCapital(req, res) {
  try {
    const { uid } = req.user;
    const ref = CAPITAL_REF(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(200).json({
        amount: null,
        periodicity: null,
        exists: false,
      });
    }

    const data = snap.data();
    return res.status(200).json({
      amount: data.amount,
      periodicity: data.periodicity,
      updatedAt: data.updatedAt?.toDate()?.toISOString() ?? null,
      exists: true,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL", message: err.message } });
  }
}

/**
 * PUT /api/settings/capital
 * Semántica: INCREMENTO (top-up) del capital existente.
 * - Si el doc NO existe: crea con amount = body.amount y periodicity requerida.
 * - Si el doc SÍ existe: suma body.amount al capital actual. 'periodicity' es opcional (si viene, se actualiza).
 */
export async function putCapital(req, res) {
  try {
    const { uid } = req.user;
    const { amount, periodicity } = req.body;

    const delta = Number(amount); // incremento solicitado (validado > 0 en el validador)
    const ref = CAPITAL_REF(uid);

    let wasCreated = false;
    let beforeAmount = 0;
    let afterAmount = 0;
    let finalPeriodicity = null;

    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);

      // Caso: no existe capital -> crear (requires periodicity)
      if (!snap.exists) {
        if (!periodicity) {
          const e = new Error("PERIODICITY_REQUIRED_ON_CREATE");
          e.status = 422;
          throw e;
        }
        wasCreated = true;
        const payload = {
          amount: delta,
          periodicity: normalizePeriodicity(periodicity),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        t.set(ref, payload, { merge: false });
        beforeAmount = 0;
        afterAmount = delta;
        finalPeriodicity = payload.periodicity;
        return;
      }

      // Caso: existe capital -> sumar delta
      const data = snap.data();
      beforeAmount = Number(data.amount) || 0;
      const next = beforeAmount + delta;

      const update = {
        amount: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // periodicity es OPCIONAL en updates; si viene, se actualiza
      if (periodicity) {
        update.periodicity = normalizePeriodicity(periodicity);
      }

      t.update(ref, update);
      afterAmount = next;
      finalPeriodicity = periodicity ? normalizePeriodicity(periodicity) : data.periodicity;
    });

    // Leer para resolver updatedAt
    const saved = await ref.get();
    const updatedAtIso = saved.data().updatedAt?.toDate()?.toISOString() ?? null;

    return res.status(wasCreated ? 201 : 200).json({
      amount: afterAmount,
      periodicity: finalPeriodicity,
      updatedAt: updatedAtIso,
      meta: {
        previousAmount: beforeAmount,
        deltaAdded: delta,
        created: wasCreated,
      },
    });
  } catch (err) {
    if (err.message === "PERIODICITY_REQUIRED_ON_CREATE" || err.status === 422) {
      return res.status(422).json({
        error: {
          code: "PERIODICITY_REQUIRED_ON_CREATE",
          message:
            "Al crear capital por primera vez debes enviar 'periodicity' (mensual|quincenal|semanal).",
        },
      });
    }
    return res
      .status(500)
      .json({ error: { code: "INTERNAL", message: err.message } });
  }
}

/**
 * DELETE /api/settings/capital
 * Borra:
 * 1) El documento de capital (si existe)
 * 2) TODAS las transacciones del usuario
 * Requiere body: { "confirm": "DELETE" }
 */
export async function deleteCapital(req, res) {
  try {
    const { uid } = req.user;
    const capitalRef = CAPITAL_REF(uid);
    const txCol = TX_COL(uid);

    // 1) Eliminar capital primero (bloquea la creación de nuevas transacciones en tu API)
    const capSnap = await capitalRef.get();
    const capitalExists = capSnap.exists;
    if (capitalExists) {
      await capitalRef.delete();
    }

    // 2) Eliminar TODAS las transacciones en lotes paginados
    let deletedCount = 0;
    const pageSize = 500;
    // borrado iterativo hasta vaciar la colección
    while (true) {
      const snap = await txCol.limit(pageSize).get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      deletedCount += snap.size;
    }

    return res.status(200).json({
      status: "CAPITAL_AND_TRANSACTIONS_DELETED",
      capitalExisted: capitalExists,
      transactionsDeleted: deletedCount,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: { code: "INTERNAL", message: err.message } });
  }
}
