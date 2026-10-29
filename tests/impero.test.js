import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORDS } from '../shared/words.js';
import { mulberry32 } from '../shared/rng.js';
import { BUILDINGS, TECHS, THEME_RESOURCE, TURNS_PER_DAY, QUESTIONS_PER_TURN } from '../impero/js/data.js';
import {
  defaultState, startDay, build, research, gloria, startTurn, answer, endTurn, turnDone,
  splitArticle, questionTypes, makeQuestion, claimTessereBonus, canAfford, foodForNextPop, pickTurnWords, resourceFor,
} from '../impero/js/game.js';

test('pelidata on ehjää', () => {
  const ids = [...BUILDINGS, ...TECHS].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'tunnisteet yksilöllisiä');
  for (const x of [...BUILDINGS, ...TECHS]) {
    for (const r of x.requires ?? []) assert.ok(ids.includes(r), `${x.id} vaatii tuntemattoman ${r}`);
  }
  const themes = new Set(WORDS.map((w) => w.theme));
  for (const t of themes) assert.ok(THEME_RESOURCE[t], `teemalla ${t} ei ole resurssia`);
});

test('uusi päivä palauttaa vuorot, vuoro kuluttaa ne', () => {
  const s = defaultState();
  const progress = {};
  const rand = mulberry32(3);
  startDay(s, '2026-10-29');
  assert.equal(s.turnsLeft, TURNS_PER_DAY);
  for (let i = 0; i < TURNS_PER_DAY; i++) {
    const turn = startTurn(s, WORDS, progress, '2026-10-29', rand);
    assert.equal(turn.questions.length, QUESTIONS_PER_TURN);
    while (!turnDone(turn)) answer(s, turn, turn.questions[turn.index].answer);
    endTurn(s, turn, progress, '2026-10-29');
  }
  assert.equal(s.turnsLeft, 0);
  assert.equal(startTurn(s, WORDS, progress, '2026-10-29', rand), null);
  assert.equal(s.correct, TURNS_PER_DAY * QUESTIONS_PER_TURN);
  assert.equal(Object.keys(progress).length, TURNS_PER_DAY * QUESTIONS_PER_TURN, 'kertaustila päivittyy');
  const start = Object.values(defaultState().resources).reduce((a, b) => a + b, 0);
  const total = Object.values(s.resources).reduce((a, b) => a + b, 0);
  assert.equal(total - start, 2 * TURNS_PER_DAY * QUESTIONS_PER_TURN, 'oikea vastaus tuottaa 2');
  startDay(s, '2026-10-29');
  assert.equal(s.turnsLeft, 0, 'sama päivä ei palauta vuoroja');
  startDay(s, '2026-10-30');
  assert.equal(s.turnsLeft, TURNS_PER_DAY);
});

test('väärä vastaus ei tuota mitään ja merkitsee sanan virheeksi', () => {
  const s = defaultState();
  const progress = {};
  const turn = startTurn(s, WORDS, progress, '2026-10-29', mulberry32(1));
  const q = turn.questions[0];
  const wrong = q.options.find((o) => o !== q.answer);
  const r = answer(s, turn, wrong);
  assert.equal(r.correct, false);
  assert.equal(r.answer, q.answer);
  assert.deepEqual(s.resources, defaultState().resources);
  assert.equal(turn.results[0].outcome, 'miss');
});

test('uuden pelaajan vuoro tuottaa kaikkia resursseja', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const picked = pickTurnWords(WORDS, {}, '2026-10-29', QUESTIONS_PER_TURN, mulberry32(seed));
    assert.equal(picked.length, QUESTIONS_PER_TURN);
    assert.equal(new Set(picked.map(resourceFor)).size, 4, `siemen ${seed}: neljä resurssia`);
  }
  const progress = {};
  for (const w of WORDS.slice(0, 10)) progress[w.it] = { box: 1, due: '2026-10-01', seen: 1 };
  const picked = pickTurnWords(WORDS, progress, '2026-10-29', QUESTIONS_PER_TURN, mulberry32(1));
  assert.equal(picked.filter((w) => progress[w.it]).length, 2, 'noin 40 % kertausta');
});

