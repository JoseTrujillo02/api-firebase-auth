// controllers/settings.controller.js
import { admin, db } from "../firebase.js";

const CAPITAL_REF = (uid) => db
  .collection("users").doc(uid)
  .collection("settings").doc("capital");

// Normaliza periodicidad a minúsculas sin acentos (por si acaso)
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
    return res.status(500).json({ error: { code: "INTERNAL", message: err.message } });
  }
}

export async function putCapital(req, res) {
  try {
    const { uid } = req.user;
    const { amount, periodicity } = req.body;

    const payload = {
      amount: Number(amount),
      periodicity: normalizePeriodicity(periodicity), // "mensual" | "quincenal" | "semanal"
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = CAPITAL_REF(uid);
    await ref.set(payload, { merge: true });

    const saved = await ref.get();
    const d = saved.data();

    return res.status(200).json({
      amount: d.amount,
      periodicity: d.periodicity,
      updatedAt: d.updatedAt?.toDate()?.toISOString() ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: { code: "INTERNAL", message: err.message } });
  }
}
