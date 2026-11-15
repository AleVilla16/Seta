// /api/scan — legge la foto di un turno e restituisce i dati in JSON.
// Variabili d'ambiente su Vercel:
//   ANTHROPIC_API_KEY  (obbligatoria) chiave API di Anthropic
//   ACCESS_CODE        (consigliata)  codice di accesso chiesto dall'app
//   SCAN_MODEL         (facoltativa)  modello da usare
const MODEL = process.env.SCAN_MODEL || 'claude-sonnet-5-5';

const PROMPT = `Questa è la foto di un turno di guida di un autista di autobus (tabella stampata, a volte con annotazioni a mano).
Leggi tutta la tabella e rispondi SOLO con un oggetto JSON, senza testo prima o dopo, con questa forma:
{
 "tabella": "numero della tabella, es. 11101",
 "codice": "codice del turno, es. Lu 701",
 "giorni": "7 caratteri, uno per giorno da lunedì a domenica: la lettera del giorno se il turno vale quel giorno, altrimenti '-'. Es. 'LMMGV--' per lunedì-venerdì, '-----S-' per il sabato",
 "inizio": "HH:MM di inizio turno",
 "fine": "HH:MM di fine turno",
 "voci": [
  {"tipo":"corsa","linea":"numero di linea, oppure CV per una corsa a vuoto","codice_led":"codice LED se presente","inizio":"HH:MM","fine":"HH:MM","descrizione":"eventuali avvertenze o annotazioni sulla corsa","fermate":[{"nome":"nome della fermata","orario":"HH:MM"}]},
  {"tipo":"pausa","inizio":"HH:MM","fine":"HH:MM","descrizione":"dove si svolge la pausa"}
 ]
}
Regole: metti le voci in ordine di orario; riporta tutte le fermate con orario di ogni corsa; orari sempre nel formato 24 ore HH:MM; se un dato non si legge usa una stringa vuota e non inventarlo.`;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  let s = '';
  for await (const c of req) s += c;
  return JSON.parse(s || '{}');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(400).json({ error: 'Usa POST' });
  const want = process.env.ACCESS_CODE;
  if (want && String(req.headers['x-access-code'] || '').trim() !== want)
    return res.status(401).json({ error: 'Codice di accesso non valido' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'Manca ANTHROPIC_API_KEY' });

  let image;
  try { image = (await readBody(req)).image; } catch (e) {}
  if (!image || typeof image !== 'string') return res.status(400).json({ error: 'Immagine mancante' });

  let r, out;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: PROMPT }
        ] }]
      })
    });
    out = await r.json();
  } catch (e) {
    return res.status(502).json({ error: 'Servizio di lettura non raggiungibile' });
  }
  if (!r.ok) return res.status(502).json({ error: 'Anthropic ' + r.status + ': ' + ((out && out.error && out.error.message) || '') });

  const text = (out.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  try {
    return res.status(200).json(JSON.parse(text.slice(a, b + 1)));
  } catch (e) {
    return res.status(502).json({ error: 'Risposta non leggibile' });
  }
}

export const config = { maxDuration: 60 };
