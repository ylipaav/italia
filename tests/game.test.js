import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORDS } from '../js/words.js';
import { LAYOUTS, pickLayout, flatLayout } from '../js/layout.js';
import { generateBoard, isFree, isMatch, findFreePairs } from '../js/board.js';
import { hashString, mulberry32 } from '../js/rng.js';
import {
  pickWords, applyResult, updateStreak, currentStreak, addDays, defaultState,
} from '../js/progress.js';

test('sanastossa ei ole päällekkäisiä sanoja', () => {
  assert.equal(new Set(WORDS.map((w) => w.it)).size, WORDS.length);
  assert.equal(new Set(WORDS.map((w) => w.fi)).size, WORDS.length);
});

test('jokaisessa pöydässä on parillinen määrä laattoja ja yksilölliset paikat', () => {
  for (const l of LAYOUTS) {
    assert.equal(l.tiles.length % 2, 0, l.name);
    assert.equal(new Set(l.tiles.map((p) => `${p.x},${p.y},${p.z}`)).size, l.tiles.length, l.name);
    assert.ok(Math.max(...l.tiles.map((p) => p.x)) <= 6, `${l.name} mahtuu puhelimen leveyteen`);
    // Ylemmän kerroksen laatan alla on oltava jotain.
    for (const t of l.tiles) {
      if (t.z === 0) continue;
      const supported = l.tiles.some((o) => o.z === t.z - 1 && Math.abs(o.x - t.x) < 2 && Math.abs(o.y - t.y) < 2);
      assert.ok(supported, `${l.name}: laatta ${t.x},${t.y},${t.z} leijuu`);
    }
  }
});

// Pelataan generaattorin tallentama poistojärjestys ja tarkistetaan, että jokainen pari on vapaa.
function assertSolvable(tiles, order) {
  let remaining = tiles.slice();
  for (const [ka, kb] of order) {
    const a = remaining.find((t) => t.key === ka);
    const b = remaining.find((t) => t.key === kb);
    assert.ok(isMatch(a, b), 'parin laatat kuuluvat yhteen');
    assert.ok(isFree(a, remaining) && isFree(b, remaining), 'parin laatat ovat vapaita');
    remaining = remaining.filter((t) => t !== a && t !== b);
  }
  assert.equal(remaining.length, 0);
}

test('vuoden jokainen päivän pöytä on ratkaistavissa', () => {
  let date = '2026-01-01';
  const seen = new Set();
  for (let i = 0; i < 365; i++, date = addDays(date, 1)) {
    const rand = mulberry32(hashString(`tessere-${date}`));
    const layout = pickLayout(rand);
    seen.add(layout.name);
    const words = pickWords(WORDS, {}, date, layout.tiles.length / 2, rand);
    const board = generateBoard(layout.tiles, words, rand);
    assert.ok(board, `pöytä ${date} (${layout.name}) generoitui`);
    assert.equal(board.tiles.length, layout.tiles.length);
    assertSolvable(board.tiles, board.order);
  }
  assert.equal(seen.size, LAYOUTS.length, 'kaikki pöytämuodot esiintyvät vuoden aikana');
});

test('jokainen pöytämuoto generoituu sadalla siemenellä', () => {
  for (const l of LAYOUTS) {
    for (let seed = 1; seed <= 100; seed++) {
      const rand = mulberry32(seed);
      const board = generateBoard(l.tiles, WORDS.slice(0, l.tiles.length / 2), rand);
      assert.ok(board, `${l.name} siemenellä ${seed}`);
      assertSolvable(board.tiles, board.order);
    }
  }
});

test('sama päivä tuottaa saman pöydän', () => {
  const make = () => {
    const rand = mulberry32(hashString('tessere-2026-10-28'));
    const layout = pickLayout(rand);
    const words = pickWords(WORDS, {}, '2026-10-28', layout.tiles.length / 2, rand);
    return generateBoard(layout.tiles, words, rand).tiles.map((t) => `${t.key}:${t.text}`);
  };
  assert.deepEqual(make(), make());
});

test('alussa on ainakin yksi vapaa pari ja litteä varapöytä toimii', () => {
  const rand = mulberry32(1);
  const words = WORDS.slice(0, LAYOUTS[0].tiles.length / 2);
  assert.ok(findFreePairs(generateBoard(LAYOUTS[0].tiles, words, rand).tiles).length > 0);
  for (let n = 1; n <= 16; n++) {
    const board = generateBoard(flatLayout(n * 2), WORDS.slice(0, n), rand);
    assert.ok(board, `litteä pöytä ${n} parilla`);
    assertSolvable(board.tiles, board.order);
  }
});

