import { test } from 'node:test';
import assert from 'node:assert/strict';

import { WORDS } from '../shared/words.js';
import { mulberry32 } from '../shared/rng.js';
import { numberToItalian, passato, VERBS, PLURALS } from '../shared/grammar.js';
import {
  BUILDINGS, TECHS, THEME_RESOURCE, REGIONS, ERAS, EVENTS, TURNS_PER_DAY, QUESTIONS_PER_TURN, EXPEDITION_PASS,
} from '../impero/js/data.js';
import {
  defaultState, loadState, startDay, build, buildBlocker, research, gloria, currentEra, nextEra, newEra,
  startTurn, answer, endTurn, turnDone, splitArticle, questionTypes, makeQuestion, makeGrammarQuestion, GRAMMAR_TYPES,
  claimTessereBonus, canAfford, foodForNextPop, pickTurnWords, resourceFor, regionStatus, expeditionBlocker,
  startExpedition, expeditionCost, rollEvent, applyEvent, availableWords, buildingCost, masteredCount,
} from '../impero/js/game.js';

const T = '2026-10-29';

test('pelidata on ehjää', () => {
  const ids = [...BUILDINGS, ...TECHS].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'tunnisteet yksilöllisiä');
  for (const x of [...BUILDINGS, ...TECHS]) {
    for (const r of x.requires ?? []) assert.ok(ids.includes(r), `${x.id} vaatii tuntemattoman ${r}`);
  }
  for (const b of BUILDINGS) {
    assert.ok(ERAS.some((e) => e.id === b.era), `${b.id}: tuntematon aikakausi`);
    if (b.mastery) assert.ok(WORDS.some((w) => w.theme === b.mastery.theme), `${b.id}: tuntematon teema`);
    if (b.wonder) assert.ok(b.fact && b.mastery, `${b.id}: ihmeellä pitää olla fact ja mastery`);
    if (b.cityIn) assert.ok(REGIONS.some((r) => r.id === b.cityIn));
  }
  const themes = new Set(WORDS.map((w) => w.theme));
  for (const t of themes) assert.ok(THEME_RESOURCE[t], `teemalla ${t} ei ole resurssia`);
  const rids = REGIONS.map((r) => r.id);
  assert.equal(new Set(rids).size, rids.length);
  for (const r of REGIONS) {
    assert.ok(themes.has(r.theme), `${r.id}: tuntematon teema ${r.theme}`);
    for (const n of r.neighbors) {
      assert.ok(rids.includes(n), `${r.id}: tuntematon naapuri ${n}`);
      assert.ok(REGIONS.find((x) => x.id === n).neighbors.includes(r.id), `${r.id}↔${n} ei ole symmetrinen`);
    }
    if (!r.start) assert.ok(r.cost && r.desc);
  }
  for (const e of EVENTS) {
    assert.equal(e.options.length, 2, `${e.id}: kaksi vaihtoehtoa`);
    for (const o of e.options) assert.ok(o.it && o.fi && o.effect, `${e.id}: vaihtoehto puutteellinen`);
  }
  assert.equal(ERAS[0].gloria, 0);
  for (let i = 1; i < ERAS.length; i++) assert.ok(ERAS[i].gloria > ERAS[i - 1].gloria);
});

