// services/firebaseIdentity.js
const BASE = 'https://identitytoolkit.googleapis.com/v1';

function endpoint(path) {
  const key = process.env.FIREBASE_WEB_API_KEY;
  if (!key) throw new Error('MISSING_WEB_API_KEY');
  return `${BASE}${path}?key=${key}`;
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
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
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

// Registro con email/password -> idToken / refreshToken (usuario nuevo)
export async function signUpWithPassword(email, password, displayName) {
  const url = endpoint('/accounts:signUp');
  return fetchJson(url, {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName, returnSecureToken: true }),
  });
}
