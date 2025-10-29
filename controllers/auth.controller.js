// controllers/auth.controller.js
import { signInWithPassword, signUpWithPassword } from '../services/firebaseIdentity.js';
import { admin } from '../firebase.js';

// Mapea códigos de Firebase a HTTP y mensajes
function mapFirebaseError(err) {
  const code = err.message || 'UNKNOWN';
  const map = {
    EMAIL_EXISTS: { status: 409, msg: 'El correo ya está registrado' },
    OPERATION_NOT_ALLOWED: { status: 400, msg: 'Proveedor email/password deshabilitado' },
    WEAK_PASSWORD : { status: 422, msg: 'Password demasiado débil' },

    EMAIL_NOT_FOUND: { status: 401, msg: 'Credenciales inválidas' },
    INVALID_PASSWORD: { status: 401, msg: 'Credenciales inválidas' },
    USER_DISABLED: { status: 403, msg: 'Usuario deshabilitado' },

    TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, msg: 'Demasiados intentos, intenta más tarde' },
  };
  return map[code] || { status: err.status || 500, msg: code };
}

export async function register(req, res) {
  try {
    const { email, password, displayName } = req.body;
    // Crea la cuenta y devuelve tokens inmediatamente
    const data = await signUpWithPassword(email, password, displayName);
    // data: { idToken, refreshToken, expiresIn, localId, email, displayName? }

    // Crea perfil base opcional en Firestore
    try {
      await admin.firestore()
        .collection('users').doc(data.localId)
        .set({ email: data.email, displayName: displayName || null, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (_) { /* opcional: log */ }

    return res.status(201).json({
      user: { uid: data.localId, email: data.email, displayName: displayName || null },
      tokens: { idToken: data.idToken, refreshToken: data.refreshToken, expiresIn: Number(data.expiresIn) },
    });
  } catch (err) {
    const { status, msg } = mapFirebaseError(err);
    return res.status(status).json({ error: { code: 'AUTH_REGISTER_ERROR', message: msg } });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const data = await signInWithPassword(email, password);
    // data: { idToken, refreshToken, expiresIn, localId, email, registered: true }

    // Puedes cargar displayName desde Firebase Auth (opcional)
    let displayName = null;
    try {
      const user = await admin.auth().getUser(data.localId);
      displayName = user.displayName || null;
    } catch (_) { /* opcional: log */ }

    return res.status(200).json({
      user: { uid: data.localId, email: data.email, displayName },
      tokens: { idToken: data.idToken, refreshToken: data.refreshToken, expiresIn: Number(data.expiresIn) },
    });
  } catch (err) {
    const { status, msg } = mapFirebaseError(err);
    return res.status(status).json({ error: { code: 'AUTH_LOGIN_ERROR', message: msg } });
  }
}