test('uusi päivä palauttaa vuorot, vuoro kuluttaa ne', () => {
  const s = defaultState();
  const progress = {};
  const rand = mulberry32(3);
  startDay(s, T);
  assert.equal(s.turnsLeft, TURNS_PER_DAY);
  for (let i = 0; i < TURNS_PER_DAY; i++) {
    const turn = startTurn(s, WORDS, progress, T, rand);
    assert.equal(turn.kind, 'turn');
    assert.equal(turn.questions.length, QUESTIONS_PER_TURN);
    while (!turnDone(turn)) answer(s, turn, turn.questions[turn.index].answer);
    endTurn(s, turn, progress, T);
  }
  assert.equal(s.turnsLeft, 0);
  assert.equal(startTurn(s, WORDS, progress, T, rand), null);
  assert.equal(s.correct, TURNS_PER_DAY * QUESTIONS_PER_TURN);
  assert.equal(Object.keys(progress).length, TURNS_PER_DAY * QUESTIONS_PER_TURN, 'kertaustila päivittyy');
  const start = Object.values(defaultState().resources).reduce((a, b) => a + b, 0);
  const total = Object.values(s.resources).reduce((a, b) => a + b, 0);
  assert.equal(total - start, 2 * TURNS_PER_DAY * QUESTIONS_PER_TURN, 'oikea vastaus tuottaa 2');
  startDay(s, T);
  assert.equal(s.turnsLeft, 0, 'sama päivä ei palauta vuoroja');
  startDay(s, '2026-10-30');
  assert.equal(s.turnsLeft, TURNS_PER_DAY);
});

test('väärä vastaus ei tuota mitään ja merkitsee sanan virheeksi', () => {
  const s = defaultState();
  const progress = {};
  const turn = startTurn(s, WORDS, progress, T, mulberry32(1));
  const q = turn.questions[0];
  const wrong = q.options.find((o) => o !== q.answer);
  const r = answer(s, turn, wrong);
  assert.equal(r.correct, false);
  assert.equal(r.answer, q.answer);
  assert.deepEqual(s.resources, defaultState().resources);
  assert.equal(turn.results[0].outcome, 'miss');
});

test('uuden pelaajan vuoro tuottaa kaikkia resursseja, kulttuurisanat vasta myöhemmin', () => {
  const pool = availableWords(defaultState(), WORDS);
  assert.ok(!pool.some((w) => w.theme === 'Kulttuuri'));
  for (let seed = 1; seed <= 20; seed++) {
    const picked = pickTurnWords(pool, {}, T, QUESTIONS_PER_TURN, mulberry32(seed));
    assert.equal(picked.length, QUESTIONS_PER_TURN);
    assert.equal(new Set(picked.map(resourceFor)).size, 4, `siemen ${seed}: neljä resurssia`);
  }
  const progress = {};
  for (const w of WORDS.slice(0, 10)) progress[w.it] = { box: 1, due: '2026-10-01', seen: 1 };
  const picked = pickTurnWords(pool, progress, T, QUESTIONS_PER_TURN, mulberry32(1));
  assert.equal(picked.filter((w) => progress[w.it]).length, 2, 'noin 40 % kertausta');
  const s = defaultState();
  s.techs = ['cultura'];
  assert.ok(availableWords(s, WORDS).some((w) => w.theme === 'Kulttuuri'));
});

test('rakentaminen: aikakausi, esivaatimukset, kaupungit, hallinta ja varat', () => {
  const s = defaultState();
  assert.equal(buildBlocker(s, BUILDINGS.find((b) => b.id === 'foro')).kind, 'cost');
  s.resources.prod = 500;
  s.resources.science = 500;
  s.resources.gold = 500;
  assert.equal(buildBlocker(s, BUILDINGS.find((b) => b.id === 'acquedotto')).kind, 'era', 'Repubblica vaaditaan');
  assert.equal(build(s, 'foro'), true);
  assert.equal(s.resources.prod, 490);
  assert.equal(build(s, 'foro'), false, 'ei kahdesti');
  s.gloriaBonus = 100; // Repubblica
  assert.equal(buildBlocker(s, BUILDINGS.find((b) => b.id === 'terme')).kind, 'requires');
  assert.equal(buildBlocker(s, BUILDINGS.find((b) => b.id === 'porto')).kind, 'cities');
  assert.equal(build(s, 'acquedotto'), true);
  assert.equal(s.pop, 3);
  s.gloriaBonus = 300; // Impero
  assert.equal(build(s, 'anfiteatro'), true);
  const col = BUILDINGS.find((b) => b.id === 'colosseo');
  assert.equal(buildBlocker(s, col, {}, WORDS).kind, 'mastery');
  const progress = {};
  for (const w of WORDS.filter((w) => w.theme === 'Ihmiset').slice(0, 3)) progress[w.it] = { box: 4 };
  assert.equal(masteredCount(progress, WORDS, 'Ihmiset'), 3);
  assert.equal(build(s, 'colosseo', progress, WORDS), true);
  s.gloriaBonus = 1000;
  assert.equal(buildBlocker(s, BUILDINGS.find((b) => b.id === 'duomo'), {}, WORDS).kind, 'cityIn');
  const turn = { kind: 'turn', earned: { food: 0, prod: 0, science: 0, gold: 0 }, results: [] };
  const { income } = endTurn(s, turn, {}, T);
  assert.equal(income.gold, 1, 'Foro tuottaa');
});

