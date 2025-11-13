// validators/auth.validators.js
import { body, validationResult } from 'express-validator';

/* =========================
   Lista de palabras prohibidas (versión resumida)
   - Se comparan en minúsculas y sin acentos
   - BANNED_SET: se usa para displayName / password (tokens)
   - BANNED_SET_4PLUS: solo palabras de 4+ letras (para emails,
     se buscan como subcadena en la parte local del correo)
========================= */
const BANNED_WORDS = [
  // Español – insultos/VULGAR
  'puta','puto','pendejo','pendeja','cabron','cabrona','cabrón',
  'verga','chingar','chingada','chingado','mierda','cagada',
  'imbecil','tarado','retrasado','subnormal','anormal','mongolo',
  'idiota','estupido','marica','maricon','maricón','joto','culero',
  'zorra','perra','coño','vagina','pene','follar','coger','mamar',
  'chupar','sexo','porno','pornografia','orgasmo','masturbar',
  'culo','ojete','bolas','cojones','huevos','tetas','violar','violador',

  // Inglés – insultos/sexuales
  'fuck','fucked','fucker','fucking','motherfucker',
  'bitch','bitches','asshole','shit','cunt','whore','slut',
  'dick','cock','pussy','penis','vagina','rape','rapist',

  // Slurs fuertes
  'nigger','nigga','faggot','dyke','retard',

  // Seguridad / inyección
  '<script','</script','javascript','eval','exec',
  'drop table','union select','delete from','insert into','or 1=1','admin--',
];

const BANNED_SET = new Set(BANNED_WORDS.map(normalize));
const BANNED_SET_4PLUS = new Set(
  BANNED_WORDS
    .filter(w => normalize(w).length >= 4)
    .map(normalize)
);

/* =========================
   Helpers sencillos
========================= */
function normalize(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Normaliza leetspeak básico
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

// XSS básico
function hasHtmlTagsOrScripts(str) {
  const s = str.toLowerCase();
  if (/<[^>]+>/.test(s)) return true;
  if (s.includes('<script') || s.includes('</script')) return true;
  if (s.includes('javascript:')) return true;
  if (s.includes('onerror=') || s.includes('onload=')) return true;
  return false;
}

// Tokens SQL básicos
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

// Para email: revisa SOLO la parte local (antes de @)
// y busca palabras prohibidas (4+ letras) como SUBCADENA
function emailHasBannedLenient(email) {
  const s = normalize(email);
  const [local] = s.split('@');
  if (!local) return false;

  // Normalizamos leet y quitamos símbolos para evitar evasiones tipo "p.e.n.d.e.j.o"
  const localSanitized = leetNormalize(local).replace(/[^a-z0-9]+/g, '');

  for (const banned of BANNED_SET_4PLUS) {
    if (localSanitized.includes(banned)) {
      return true;
    }
  }
  return false;
}

// Para texto genérico (displayName, password)
// Aquí seguimos usando tokens completos, no subcadenas
function textHasBanned(text) {
  const s = normalize(leetNormalize(text));
  const tokens = s.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.some(tok => BANNED_SET.has(tok));
}

// Validación simple de nombre humano
function isHumanNameStrict(name) {
  if (typeof name !== 'string') return false;
  const raw = name.trim();

  // Longitud razonable
  if (raw.length < 2 || raw.length > 120) return false;

  // Solo letras, espacios, apóstrofe y guion
  const allowed = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u;
  if (!allowed.test(raw)) return false;

  // Al menos dos palabras de 2+ letras (nombre y apellido)
  const words = raw.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) return false;

  // Sin control chars, scripts ni groserías
  if (hasControlChars(raw)) return false;
  if (hasHtmlTagsOrScripts(raw)) return false;
  if (textHasBanned(raw)) return false;

  return true;
}

/* =========================
   Validadores
========================= */
export const registerValidator = [
  body('email')
    .isEmail().withMessage('email inválido')
    .bail()
    .custom((value) => {
      if (typeof value !== 'string') throw new Error('email inválido');

      if (hasControlChars(value)) {
        throw new Error('email contiene caracteres inválidos');
      }

      if (hasHtmlTagsOrScripts(value)) {
        throw new Error('email contiene contenido no permitido');
      }

      if (hasSuspiciousSQLTokens(value)) {
        throw new Error('email contiene contenido no permitido');
      }

      // ← aquí ya NO se cuela "idiota919310@gmail.com"
      if (emailHasBannedLenient(value)) {
        throw new Error('email contiene términos no permitidos');
      }

      if (value.length > 254) throw new Error('email demasiado largo');

      const parts = value.split('@');
      if (parts.length !== 2) throw new Error('email inválido');
      if (parts[0].length === 0 || parts[1].length < 3) throw new Error('email inválido');
      if (!parts[1].includes('.')) throw new Error('email inválido');

      return true;
    }),

  body('password')
    .isString().withMessage('password debe ser string')
    .isLength({ min: 8 }).withMessage('password mínimo 8 caracteres')
    .bail()
    .custom((value) => {
      if (hasControlChars(value)) {
        throw new Error('password contiene caracteres inválidos');
      }
      if (hasHtmlTagsOrScripts(value)) {
        throw new Error('password contiene contenido no permitido');
      }
      if (textHasBanned(value)) {
        throw new Error('password contiene términos no permitidos');
      }
      return true;
    }),

  body('displayName')
    .exists({ checkFalsy: true }).withMessage('displayName requerido')
    .bail()
    .isLength({ min: 2, max: 120 }).withMessage('displayName debe tener entre 2 y 120 caracteres')
    .bail()
    .custom((value) => {
      if (!isHumanNameStrict(value)) {
        throw new Error(
          'displayName debe ser un nombre real: solo letras (incluye acentos/ñ/ü), ' +
          'espacios, apóstrofe y guion; al menos 2 palabras de 2+ caracteres cada una; ' +
          'sin palabras ofensivas ni contenido malicioso'
        );
      }
      return true;
    }),

  handleValidationErrors,
];

export const loginValidator = [
  body('email').isEmail().withMessage('email inválido'),
  body('password').isString().isLength({ min: 6 }).withMessage('password min 6'),
  handleValidationErrors,
];

export function handleValidationErrors(req, res, next) {
  const r = validationResult(req);
  if (r.isEmpty()) return next();
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      fields: r.array().map(e => ({ field: e.path, message: e.msg })),
    },
  });
}
