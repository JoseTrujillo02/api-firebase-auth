// services/firebaseIdentity.js

// Base de Firebase Identity (login / registro)
const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1';
// Base de Secure Token (refresh de tokens)
const SECURETOKEN_BASE = 'https://securetoken.googleapis.com/v1';

function getApiKey() {
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) throw new Error('MISSING_WEB_API_KEY');
  return key;
}

// Endpoint para operaciones de identidad (signIn, signUp, etc.)
function endpoint(path) {
  const key = getApiKey();
  return `${IDENTITY_BASE}${path}?key=${key}`;
}

// Endpoint para operaciones de secure token (refresh)
function tokenEndpoint(path) {
  const key = getApiKey();
  return `${SECURETOKEN_BASE}${path}?key=${key}`;
}

// Helper genérico para hacer fetch y parsear JSON
async function fetchJson(url, options = {}) {
  const headers = { ...(options.headers || {}) };

  // Si no se especifica Content-Type, usamos JSON por defecto
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const code = data?.error?.message || `HTTP_${res.status}`;
    const err = new Error(code);
    err.status = res.status;
    err.raw = data;
    throw err;
  }

  return data;
}

// Login con email/password -> idToken / refreshToken
export async function signInWithPassword(email, password) {
  const url = endpoint('/accounts:signInWithPassword');
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
}

// Registro con email/password -> idToken / refreshToken (usuario nuevo)
export async function signUpWithPassword(email, password, displayName) {
  const url = endpoint('/accounts:signUp');
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      displayName,
      returnSecureToken: true,
    }),
  });
}

// 🔹 NUEVO: Refresh de ID Token usando el refreshToken
export async function refreshIdToken(refreshToken) {
  const url = tokenEndpoint('/token');

  // Para el endpoint de securetoken, Firebase recomienda x-www-form-urlencoded
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }).toString();

  return fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}
