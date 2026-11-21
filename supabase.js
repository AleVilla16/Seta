// Funzioni comuni per parlare con Supabase dal server (mai dal browser).
export const SB_URL = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
export const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const configured = () => !!(SB_URL() && SB_KEY());

export function sb(path, { method = 'GET', body, prefer, token } = {}) {
  const key = SB_KEY();
  const h = { apikey: key, 'content-type': 'application/json' };
  if (token) h.authorization = 'Bearer ' + token;
  else if (key.startsWith('eyJ')) h.authorization = 'Bearer ' + key;
  if (prefer) h.prefer = prefer;
  return fetch(SB_URL() + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
}

// Restituisce l'utente collegato (id, email) oppure null se il token non è valido.
export async function userFrom(req) {
  const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await sb('/auth/v1/user', { token: m[1] });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: u.id, email: u.email } : null;
  } catch (e) { return null; }
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let s = '';
  for await (const c of req) s += c;
  return JSON.parse(s || '{}');
}