test('L’ingegneria alentaa rakennusten hintaa', () => {
  const s = defaultState();
  const b = BUILDINGS.find((x) => x.id === 'anfiteatro');
  assert.deepEqual(buildingCost(s, b), { prod: 40, gold: 20 });
  s.techs = ['ingegneria'];
  assert.deepEqual(buildingCost(s, b), { prod: 32, gold: 16 });
});

test('ruoka kasvattaa väestöä', () => {
  const s = defaultState();
  const need = foodForNextPop(s);
  const turn = { kind: 'turn', earned: { food: need, prod: 0, science: 0, gold: 0 }, results: [] };
  const { grown } = endTurn(s, turn, {}, T);
  assert.equal(grown, 1);
  assert.equal(s.pop, 2);
  assert.equal(s.food, 0);
});

test('aikakaudet vaihtuvat glorian mukaan ja siirtymä näytetään kerran', () => {
  const s = defaultState();
  assert.equal(currentEra(s).id, 'regno');
  assert.equal(nextEra(s).id, 'repubblica');
  assert.equal(newEra(s), null, 'Regno on jo nähty');
  s.gloriaBonus = 60 - gloria(s);
  assert.equal(currentEra(s).id, 'repubblica');
  assert.equal(newEra(s).id, 'repubblica');
  assert.equal(newEra(s), null);
  s.gloriaBonus = 1000;
  assert.equal(currentEra(s).id, 'moderna');
  assert.equal(nextEra(s), null);
});

test('kartta: naapurit avautuvat, meri vaatii navigoinnin, tutkimusmatka perustaa kaupungin', () => {
  const s = defaultState();
  const st = (id) => regionStatus(s, REGIONS.find((r) => r.id === id));
  assert.equal(st('lazio'), 'owned');
  assert.equal(st('toscana'), 'available');
  assert.equal(st('lombardia'), 'hidden');
  assert.equal(st('sardegna'), 'sea');
  s.techs = ['navigazione'];
  assert.equal(st('sardegna'), 'available');

  const toscana = REGIONS.find((r) => r.id === 'toscana');
  assert.equal(expeditionBlocker(s, toscana).kind, 'cost');
  s.resources.food = 100;
  s.resources.gold = 100;
  assert.equal(expeditionBlocker(s, toscana), null);
  const progress = {};
  const rand = mulberry32(9);
  const exp = startExpedition(s, 'toscana', WORDS, progress, T, rand);
  assert.equal(exp.kind, 'expedition');
  assert.equal(s.resources.food, 85, 'maksu heti');
  assert.ok(exp.questions.filter((q) => q.word.theme === 'Adjektiivit').length >= 4, 'tehtävät alueen teemasta');
  assert.ok(exp.questions.every((q) => q.word), 'ei kielioppitehtäviä');
  while (!turnDone(exp)) answer(s, exp, exp.questions[exp.index].answer);
  const res = endTurn(s, exp, progress, T);
  assert.equal(res.expedition.success, true);
  assert.ok(s.cities.includes('toscana'));
  assert.equal(s.pop, 2, 'uusi kaupunki tuo asukkaan');
  assert.equal(st('emilia'), 'available', 'uusi alue paljastaa naapurit');
  assert.ok(gloria(s) >= 10);

  // Epäonnistunut matka palauttaa puolet
  s.turnsLeft = 3;
  const before = { ...s.resources };
  const exp2 = startExpedition(s, 'umbria', WORDS, progress, T, rand);
  while (!turnDone(exp2)) answer(s, exp2, exp2.questions[exp2.index].options.find((o) => o !== exp2.questions[exp2.index].answer));
  const res2 = endTurn(s, exp2, progress, T);
  assert.equal(res2.expedition.success, false);
  assert.ok(!s.cities.includes('umbria'));
  assert.equal(s.resources.food, before.food - exp2.cost.food + Math.floor(exp2.cost.food / 2));
  assert.equal(res2.expedition.right, 0);
  assert.ok(EXPEDITION_PASS <= 6);

  // Kaupungin tuotto ja esplorazione-alennus
  s.techs.push('esplorazione');
  assert.deepEqual(expeditionCost(s, REGIONS.find((r) => r.id === 'lombardia')), { food: 18, gold: 21 });
  const turn = { kind: 'turn', earned: { food: 0, prod: 0, science: 0, gold: 0 }, results: [] };
  assert.equal(endTurn(s, turn, {}, T).income.science, 1, 'Firenze tuottaa +1 📜');
});

