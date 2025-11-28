// validators/auth.validators.js  
import { body, validationResult } from 'express-validator';
import { admin } from '../firebase.js'; // 👈 Para validar si el correo ya está registrado en Firebase

/* =========================
   Lista de palabras prohibidas (versión resumida)
========================= */
const BANNED_WORDS = [
  'puta','puto','pendejo','pendeja','cabron','cabrona','cabrón',
  'verga','chingar','chingada','chingado','mierda','cagada','chingatumadre', 
  'imbecil','tarado','retrasado','subnormal','anormal','mongolo',
  'idiota','estupido','marica','maricon','maricón','joto','culero',
  'zorra','perra','coño','vagina','pene','follar','coger','mamar',
  'chupar','sexo','porno','pornografia','orgasmo','masturbar',
  'culo','ojete','bolas','cojones','huevos','tetas','violar','violador',
  'fuck','fucked','fucker','fucking','motherfucker','bitch','bitches',
  'asshole','shit','cunt','whore','slut','dick','cock','pussy','penis',
  'rape','rapist','nigger','nigga','faggot','dyke','retard',
  '<script','</script','javascript','eval','exec',
  'drop table','union select','delete from','insert into','or 1=1','admin--',
];

function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const BANNED_SET = new Set(BANNED_WORDS.map(normalize));
const BANNED_SET_4PLUS = new Set(
  BANNED_WORDS
    .filter(w => normalize(w).length >= 4)
    .map(normalize)
);

/* =========================
   Helpers sencillos
========================= */
function leetNormalize(str) {
  return String(str)
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1|!|\|/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$|5/g, 's')
    .replace(/7|\+/g, 't')
    .replace(/2/g, 'z');
}

function hasControlChars(str) {
  return /[\x00-\x1F\x7F]/.test(str);
}

function hasHtmlTagsOrScripts(str) {
  const s = str.toLowerCase();
  return (
    /<[^>]+>/.test(s) ||
    s.includes('<script') ||
    s.includes('</script') ||
    s.includes('javascript:') ||
    s.includes('onerror=') ||
    s.includes('onload=')
  );
}

const SQL_TOKENS = new Set([
  'select','insert','update','delete','drop','union','alter','create','truncate',
  'table','database','schema','grant','revoke','execute','exec','where','from',
  'waitfor','sleep','benchmark','admin','root','username','password',
]);

function hasSuspiciousSQLTokens(str) {
  const tokens = normalize(leetNormalize(str))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.some(t => SQL_TOKENS.has(t));
}

/* =========================
   Filtros de palabras prohibidas
========================= */

// Para email (solo parte local)
function emailHasBannedLenient(email) {
  const s = normalize(email);
  const [local] = s.split('@');
  if (!local) return false;

  const clean = leetNormalize(local).replace(/[^a-z0-9]+/g, '');

  for (const banned of BANNED_SET_4PLUS) {
    if (clean.includes(banned)) return true;
  }
  return false;
}

// Para nombres y contraseñas
function textHasBanned(text) {
  const s = normalize(leetNormalize(text));
  const tokens = s.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(tok => BANNED_SET.has(tok));
}

/* =========================
   VALIDACIÓN DE NOMBRE
   - Acepta 1 o varios nombres
   - Solo letras y espacios
   - Permite acentos y ñ
========================= */
function isHumanNameStrict(name) {
  if (typeof name !== 'string') return false;

  const raw = name.trim();

  if (raw.length < 2 || raw.length > 120) return false;

  // PERMITE 1 o más palabras, SOLO letras+espacios
  const allowed = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/u;
  if (!allowed.test(raw)) return false;

  // No números ni símbolos
  if (/[0-9]/.test(raw)) return false;

  // No groserías
  if (textHasBanned(raw)) return false;

  // No scripts
  if (hasControlChars(raw) || hasHtmlTagsOrScripts(raw)) return false;

  return true;
}

/* =========================
   Validadores
========================= */

