// controllers/account.controller.js
import { admin, db } from "../firebase.js";

// Intenta usar el borrado recursivo nativo si está disponible (Admin SDK moderno)
async function recursiveDeleteUserDoc(userDocRef) {
  const fs = admin.firestore();
  if (typeof fs.recursiveDelete === "function") {
    await fs.recursiveDelete(userDocRef);
    return;
  }
  // Fallback manual: borra subcolecciones y el doc
  const writer = db.bulkWriter();

  async function deleteDocRecursively(docRef) {
    const subs = await docRef.listCollections();
    for (const col of subs) {
      const snap = await col.get();
      for (const doc of snap.docs) {
        await deleteDocRecursively(doc.ref);
        writer.delete(doc.ref);
      }
    }
    writer.delete(docRef);
  }

  await deleteDocRecursively(userDocRef);
  await writer.close();
}

export async function deleteMyAccount(req, res) {
  try {
    const { uid, claims } = req.user;
    const { confirm } = req.body || {};

    // 1) Confirmación explícita
    if (confirm !== "DELETE") {
      return res.status(422).json({
        error: { code: "CONFIRMATION_REQUIRED", message: 'Send { "confirm": "DELETE" } in body' }
      });
    }

    // 2) Inicio de sesión reciente (5 min)
    const now = Math.floor(Date.now() / 1000);
    const authTime = claims?.auth_time ?? 0;
    if (now - authTime > 300) {
      return res.status(401).json({
        error: { code: "RECENT_LOGIN_REQUIRED", message: "Please login again to delete your account." }
      });
    }

    // 3) Revocar tokens (para invalidar ID tokens próximos si se verifican con checkRevoked)
    await admin.auth().revokeRefreshTokens(uid);

    // 4) Borrar datos en Firestore (users/{uid} + subcolecciones)
    const userDocRef = db.collection("users").doc(uid);
    await recursiveDeleteUserDoc(userDocRef);

    // 5) Borrar usuario en Firebase Auth
    await admin.auth().deleteUser(uid);

    return res.status(200).json({
      status: "DELETED",
      uid,
      deletedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: { code: "INTERNAL", message: err.message } });
  }
}