test('tutkimus avaa tehtävätyyppejä ja kielioppikysymykset ovat ehjiä', () => {
  const s = defaultState();
  const treno = WORDS.find((w) => w.it === 'il treno');
  assert.deepEqual(questionTypes(s, treno), ['fi2it', 'icon2it']);
  s.resources.science = 1000;
  assert.equal(research(s, 'articoli'), false, 'vaatii alfabeton');
  for (const t of TECHS) assert.equal(research(s, t.id), true, `tutkimus ${t.id} järjestyksessä`);
  assert.deepEqual(questionTypes(s, treno, { speech: true }), ['fi2it', 'icon2it', 'it2fi', 'listen', 'article', 'plural']);
  assert.ok(!questionTypes(s, treno, { speech: false }).includes('listen'), 'kuuntelu vaatii puhesynteesin');

  const rand = mulberry32(5);
  for (let i = 0; i < 300; i++) {
    const w = WORDS[i % WORDS.length];
    const q = makeQuestion(s, w, WORDS, rand, { speech: true });
    assert.equal(q.options.length, 4, `${q.type} ${w.it}: neljä vaihtoehtoa`);
    assert.equal(new Set(q.options).size, 4, `${q.type} ${w.it}: ei kaksoiskappaleita`);
    assert.ok(q.options.includes(q.answer), 'oikea vastaus on mukana');
  }
  for (const type of GRAMMAR_TYPES) {
    for (let i = 0; i < 100; i++) {
      for (const speech of [true, false]) {
        const q = makeGrammarQuestion(s, type, rand, { speech });
        assert.equal(q.options.length, 4, `${type}: neljä vaihtoehtoa (${q.prompt})`);
        assert.equal(new Set(q.options).size, 4, `${type}: ei kaksoiskappaleita (${q.options})`);
        assert.ok(q.options.includes(q.answer), `${type}: oikea vastaus mukana`);
        assert.ok(q.id, `${type}: tunniste`);
      }
    }
  }
  // Vuorossa on avattuja kielioppitehtäviä, ja ne tuottavat tiedettä.
  let grammarSeen = 0;
  for (let i = 0; i < 20; i++) {
    s.turnsLeft = 1;
    const turn = startTurn(s, WORDS, {}, T, rand, { speech: true });
    grammarSeen += turn.questions.filter((q) => !q.word).length;
    const gq = turn.questions.find((q) => !q.word);
    if (gq) {
      turn.index = turn.questions.indexOf(gq);
      const before = s.resources.science;
      assert.equal(answer(s, turn, gq.answer).correct, true);
      assert.ok(s.resources.science > before);
    }
  }
  assert.ok(grammarSeen > 5);
});

