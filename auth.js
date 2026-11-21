// /api/auth — crea l'account, accede, rinnova la sessione ed esce.
// Usa gli account di Supabase (Authentication › Users).
// Variabili d'ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ACCESS_CODE (facoltativa: se c'è, serve per creare un nuovo account).
import { sb, configured, readBody } from '../lib/supabase.js';

const out = j => ({
  access_token: j.access_token,
  refresh_token: j.refresh_token,
  expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
  user: { id: j.user && j.user.id, email: j.user && j.user.email }
});

async function login(email, password) {
  const r = await sb('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Usa POST' });
  if (!configured()) return res.status(501).json({ error: 'Supabase non configurato sul server' });
  let b;
  try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'Richiesta non valida' }); }
  const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');

  try {
    if (b.action === 'login') {
      if (!email || !password) return res.status(400).json({ error: 'Inserisci email e password' });
      const { ok, j } = await login(email, password);
      if (!ok) return res.status(401).json({ error: 'Email o password errati' });
      return res.status(200).json(out(j));
    }

    if (b.action === 'signup') {
      const want = process.env.ACCESS_CODE;
      if (want && String(b.code || '').trim() !== want) return res.status(403).json({ error: 'Codice di registrazione non valido' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Email non valida' });
      if (password.length < 6) return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
      const r = await sb('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true } });
      if (!r.ok) {
        const t = await r.text();
        if (r.status === 422 || /already|exists|registered/i.test(t)) return res.status(409).json({ error: 'Esiste già un account con questa email: usa Accedi' });
        return res.status(502).json({ error: 'Supabase ' + r.status + ': ' + t.slice(0, 160) });
      }
      const { ok, j } = await login(email, password);
      if (!ok) return res.status(502).json({ error: 'Account creato, ma accesso non riuscito: riprova con Accedi' });
      return res.status(200).json(out(j));
    }

    if (b.action === 'refresh') {
      const r = await sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: String(b.refresh_token || '') } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(401).json({ error: 'Sessione scaduta' });
      return res.status(200).json(out(j));
    }

    if (b.action === 'logout') {
      const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
      if (m) await sb('/auth/v1/logout', { method: 'POST', token: m[1] }).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Azione sconosciuta' });
  } catch (e) {
    return res.status(502).json({ error: 'Supabase non raggiungibile' });
  }
}
