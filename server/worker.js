// Tulostaulu: Cloudflare Worker + KV. Ei kirjautumista; ryhmäkoodi erottaa porukat toisistaan.
//
//   POST /submit  { group, name, game: 'tessere', date, seconds, mistakes, hints, pairs, layout }
//   POST /submit  { group, name, game: 'impero', gloria, pop, buildings, techs, turns }
//   GET  /board?group=…&game=tessere&date=YYYY-MM-DD   → päivän Tessere-tulokset
//   GET  /board?group=…&game=impero                    → Imperon tilanne pelaajittain
//
// Tessere-tulos tallennetaan päivä- ja pelaajakohtaisesti (paras aika säilyy), Imperosta
// vain pelaajan tuorein tilanne. Tiedot vanhenevat itsestään 120 päivässä.

const TTL = 120 * 24 * 3600;
const MAX_NAME = 24;
const MAX_GROUP = 40;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
});

const clean = (s, max) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
const slug = (s) => clean(s, MAX_NAME).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-');
const int = (n, max) => Math.max(0, Math.min(max, Math.floor(Number(n) || 0)));
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? '');

// Ryhmäkoodi hajautetaan, jotta KV-avaimista ei näe koodeja.
async function groupKey(group) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(group.toLowerCase()));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function submit(req, kv) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Virheellinen JSON' }, 400);
  }
  const group = clean(body.group, MAX_GROUP);
  const name = clean(body.name, MAX_NAME);
  if (!group || !name) return json({ error: 'Ryhmä ja nimi vaaditaan' }, 400);
  const g = await groupKey(group);
  const who = slug(name);
  const now = new Date().toISOString();

  if (body.game === 'tessere') {
    if (!isDate(body.date)) return json({ error: 'Päivämäärä puuttuu' }, 400);
    const key = `${g}:tessere:${body.date}:${who}`;
    const entry = {
      name, date: body.date, at: now,
      seconds: int(body.seconds, 24 * 3600), mistakes: int(body.mistakes, 999), hints: int(body.hints, 999),
      pairs: int(body.pairs, 99), layout: clean(body.layout, 20),
    };
    const prev = await kv.get(key, 'json');
    // Päivän pöydän voi pelata vain kerran, mutta jos tulos tulee uudelleen, paras jää.
    if (prev && (prev.seconds < entry.seconds || (prev.seconds === entry.seconds && prev.mistakes <= entry.mistakes))) {
      return json({ ok: true, kept: 'previous' });
    }
    await kv.put(key, JSON.stringify(entry), { expirationTtl: TTL });
    return json({ ok: true });
  }

  if (body.game === 'impero') {
    const key = `${g}:impero:${who}`;
    const entry = {
      name, at: now,
      gloria: int(body.gloria, 1e6), pop: int(body.pop, 1e5), buildings: int(body.buildings, 999),
      techs: int(body.techs, 999), turns: int(body.turns, 1e6), era: clean(body.era, 20),
    };
    await kv.put(key, JSON.stringify(entry), { expirationTtl: TTL });
    return json({ ok: true });
  }

  return json({ error: 'Tuntematon peli' }, 400);
}

async function board(url, kv) {
  const group = clean(url.searchParams.get('group'), MAX_GROUP);
  const game = url.searchParams.get('game');
  if (!group) return json({ error: 'Ryhmä vaaditaan' }, 400);
  const g = await groupKey(group);

  if (game === 'tessere') {
    const date = url.searchParams.get('date');
    if (!isDate(date)) return json({ error: 'Päivämäärä puuttuu' }, 400);
    const rows = await listAll(kv, `${g}:tessere:${date}:`);
    rows.sort((a, b) => a.seconds - b.seconds || a.mistakes - b.mistakes);
    return json({ game, date, rows });
  }
  if (game === 'impero') {
    const rows = await listAll(kv, `${g}:impero:`);
    rows.sort((a, b) => b.gloria - a.gloria || b.pop - a.pop);
    return json({ game, rows });
  }
  return json({ error: 'Tuntematon peli' }, 400);
}

async function listAll(kv, prefix) {
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix, cursor });
    const values = await Promise.all(page.keys.map((k) => kv.get(k.name, 'json')));
    out.push(...values.filter(Boolean));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

export async function handle(req, kv) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname === '/submit') {
    if (Number(req.headers.get('content-length') ?? 0) > 2048) return json({ error: 'Liian suuri pyyntö' }, 413);
    return submit(req, kv);
  }
  if (req.method === 'GET' && url.pathname === '/board') return board(url, kv);
  if (req.method === 'GET' && url.pathname === '/') return json({ ok: true, service: 'italia-board' });
  return json({ error: 'Ei löydy' }, 404);
}

export default {
  fetch: (req, env) => handle(req, env.SCORES),
};