test('rakentaminen vaatii varat ja esivaatimukset, tuotto tulee vuoron lopussa', () => {
  const s = defaultState();
  assert.equal(build(s, 'foro'), false, 'ei varaa');
  s.resources.prod = 50;
  s.resources.science = 10;
  assert.equal(build(s, 'acquedotto'), false, 'vaatii foron');
  assert.equal(build(s, 'foro'), true);
  assert.equal(s.resources.prod, 40);
  assert.equal(build(s, 'foro'), false, 'ei kahdesti');
  assert.equal(build(s, 'acquedotto'), true);
  assert.equal(s.pop, 3);
  const turn = { earned: { food: 0, prod: 0, science: 0, gold: 0 }, results: [] };
  const { income } = endTurn(s, turn, {}, '2026-10-29');
  assert.equal(income.gold, 1);
  assert.equal(s.resources.gold, 1);
  assert.equal(gloria(s), 3 * 5);
});

test('ruoka kasvattaa väestöä', () => {
  const s = defaultState();
  const need = foodForNextPop(s);
  const turn = { earned: { food: need, prod: 0, science: 0, gold: 0 }, results: [] };
  const { grown } = endTurn(s, turn, {}, '2026-10-29');
  assert.equal(grown, 1);
  assert.equal(s.pop, 2);
  assert.equal(s.food, 0);
});

test('tutkimus avaa tehtävätyyppejä', () => {
  const s = defaultState();
  const treno = WORDS.find((w) => w.it === 'il treno');
  assert.deepEqual(questionTypes(s, treno), ['fi2it', 'icon2it']);
  s.resources.science = 100;
  assert.equal(research(s, 'articoli'), false, 'vaatii alfabeton');
  assert.equal(research(s, 'alfabeto'), true);
  assert.equal(research(s, 'articoli'), true);
  assert.deepEqual(questionTypes(s, treno, { speech: true }), ['fi2it', 'icon2it', 'it2fi', 'article']);
  assert.equal(research(s, 'ascolto'), true);
  assert.ok(questionTypes(s, treno, { speech: true }).includes('listen'));
  assert.ok(!questionTypes(s, treno, { speech: false }).includes('listen'), 'kuuntelu vaatii puhesynteesin');
});

test('artikkelit ja kysymysten vaihtoehdot', () => {
  assert.deepEqual(splitArticle("l'acqua"), { article: "l'", noun: 'acqua' });
  assert.deepEqual(splitArticle('lo zucchero'), { article: 'lo', noun: 'zucchero' });
  assert.equal(splitArticle('ciao'), null);
  const s = defaultState();
  s.techs = ['alfabeto', 'articoli', 'ascolto'];
  const rand = mulberry32(5);
  for (let i = 0; i < 200; i++) {
    const w = WORDS[i % WORDS.length];
    const q = makeQuestion(s, w, WORDS, rand, { speech: true });
    assert.equal(q.options.length, 4, `${q.type} ${w.it}: neljä vaihtoehtoa`);
    assert.equal(new Set(q.options).size, 4, 'ei kaksoiskappaleita');
    assert.ok(q.options.includes(q.answer), 'oikea vastaus on mukana');
  }
});

test('Tessere-bonus kerran päivässä', () => {
  const s = defaultState();
  assert.equal(claimTessereBonus(s, {}, '2026-10-29'), false);
  assert.equal(claimTessereBonus(s, { '2026-10-29': {} }, '2026-10-29'), true);
  assert.equal(s.resources.gold, 4);
  assert.equal(claimTessereBonus(s, { '2026-10-29': {} }, '2026-10-29'), false);
  assert.ok(canAfford(s, { gold: 4 }));
});