test('peitetty laatta ei ole vapaa', () => {
  const tiles = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }];
  assert.equal(isFree(tiles[0], tiles), false);
  assert.equal(isFree(tiles[1], tiles), true);
  const row = [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }];
  assert.equal(isFree(row[1], row), false);
  assert.equal(isFree(row[0], row), true);
});

test('sanavalinta: uudet sanat järjestyksessä, erääntyneet kertaukseen', () => {
  const rand = mulberry32(7);
  const first = pickWords(WORDS, {}, '2026-10-28', 16, rand);
  assert.deepEqual(new Set(first.map((w) => w.it)), new Set(WORDS.slice(0, 16).map((w) => w.it)));

  const progress = {};
  applyResult(progress, first.map((w) => ({ id: w.it, outcome: 'clean' })), '2026-10-28');
  const next = pickWords(WORDS, progress, '2026-10-29', 16, rand);
  assert.equal(new Set(next).size, 16);
  const reviews = next.filter((w) => progress[w.it]);
  assert.equal(reviews.length, 6, 'noin 40 % kertausta');
});

test('kertausvälit kasvavat ja virhe palauttaa alkuun', () => {
  const p = {};
  applyResult(p, [{ id: 'ciao', outcome: 'clean' }], '2026-10-28');
  assert.equal(p.ciao.due, '2026-10-29');
  applyResult(p, [{ id: 'ciao', outcome: 'clean' }], '2026-10-29');
  assert.equal(p.ciao.due, '2026-11-01');
  applyResult(p, [{ id: 'ciao', outcome: 'miss' }], '2026-11-01');
  assert.equal(p.ciao.box, 1);
  assert.equal(p.ciao.due, '2026-11-02');
});

test('päiväputki kasvaa peräkkäisinä päivinä ja katkeaa välipäivästä', () => {
  const s = defaultState();
  updateStreak(s, '2026-10-27');
  updateStreak(s, '2026-10-28');
  updateStreak(s, '2026-10-28');
  assert.equal(s.streak, 2);
  assert.equal(currentStreak(s, '2026-10-29'), 2);
  assert.equal(currentStreak(s, '2026-10-30'), 0);
  updateStreak(s, '2026-10-31');
  assert.equal(s.streak, 1);
  assert.equal(s.bestStreak, 2);
});

test('tilastot: pöydän numero, kalenteri, sanatilat ja jakoteksti', async () => {
  const { puzzleNumber, calendarWeeks, wordStats, computeStats, shareText, sequenceEmoji } = await import('../js/stats.js');
  assert.equal(puzzleNumber('2026-10-28'), 1);
  assert.equal(puzzleNumber('2026-11-01'), 5);

  const history = { '2026-10-27': { seconds: 100, mistakes: 0, pairs: 20 }, '2026-10-28': { seconds: 140, mistakes: 2, pairs: 18 } };
  const weeks = calendarWeeks(history, '2026-10-28', 2); // keskiviikko
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0][0].date, '2026-10-19', 'alkaa maanantaista');
  assert.equal(weeks[1][2].today, true);
  assert.equal(weeks[1][1].played && weeks[1][1].clean, true);
  assert.equal(weeks[1][6].future, true);

  const progress = { ciao: { box: 4 }, grazie: { box: 1 } };
  const ws = wordStats(WORDS, progress);
  assert.deepEqual([ws.mastered, ws.learning, ws.fresh], [1, 1, WORDS.length - 2]);

  const state = { ...defaultState(), history, streak: 2, bestStreak: 3, lastDaily: '2026-10-28' };
  const st = computeStats(state, '2026-10-28');
  assert.deepEqual([st.played, st.streak, st.bestStreak, st.avgSeconds, st.bestSeconds, st.cleanRate, st.totalPairs], [2, 2, 3, 120, 100, 50, 38]);

  assert.equal(sequenceEmoji(['clean', 'miss', 'hint']), '🟩🟥🟨');
  assert.equal(sequenceEmoji(Array(10).fill('clean')).split('\n').length, 2, 'rivitys kahdeksan välein');
  const text = shareText({ date: '2026-10-28', layout: 'Portaat', seconds: 151, mistakes: 1, hints: 0, sequence: ['clean', 'miss'] }, state, '2026-10-28');
  assert.equal(text, 'Tessere 🇮🇹 #1 · Portaat\n⏱ 2:31 · ✗ 1 · 💡 0\n🟩🟥\n🔥 2 päivän putki');
});
