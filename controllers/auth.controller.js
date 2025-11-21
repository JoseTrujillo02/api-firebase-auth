// controllers/auth.controller.js
import {
  signInWithPassword,
  signUpWithPassword,
  refreshIdToken,
  updatePasswordWithIdToken,
} from '../services/firebaseIdentity.js';
import { admin } from '../firebase.js';

// Registro de usuario
export async function register(req, res) {
  try {
    const { email, password, displayName } = req.body;

    // Crea usuario en Firebase Identity
    const data = await signUpWithPassword(email, password, displayName);
    // data: { idToken, refreshToken, expiresIn, localId, email, displayName? }

    // Crea perfil base en Firestore (opcional)
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
    } catch (e) {
      // opcional: log
      console.error('Error creando perfil en Firestore:', e);
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
    console.error('Error en register:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: {
        code: 'AUTH_REGISTER_ERROR',
        message:
          'No se pudo completar el registro. Revisa tus datos o inténtalo de nuevo más tarde.',
        detail: err.message || 'UNKNOWN_ERROR',
      },
    });
  }
}

// Login de usuario
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const data = await signInWithPassword(email, password);
    // data: { idToken, refreshToken, expiresIn, localId, email, registered: true }

    let displayName = null;
    try {
      const user = await admin.auth().getUser(data.localId);
      displayName = user.displayName || null;
    } catch (e) {
      // opcional: log
      console.error('Error obteniendo displayName en login:', e);
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
    console.error('Error en login:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: {
        code: 'AUTH_LOGIN_ERROR',
        message: 'No se pudo iniciar sesión. Revisa tu correo y contraseña.',
        detail: err.message || 'UNKNOWN_ERROR',
      },
    });
  }
}

// Refresh de tokens usando el refreshToken
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

    let userInfo = {
      uid: data.user_id,
      email: null,
      displayName: null,
    };

    try {
      const user = await admin.auth().getUser(data.user_id);
      userInfo.email = user.email || null;
      userInfo.displayName = user.displayName || null;
    } catch (e) {
      console.error('Error obteniendo usuario en refresh:', e);
      // Si falla, igual devolvemos uid y tokens
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
    console.error('Error en refresh:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: {
        code: 'AUTH_REFRESH_ERROR',
        message:
          'No se pudo renovar la sesión. Intenta iniciar sesión de nuevo.',
        detail: err.message || 'UNKNOWN_ERROR',
      },
    });
  }
}

// 🔹 NUEVO: Cambiar contraseña estando logueado (sin pedir contraseña actual)
export async function changePassword(req, res) {
  try {
    // Tomamos el token del header Authorization: Bearer <idToken>
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message:
            'Falta el token de acceso en la cabecera Authorization (Bearer <token>).',
        },
      });
    }

    const idToken = authHeader.split(' ')[1];
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        error: {
          code: 'AUTH_CHANGE_PASSWORD_ERROR',
          message: 'Debes enviar la nueva contraseña en el campo "newPassword".',
        },
      });
    }

    // Aquí ya asumimos que la validación de longitud/formato la hace el validator
    const data = await updatePasswordWithIdToken(idToken, newPassword);
    // data: { idToken, refreshToken, expiresIn, localId, email, ... }

    return res.status(200).json({
      user: {
        uid: data.localId,
        email: data.email ?? null,
      },
      tokens: {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: Number(data.expiresIn),
      },
    });
  } catch (err) {
    console.error('Error en changePassword:', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: {
        code: 'AUTH_CHANGE_PASSWORD_ERROR',
        message:
          'No se pudo cambiar la contraseña. Inténtalo de nuevo más tarde.',
        detail: err.message || 'UNKNOWN_ERROR',
      },
    });
  }
}
