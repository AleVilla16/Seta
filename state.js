// Dati dell'app sincronizzati tra dispositivi, salvati su Supabase (tabella turni_state, riga "main").
const check = require('./_auth');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const U = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const K = process.env.SUPABASE_SERVICE_KEY;
  const auth = check(req);
  if (auth === 'not_configured' || !U || !K) return res.status(501).json({ error: 'not_configured' });
  if (auth !== 'ok') return res.status(401).json({ error: 'auth' });

  const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
  const T = U + '/rest/v1/turni_state';
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const r = await fetch(T + '?id=eq.main&select=data,rev', { headers: H });
      if (!r.ok) return res.status(502).json({ error: 'upstream' });
      const rows = await r.json();
      return res.status(200).json(rows[0] || { data: null, rev: null });
    }
    if (req.method === 'PUT') {
      const { data, base } = req.body || {};
      if (!data || typeof data !== 'object' || !Array.isArray(data.folders)) return res.status(400).json({ error: 'bad_data' });
      const rev = crypto.randomUUID();
      const hp = { ...H, Prefer: 'return=representation' };
      let r;
      if (base) {
        if (!/^[0-9a-f-]{36}$/.test(base)) return res.status(400).json({ error: 'bad_base' });
        // aggiorna solo se nessun altro dispositivo ha salvato nel frattempo
        r = await fetch(T + '?id=eq.main&rev=eq.' + base, { method: 'PATCH', headers: hp, body: JSON.stringify({ data, rev, updated_at: new Date().toISOString() }) });
        if (!r.ok) return res.status(502).json({ error: 'upstream' });
        const rows = await r.json();
        if (!rows.length) return res.status(409).json({ error: 'conflict' });
      } else {
        r = await fetch(T, { method: 'POST', headers: hp, body: JSON.stringify({ id: 'main', data, rev }) });
        if (r.status === 409) return res.status(409).json({ error: 'conflict' });
        if (!r.ok) return res.status(502).json({ error: 'upstream' });
      }
      return res.status(200).json({ rev });
    }
    return res.status(405).json({ error: 'method' });
  } catch (e) {
    return res.status(500).json({ error: 'failed' });
  }
};
