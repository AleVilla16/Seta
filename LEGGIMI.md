# I miei turni — pubblicazione su Vercel + Supabase con account

## Cosa c'è nel progetto

```
index.html        l'app
sw.js             fa scaricare sempre l'ultima versione dell'app
api/auth.js       crea l'account, accesso, uscita
api/state.js      salva e legge i dati dell'account su Supabase
api/scan.js       legge le foto dei turni (solo per chi ha fatto l'accesso)
lib/supabase.js   funzioni comuni usate dai file in api (non toccare)
package.json      impostazioni per Vercel (non toccare)
vercel.json       dà più tempo alla lettura delle foto
supabase.sql      crea la tabella su Supabase
```

## 1. Supabase (una volta sola)

1. Su supabase.com crea un progetto (regione Europa).
2. **SQL Editor › New query**: incolla `supabase.sql` e premi **Run** (se l'hai già fatto, non serve rifarlo).
3. **Project Settings › API / API Keys**: copia il **Project URL** e la chiave **service_role** (o **secret**).
   Gli account si vedono in **Authentication › Users**. Non serve configurare email: l'account è attivo subito.

## 2. GitHub

Carica tutti i file mantenendo le cartelle `api` e `lib` (per crearle: **Add file › Create new file** e scrivi ad esempio `lib/supabase.js` come nome).

## 3. Vercel › Settings › Environment Variables

| Nome | Valore |
|---|---|
| `SUPABASE_URL` | il Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | la chiave service_role / secret |
| `ANTHROPIC_API_KEY` | la chiave Anthropic (lettura foto) |
| `ACCESS_CODE` | facoltativo: se lo metti, serve per **creare** un account, così nessun estraneo può registrarsi |

Poi **Deployments › … › Redeploy**.

## 4. Uso

- **Impostazioni › Account**: la prima volta tocca "Non hai un account? Creane uno", scegli email e password (e il codice, se l'hai impostato).
- Sugli altri dispositivi usa **Accedi** con la stessa email e password: tutti i dispositivi collegati a quell'account hanno gli stessi dati.
- Account diversi hanno dati separati.
- Il primo dispositivo che accede a un account nuovo ci carica i suoi dati. Gli altri prendono quelli dell'account; se avevano dati diversi, in Impostazioni compare "Usa i dati di questo dispositivo" per scegliere quelli.
- La sessione resta attiva e si rinnova da sola. Con **Esci** i dati restano sul dispositivo ma non si sincronizzano più.
- Senza accesso l'app funziona lo stesso, solo sul dispositivo, e mostra una barra rossa in alto. La lettura delle foto richiede l'accesso.
- Mentre l'app è aperta controlla ogni 30 secondi le modifiche degli altri dispositivi; le modifiche fatte senza rete partono quando torna la connessione.

## Se qualcosa non va

- "manca api/auth.js": il file non è su GitHub o non hai ripubblicato.
- "Supabase non configurato": mancano `SUPABASE_URL` o la chiave, oppure manca il Redeploy.
- "relation app_state does not exist": esegui `supabase.sql`.
- "Codice di registrazione non valido": il codice è diverso da `ACCESS_CODE`.
