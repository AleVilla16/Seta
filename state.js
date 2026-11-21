// /api/state — salva e legge i dati dell'account collegato su Supabase.
// Tutti i dispositivi che accedono con lo stesso account vedono gli stessi dati.
import { sb, configured, userFrom, readBody } from '../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!configured()) return res.status(501).json({ error: 'Supabase non configurato' });
  const u = await userFrom(req);
  if (!u) return res.status(401).json({ error: 'login' });
  const id = encodeURIComponent(u.id);
  const fail = async r => res.status(502).json({ error: 'Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200) });

  try {
    if (req.method === 'GET') {
      const r = await sb('/rest/v1/app_state?id=eq.' + id + '&select=data,rev');
      if (!r.ok) return fail(r);
      const rows = await r.json();
      return res.status(200).json(rows[0] ? { data: rows[0].data, rev: Number(rows[0].rev) } : { data: null, rev: null });
    }

    if (req.method === 'PUT') {
      let b;
      try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'JSON non valido' }); }
      if (!b || typeof b.data !== 'object' || b.data === null) return res.status(400).json({ error: 'Dati mancanti' });
      const now = new Date().toISOString();

      if (b.base === null || b.base === undefined) {
        const r = await sb('/rest/v1/app_state', { method: 'POST', body: { id: u.id, data: b.data, rev: 1, updated_at: now }, prefer: 'return=representation' });
        if (r.status === 409) return res.status(409).json({ error: 'Dati già presenti su un altro dispositivo' });
        if (!r.ok) return fail(r);
        return res.status(200).json({ rev: 1 });
      }

      const base = Number(b.base);
      const r = await sb('/rest/v1/app_state?id=eq.' + id + '&rev=eq.' + base, {
        method: 'PATCH', body: { data: b.data, rev: base + 1, updated_at: now }, prefer: 'return=representation'
      });
      if (!r.ok) return fail(r);
      if (!(await r.json()).length) return res.status(409).json({ error: 'Dati cambiati su un altro dispositivo' });
      return res.status(200).json({ rev: base + 1 });
    }

    return res.status(405).json({ error: 'Metodo non supportato' });
  } catch (e) {
    return res.status(502).json({ error: 'Supabase non raggiungibile' });
  }
}
