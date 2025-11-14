// controllers/auth.controller.js
import { signInWithPassword, signUpWithPassword, refreshIdToken } from '../services/firebaseIdentity.js';
import { admin } from '../firebase.js';

// Mapea códigos de Firebase a HTTP y mensajes
function mapFirebaseError(err) {
  const code = err.message || 'UNKNOWN';
  const map = {
    EMAIL_EXISTS:                { status: 409, msg: 'El correo ya está registrado' },
    OPERATION_NOT_ALLOWED:       { status: 400, msg: 'Proveedor email/password deshabilitado' },
    WEAK_PASSWORD:               { status: 422, msg: 'La contraseña es demasiado débil' },

    EMAIL_NOT_FOUND:             { status: 401, msg: 'Correo o contraseña incorrectos' },
    INVALID_PASSWORD:            { status: 401, msg: 'Correo o contraseña incorrectos' },
    USER_DISABLED:               { status: 403, msg: 'Este usuario ha sido deshabilitado' },

    TOO_MANY_ATTEMPTS_TRY_LATER: { status: 429, msg: 'Demasiados intentos, inténtalo de nuevo más tarde' },

    // Errores relacionados al refresh token
    INVALID_REFRESH_TOKEN:       { status: 401, msg: 'Tu sesión ya no es válida, inicia sesión de nuevo.' },
    TOKEN_EXPIRED:               { status: 401, msg: 'Tu sesión ha expirado, inicia sesión de nuevo.' },
    USER_NOT_FOUND:              { status: 401, msg: 'Tu cuenta ya no existe, inicia sesión de nuevo.' },
  };
  return map[code] || { status: err.status || 500, msg: code };
}

export async function register(req, res) {
  try {
    const { email, password, displayName } = req.body;
    const data = await signUpWithPassword(email, password, displayName);
    // data: { idToken, refreshToken, expiresIn, localId, email, displayName? }

    try {
      await admin
        .firestore()
        .collection('users')
        .doc(data.localId)
        .set(
          {
            email: data.email,
            displayName: displayName || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (_) {
      // opcional: loggear
    }

    return res.status(201).json({
      user: {
        uid: data.localId,
        email: data.email,
        displayName: displayName || null,
      },
      tokens: {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn),
      },
    });
  } catch (err) {
    const { status, msg } = mapFirebaseError(err);
    return res
      .status(status)
      .json({ error: { code: 'AUTH_REGISTER_ERROR', message: msg } });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const data = await signInWithPassword(email, password);
    // data: { idToken, refreshToken, expiresIn, localId, email, registered: true }

    let displayName = null;
    try {
      const user = await admin.auth().getUser(data.localId);
      displayName = user.displayName || null;
    } catch (_) {
      // opcional: loggear
    }

    return res.status(200).json({
      user: {
        uid: data.localId,
        email: data.email,
        displayName,
      },
      tokens: {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn),
      },
    });
  } catch (err) {
    const { status, msg } = mapFirebaseError(err);
    return res
      .status(status)
      .json({ error: { code: 'AUTH_LOGIN_ERROR', message: msg } });
  }
}

// 🔹 NUEVO: endpoint para refrescar tokens
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'AUTH_REFRESH_ERROR',
          message: 'Falta el refreshToken en la petición.',
        },
      });
    }

    const data = await refreshIdToken(refreshToken);
    // data: { id_token, refresh_token, expires_in, user_id, project_id, ... }

    let userInfo = { uid: data.user_id, email: null, displayName: null };
    try {
      const user = await admin.auth().getUser(data.user_id);
      userInfo.email = user.email || null;
      userInfo.displayName = user.displayName || null;
    } catch (_) {
      // si falla, igual devolvemos uid y tokens
    }

    return res.status(200).json({
      user: userInfo,
      tokens: {
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: Number(data.expires_in),
      },
    });
  } catch (err) {
    const { status, msg } = mapFirebaseError(err);
    return res
      .status(status)
      .json({ error: { code: 'AUTH_REFRESH_ERROR', message: msg } });
  }
}
