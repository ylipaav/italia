import { test } from 'node:test';
import assert from 'node:assert/strict';

import { handle } from '../server/worker.js';

// Muistinvarainen KV, joka matkii Cloudflaren rajapintaa riittävästi.
function fakeKV() {
  const m = new Map();
  return {
    get: async (k, type) => (m.has(k) ? (type === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null),
    put: async (k, v) => m.set(k, v),
    list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }),
    keys: () => [...m.keys()],
  };
}

const post = (body) => new Request('https://x/submit', { method: 'POST', body: JSON.stringify(body), headers: { 'content-length': String(JSON.stringify(body).length) } });
const get = (q) => new Request(`https://x/board?${new URLSearchParams(q)}`);

test('Tessere: tulokset päivittäin, paras aika säilyy, järjestys ajan mukaan', async () => {
  const kv = fakeKV();
  const base = { group: 'Perhe', game: 'tessere', date: '2026-10-29', pairs: 20, layout: 'Portaat' };
  assert.equal((await handle(post({ ...base, name: 'Anna', seconds: 130, mistakes: 1 }), kv)).status, 200);
  await handle(post({ ...base, name: 'Marko', seconds: 151, mistakes: 0 }), kv);
  const again = await (await handle(post({ ...base, name: 'anna', seconds: 200, mistakes: 0 }), kv)).json();
  assert.equal(again.kept, 'previous', 'huonompi tulos ei korvaa');
  await handle(post({ ...base, name: 'Anna', seconds: 120, mistakes: 2 }), kv);

  const b = await (await handle(get({ group: 'perhe', game: 'tessere', date: '2026-10-29' }), kv)).json();
  assert.deepEqual(b.rows.map((r) => [r.name, r.seconds]), [['Anna', 120], ['Marko', 151]]);
  assert.equal(kv.keys().some((k) => k.includes('Perhe') || k.includes('perhe')), false, 'ryhmäkoodi ei näy avaimissa');

  const other = await (await handle(get({ group: 'toinen', game: 'tessere', date: '2026-10-29' }), kv)).json();
  assert.equal(other.rows.length, 0, 'eri ryhmä ei näe tuloksia');
});

test('Impero: tuorein tilanne pelaajittain, järjestys glorian mukaan', async () => {
  const kv = fakeKV();
  await handle(post({ group: 'g', name: 'Anna', game: 'impero', gloria: 40, pop: 3, buildings: 2, techs: 1, turns: 9 }), kv);
  await handle(post({ group: 'g', name: 'Marko', game: 'impero', gloria: 55, pop: 4, buildings: 4, techs: 2, turns: 12 }), kv);
  await handle(post({ group: 'g', name: 'Anna', game: 'impero', gloria: 70, pop: 5, buildings: 5, techs: 2, turns: 15 }), kv);
  const b = await (await handle(get({ group: 'g', game: 'impero' }), kv)).json();
  assert.deepEqual(b.rows.map((r) => [r.name, r.gloria]), [['Anna', 70], ['Marko', 55]]);
});

test('virheelliset pyynnöt hylätään ja CORS toimii', async () => {
  const kv = fakeKV();
  assert.equal((await handle(post({ group: 'g', name: '', game: 'tessere' }), kv)).status, 400);
  assert.equal((await handle(post({ group: 'g', name: 'A', game: 'tessere', date: 'eilen' }), kv)).status, 400);
  assert.equal((await handle(post({ group: 'g', name: 'A', game: 'shakki' }), kv)).status, 400);
  assert.equal((await handle(new Request('https://x/submit', { method: 'POST', body: '{', headers: { 'content-length': '1' } }), kv)).status, 400);
  assert.equal((await handle(get({ group: 'g', game: 'tessere' }), kv)).status, 400, 'päivä puuttuu');
  const opt = await handle(new Request('https://x/submit', { method: 'OPTIONS' }), kv);
  assert.equal(opt.status, 204);
  assert.equal(opt.headers.get('Access-Control-Allow-Origin'), '*');
  // Nimi ja arvot siistitään
  await handle(post({ group: 'g', name: '  Pitkä   nimi joka on aivan liian pitkä tulostaululle  ', game: 'impero', gloria: -5, pop: 'x' }), kv);
  const b = await (await handle(get({ group: 'g', game: 'impero' }), kv)).json();
  assert.equal(b.rows[0].name, 'Pitkä nimi joka on aivan');
  assert.deepEqual([b.rows[0].gloria, b.rows[0].pop], [0, 0]);
});