test('kielioppiaineisto', () => {
  assert.equal(numberToItalian(1), 'uno');
  assert.equal(numberToItalian(21), 'ventuno');
  assert.equal(numberToItalian(28), 'ventotto');
  assert.equal(numberToItalian(33), 'trentatré');
  assert.equal(numberToItalian(45), 'quarantacinque');
  assert.equal(numberToItalian(100), 'cento');
  const andare = VERBS.find((v) => v.inf === 'andare');
  assert.equal(passato(andare, 0), 'sono andato');
  assert.equal(passato(andare, 5), 'sono andati');
  assert.equal(passato(VERBS.find((v) => v.inf === 'mangiare'), 1), 'hai mangiato');
  for (const v of VERBS) {
    assert.equal(v.pres.length, 6, v.inf);
    assert.equal(v.fut.length, 6, v.inf);
  }
  for (const [sg] of PLURALS) assert.ok(WORDS.some((w) => w.it === sg), `${sg} ei ole sanastossa`);
});

test('artikkelit', () => {
  assert.deepEqual(splitArticle("l'acqua"), { article: "l'", noun: 'acqua' });
  assert.deepEqual(splitArticle('lo zucchero'), { article: 'lo', noun: 'zucchero' });
  assert.equal(splitArticle('ciao'), null);
});

test('tapahtumat: kausi, ehdot ja seuraukset', () => {
  const s = defaultState();
  const rand = mulberry32(2);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const e = rollEvent(s, rand, 6);
    if (e) seen.add(e.id);
  }
  assert.ok(seen.size >= 5);
  assert.ok(!seen.has('carnevale'), 'helmikuun tapahtuma ei tule kesäkuussa');
  assert.ok(!seen.has('vesuvio'), 'vaatii Napolin');
  assert.ok(!seen.has('artista'), 'vaatii renessanssin');
  const feb = new Set();
  for (let i = 0; i < 200; i++) {
    const e = rollEvent(s, rand, 2);
    if (e) feb.add(e.id);
  }
  assert.ok(feb.has('carnevale'));

  s.resources.gold = 3;
  const mercante = EVENTS.find((e) => e.id === 'mercante');
  const r = applyEvent(s, mercante, 0);
  assert.equal(s.resources.gold, 0, 'ei miinukselle');
  assert.equal(r.applied.gold, -3);
  assert.equal(s.resources.prod, 6 + 12);
  const festa = EVENTS.find((e) => e.id === 'festa');
  applyEvent(s, festa, 0);
  assert.equal(s.gloriaBonus, 4);
  assert.equal(gloria(s), 5 + 4);
});

test('vanha tallennus täydentyy uusilla kentillä', () => {
  const storage = { getItem: () => JSON.stringify({ resources: { food: 1, prod: 2, science: 3, gold: 4 }, buildings: ['foro'], techs: [], pop: 2, food: 0, turnsLeft: 1, lastDay: T, turns: 5, answered: 30, correct: 25, tessereBonusDay: null, sound: true }), setItem() {} };
  const s = loadState(storage);
  assert.deepEqual(s.cities, ['lazio']);
  assert.equal(s.gloriaBonus, 0);
  assert.deepEqual(s.seenEras, ['regno']);
  assert.equal(currentEra(s).id, 'regno');
});

test('Tessere-bonus kerran päivässä', () => {
  const s = defaultState();
  assert.equal(claimTessereBonus(s, {}, T), false);
  assert.equal(claimTessereBonus(s, { [T]: {} }, T), true);
  assert.equal(s.resources.gold, 4);
  assert.equal(claimTessereBonus(s, { [T]: {} }, T), false);
  assert.ok(canAfford(s, { gold: 4 }));
});
