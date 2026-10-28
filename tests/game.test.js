import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORDS } from '../js/words.js';
import { LAYOUT, flatLayout } from '../js/layout.js';
import { generateBoard, isFree, isMatch, findFreePairs } from '../js/board.js';
import { hashString, mulberry32 } from '../js/rng.js';
import {
  pickWords, applyResult, updateStreak, currentStreak, addDays, defaultState,
} from '../js/progress.js';

test('sanastossa ei ole päällekkäisiä sanoja', () => {
  assert.equal(new Set(WORDS.map((w) => w.it)).size, WORDS.length);
  assert.equal(new Set(WORDS.map((w) => w.fi)).size, WORDS.length);
});

test('pohjapöydässä on parillinen määrä laattoja ja yksilölliset paikat', () => {
  assert.equal(LAYOUT.length % 2, 0);
  assert.equal(new Set(LAYOUT.map((p) => `${p.x},${p.y},${p.z}`)).size, LAYOUT.length);
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
  for (let i = 0; i < 365; i++, date = addDays(date, 1)) {
    const rand = mulberry32(hashString(`tessere-${date}`));
    const words = pickWords(WORDS, {}, date, LAYOUT.length / 2, rand);
    const board = generateBoard(LAYOUT, words, rand);
    assert.ok(board, `pöytä ${date} generoitui`);
    assert.equal(board.tiles.length, LAYOUT.length);
    assertSolvable(board.tiles, board.order);
  }
});

test('sama päivä tuottaa saman pöydän', () => {
  const make = () => {
    const rand = mulberry32(hashString('tessere-2026-10-28'));
    const words = pickWords(WORDS, {}, '2026-10-28', LAYOUT.length / 2, rand);
    return generateBoard(LAYOUT, words, rand).tiles.map((t) => `${t.key}:${t.text}`);
  };
  assert.deepEqual(make(), make());
});

test('alussa on ainakin yksi vapaa pari ja litteä varapöytä toimii', () => {
  const rand = mulberry32(1);
  const words = WORDS.slice(0, LAYOUT.length / 2);
  assert.ok(findFreePairs(generateBoard(LAYOUT, words, rand).tiles).length > 0);
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
