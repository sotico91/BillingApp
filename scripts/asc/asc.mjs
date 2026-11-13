// Minimal App Store Connect API client (key in credentials/asc-api-key.p8, gitignored).
// node scripts/asc/asc.mjs GET /v1/apps   |   node scripts/asc/asc.mjs POST /v1/... '{"data":...}'
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
const KEY_ID = 'A4SMWC32N9', ISSUER = '0289bb86-99d4-4ed9-a9e5-139a808fcdd7';
const key = createPrivateKey(readFileSync(new URL('../../credentials/asc-api-key.p8', import.meta.url)));
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
export function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' });
  const body = b64({ iss: ISSUER, iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const s = createSign('SHA256'); s.update(`${head}.${body}`);
  return `${head}.${body}.${s.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
export async function api(method, path, body) {
  const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`;
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined });
  const text = await r.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) { const e = new Error(`${method} ${path} → ${r.status}: ${JSON.stringify(json.errors ?? json).slice(0, 800)}`); e.status = r.status; throw e; }
  return json;
}
if (process.argv[1]?.endsWith('asc.mjs') && process.argv[2]) {
  const out = await api(process.argv[2], process.argv[3], process.argv[4]);
  console.log(JSON.stringify(out, null, 1).slice(0, Number(process.env.MAX ?? 6000)));
}
