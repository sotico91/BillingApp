// Minimal RevenueCat API v2 client (secret key in credentials/revenuecat-secret-v2.txt, gitignored).
// node scripts/asc/rc.mjs GET /projects
import { readFileSync } from 'node:fs';
const KEY = readFileSync(new URL('../../credentials/revenuecat-secret-v2.txt', import.meta.url), 'utf8').trim();
export async function rc(method, path, body) {
  const r = await fetch(`https://api.revenuecat.com/v2${path}`, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status}: ${text.slice(0, 600)}`);
  return json;
}
if (process.argv[1]?.endsWith('rc.mjs') && process.argv[2]) {
  console.log(JSON.stringify(await rc(process.argv[2], process.argv[3], process.argv[4] && JSON.parse(process.argv[4])), null, 1).slice(0, 6000));
}