// REGISTER
export const registerValidator = [
  body('email')
    .isEmail().withMessage('Por favor escribe un correo válido, por ejemplo usuario@correo.com.')
    .bail()
    .custom(async (value) => {
      if (typeof value !== 'string') {
        throw new Error('Por favor escribe un correo válido, por ejemplo usuario@correo.com.');
      }

      if (hasControlChars(value)) {
        throw new Error('Tu correo contiene símbolos no permitidos.');
      }

      if (hasHtmlTagsOrScripts(value)) {
        throw new Error('Tu correo contiene texto no permitido por seguridad.');
      }

      if (hasSuspiciousSQLTokens(value)) {
        throw new Error('Tu correo contiene palabras no permitidas.');
      }

      if (emailHasBannedLenient(value)) {
        throw new Error('Tu correo no puede contener groserías en la parte del nombre.');
      }

      if (value.length < 6) {
        throw new Error('Tu correo es demasiado corto. Revisa que esté bien escrito.');
      }

      if (value.length > 254) {
        throw new Error('Tu correo es demasiado largo. Usa uno más corto.');
      }

      if (!value.split('@')[1]?.includes('.')) {
        throw new Error('A tu correo le falta el punto (ejemplo: gmail.com).');
      }

      // 🔹 AQUÍ viene la parte de Firebase, corregida

      let userExists = false;

      try {
        const userRecord = await admin.auth().getUserByEmail(value);
        // Si llegamos aquí sin error, el usuario EXISTE
        if (userRecord) {
          userExists = true;
        }
      } catch (err) {
        // Caso normal: el usuario NO existe
        if (err?.code === 'auth/user-not-found') {
          userExists = false;
        } else {
          // Cualquier otro error de Firebase
          console.error('Error verificando correo en Firebase:', err);
          throw new Error('No se pudo validar tu correo en este momento. Intenta de nuevo más tarde.');
        }
      }

      if (userExists) {
        // ✅ Este mensaje SÍ llega directo al handleValidationErrors
        throw new Error('Este correo ya está registrado. Usa otro correo o inicia sesión.');
      }

      return true;
    }),

  // PASSWORD
  body('password')
    .custom((value) => {
      if (value === undefined || value === null || value === '') {
        throw new Error('La contraseña es obligatoria.');
      }

      if (typeof value !== 'string') {
        throw new Error('La contraseña debe ser una cadena de texto.');
      }

      const trimmed = value.trim();

      if (trimmed.length < 8 || trimmed.length > 20) {
        throw new Error('Tu contraseña debe tener entre 8 y 20 caracteres.');
      }

      return true;
    }),

  // DISPLAY NAME
  body('displayName')
    .exists({ checkFalsy: true }).withMessage('Por favor escribe tu nombre.')
    .bail()
    .isLength({ min: 2, max: 120 }).withMessage('Tu nombre debe tener entre 2 y 120 letras.')
    .bail()
    .custom((value) => {
      if (!isHumanNameStrict(value)) {
        throw new Error(
          'Tu nombre solo puede incluir letras y espacios, sin números ni palabras ofensivas.'
        );
      }
      return true;
    }),

  handleValidationErrors,
];

// LOGIN
// ✅ loginValidator con detail amigable y consistente
export const loginValidator = [
  body('email')
    .exists({ checkFalsy: true })
    .withMessage('El correo es obligatorio.')
    .bail()
    .isEmail()
    .withMessage('El formato del correo es inválido.'),

  body('password')
    .exists({ checkFalsy: true })
    .withMessage('La contraseña es obligatoria.')
    .bail()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres.'),

  // ⬇️ Handler SOLO para login (no usamos handleValidationErrors aquí)
  (req, res, next) => {
    const r = validationResult(req);
    if (r.isEmpty()) return next();

    const first = r.array()[0]; // tomamos el primer error

    // Mapeamos a códigos internos para el frontend
    let detail = 'VALIDATION_ERROR';

    if (first.path === 'email') {
      if (first.msg === 'El correo es obligatorio.') {
        detail = 'EMAIL_REQUIRED';
      } else if (first.msg === 'El formato del correo es inválido.') {
        detail = 'INVALID_EMAIL_FORMAT';
      }
    }

    if (first.path === 'password') {
      if (first.msg === 'La contraseña es obligatoria.') {
        detail = 'PASSWORD_REQUIRED';
      } else if (first.msg === 'La contraseña debe tener al menos 6 caracteres.') {
        detail = 'PASSWORD_TOO_SHORT';
      }
    }

    return res.status(422).json({
      error: {
        code: 'AUTH_LOGIN_ERROR',
        message: first.msg, // texto que ve el usuario
        detail,             // código que puede usar Android
      },
    });
  }
];


// REFRESH TOKEN
export const refreshTokenValidator = [
  body('refreshToken')
    .exists({ checkFalsy: true })
    .withMessage('El refreshToken es obligatorio.')
    .bail()
    .isString()
    .withMessage('El refreshToken debe ser una cadena de texto.'),
  handleValidationErrors,
];

// CHANGE PASSWORD (logueado)
export const changePasswordValidator = [
  body('newPassword')
    .custom((value) => {
      if (value === undefined || value === null || value === '') {
        throw new Error('La nueva contraseña es obligatoria.');
      }

      if (typeof value !== 'string') {
        throw new Error('La nueva contraseña debe ser una cadena de texto.');
      }

      const trimmed = value.trim();

      if (trimmed.length < 8 || trimmed.length > 20) {
        throw new Error('La nueva contraseña debe tener entre 8 y 20 caracteres.');
      }

      return true;
    }),
  handleValidationErrors,
];

/* =========================
   Handler global de validaciones
========================= */
export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      fields: r.array().map(e => ({
        field: e.path,
        message: e.msg,
      })),
    },
  });
}
