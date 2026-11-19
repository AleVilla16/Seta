// /api/state — salva e legge tutti i dati dell'app su Supabase,
// così ogni dispositivo vede gli stessi turni.
// Variabili d'ambiente su Vercel:
//   SUPABASE_URL               es. https://abcd1234.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  chiave "service_role" (o "secret") di Supabase
//   ACCESS_CODE                (consigliata) codice di accesso chiesto dall'app
const ROW = 'main';

function sb(path, method, body, prefer) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, 'content-type': 'application/json' };
  if (String(key).startsWith('eyJ')) h.authorization = 'Bearer ' + key;
  if (prefer) h.prefer = prefer;
  return fetch(url + '/rest/v1/' + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let s = '';
  for await (const c of req) s += c;
  return JSON.parse(s || '{}');
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  const want = process.env.ACCESS_CODE;
  if (want && String(req.headers['x-access-code'] || '').trim() !== want)
    return res.status(401).json({ error: 'Codice di accesso non valido' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(501).json({ error: 'Supabase non configurato' });

  try {
    if (req.method === 'GET') {
      const r = await sb('app_state?id=eq.' + ROW + '&select=data,rev', 'GET');
      if (!r.ok) return res.status(502).json({ error: 'Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200) });
      const rows = await r.json();
      return res.status(200).json(rows[0] ? { data: rows[0].data, rev: Number(rows[0].rev) } : { data: null, rev: null });
    }

    if (req.method === 'PUT') {
      let b;
      try { b = await readBody(req); } catch (e) { return res.status(400).json({ error: 'JSON non valido' }); }
      if (!b || typeof b.data !== 'object' || b.data === null) return res.status(400).json({ error: 'Dati mancanti' });
      const now = new Date().toISOString();

      // Prima volta: nessuna riga ancora salvata.
      if (b.base === null || b.base === undefined) {
        const r = await sb('app_state', 'POST', { id: ROW, data: b.data, rev: 1, updated_at: now }, 'return=representation');
        if (r.status === 409) return res.status(409).json({ error: 'Dati già presenti su un altro dispositivo' });
        if (!r.ok) return res.status(502).json({ error: 'Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200) });
        return res.status(200).json({ rev: 1 });
      }

      // Aggiorna solo se nessun altro dispositivo ha salvato nel frattempo.
      const base = Number(b.base);
      const r = await sb('app_state?id=eq.' + ROW + '&rev=eq.' + base, 'PATCH',
        { data: b.data, rev: base + 1, updated_at: now }, 'return=representation');
      if (!r.ok) return res.status(502).json({ error: 'Supabase ' + r.status + ': ' + (await r.text()).slice(0, 200) });
      const rows = await r.json();
      if (!rows.length) return res.status(409).json({ error: 'Dati cambiati su un altro dispositivo' });
      return res.status(200).json({ rev: base + 1 });
    }

    return res.status(405).json({ error: 'Metodo non supportato' });
  } catch (e) {
    return res.status(502).json({ error: 'Supabase non raggiungibile' });
  }
}
