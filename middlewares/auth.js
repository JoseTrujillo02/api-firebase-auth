// middlewares/auth.js
import { admin } from "../firebase.js";

export async function verifyIdToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: { code: "UNAUTHORIZED", message: "Missing Bearer token" } });
    }
    const idToken = auth.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, claims: decoded };
    req.idToken = idToken;
    next();
  } catch {
    return res
      .status(401)
      .json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
