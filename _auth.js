const crypto = require('crypto');

// Codice di accesso condiviso (variabile APP_CODE). Senza codice configurato l'accesso è negato.
module.exports = function check(req) {
  const need = process.env.APP_CODE || process.env.SCAN_CODE;
  if (!need) return 'not_configured';
  const got = String(req.headers['x-access-code'] || '');
  const a = Buffer.from(got), b = Buffer.from(need);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? 'ok' : 'auth';
};
