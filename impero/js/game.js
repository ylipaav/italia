// Imperon pelilogiikka ilman käyttöliittymää: tila, vuorot, kysymykset, rakentaminen ja tutkimus.

import { shuffle } from '../../shared/rng.js';
import { applyResult, loadJson, saveJson } from '../../shared/srs.js';
import {
  RESOURCES, THEME_RESOURCE, BUILDINGS, TECHS, TURNS_PER_DAY, QUESTIONS_PER_TURN, TESSERE_BONUS,
} from './data.js';

export const KEY = 'impero.v1';

export function defaultState() {
  return {
    resources: { food: 0, prod: 6, science: 0, gold: 0 }, // pieni perintö: Foro heti ensimmäisen vuoron jälkeen
    buildings: [],
    techs: [],
    pop: 1,
    food: 0, // kerätty ruoka seuraavaa asukasta varten
    turnsLeft: TURNS_PER_DAY,
    lastDay: null,
    turns: 0, // pelattuja vuoroja yhteensä
    answered: 0,
    correct: 0,
    tessereBonusDay: null,
    sound: true,
  };
}

export function loadState(storage) {
  return loadJson(storage, KEY, defaultState());
}

export function saveState(storage, state) {
  saveJson(storage, KEY, state);
}

// Uusi päivä palauttaa vuorot.
export function startDay(state, today) {
  if (state.lastDay !== today) {
    state.lastDay = today;
    state.turnsLeft = TURNS_PER_DAY;
  }
}

export const building = (id) => BUILDINGS.find((b) => b.id === id);
export const tech = (id) => TECHS.find((t) => t.id === id);
export const has = (state, id) => state.buildings.includes(id) || state.techs.includes(id);

export function gloria(state) {
  const fromBuildings = state.buildings.reduce((a, id) => a + (building(id).gloria ?? 0), 0);
  return state.pop * 5 + fromBuildings + state.techs.length * 5;
}

// Seuraava asukas maksaa yhä enemmän ruokaa.
export const foodForNextPop = (state) => 10 + state.pop * 5;

export function canAfford(state, cost) {
  return Object.entries(cost).every(([r, n]) => state.resources[r] >= n);
}

export function requirementsMet(state, item) {
  return (item.requires ?? []).every((id) => has(state, id));
}

export function build(state, id) {
  const b = building(id);
  if (!b || has(state, id) || !requirementsMet(state, b) || !canAfford(state, b.cost)) return false;
  for (const [r, n] of Object.entries(b.cost)) state.resources[r] -= n;
  state.buildings.push(id);
  if (b.pop) state.pop += b.pop;
  return true;
}

export function research(state, id) {
  const t = tech(id);
  if (!t || has(state, id) || !requirementsMet(state, t) || state.resources.science < t.cost) return false;
  state.resources.science -= t.cost;
  state.techs.push(id);
  return true;
}

// ---------- Kysymykset ----------

const ARTICLES = ['il', 'lo', 'la', "l'", 'i', 'gli', 'le'];

export function splitArticle(it) {
  const m = it.match(/^(l')(.+)$/) ?? it.match(/^(il|lo|la|i|gli|le) (.+)$/);
  return m ? { article: m[1], noun: m[2] } : null;
}

// Käytettävissä olevat tehtävätyypit sanalle pelaajan tutkimusten mukaan.
export function questionTypes(state, word, { speech = false } = {}) {
  const types = ['fi2it'];
  if (word.icon) types.push('icon2it');
  if (has(state, 'alfabeto')) types.push('it2fi');
  if (has(state, 'ascolto') && speech) types.push('listen');
  if (has(state, 'articoli') && splitArticle(word.it)) types.push('article');
  return types;
}

export function resourceFor(word) {
  return THEME_RESOURCE[word.theme] ?? 'gold';
}

// Yksi oikea vastaus tuottaa 2 resurssia, isompi kaupunki enemmän, tutkimukset tuplaavat.
export function yieldFor(state, word) {
  const r = resourceFor(word);
  let n = 2 + Math.floor(state.pop / 4);
  if (r === 'gold' && has(state, 'commercio')) n *= 2;
  if (r === 'food' && has(state, 'agricoltura')) n *= 2;
  return { resource: r, amount: n };
}

function distractors(word, all, rand, count = 3) {
  const same = all.filter((w) => w !== word && w.theme === word.theme);
  const rest = all.filter((w) => w !== word && w.theme !== word.theme);
  return [...shuffle(same, rand), ...shuffle(rest, rand)].slice(0, count);
}

export function makeQuestion(state, word, all, rand, opts) {
  const types = questionTypes(state, word, opts);
  const type = types[Math.floor(rand() * types.length)];
  const others = distractors(word, all, rand);

  if (type === 'article') {
    const { article, noun } = splitArticle(word.it);
    const options = shuffle([article, ...shuffle(ARTICLES.filter((a) => a !== article), rand).slice(0, 3)], rand);
    return { type, word, prompt: `___ ${noun}`, hint: word.fi, answer: article, options, say: null };
  }
  if (type === 'it2fi') {
    return { type, word, prompt: word.it, hint: null, answer: word.fi, options: shuffle([word, ...others], rand).map((w) => w.fi), say: word.it };
  }
  if (type === 'listen') {
    return { type, word, prompt: '🔊', hint: 'Kuuntele ja valitse käännös', answer: word.fi, options: shuffle([word, ...others], rand).map((w) => w.fi), say: word.it };
  }
  const prompt = type === 'icon2it' ? word.icon : word.fi;
  return { type, word, prompt, hint: type === 'icon2it' ? null : word.icon ?? null, answer: word.it, options: shuffle([word, ...others], rand).map((w) => w.it), say: null };
}

// ---------- Vuoro ----------

// Vuoron sanat: noin 40 % erääntyneitä kertaussanoja, loput uusia sanoja niin, että
// resurssit vuorottelevat (🌾 🔨 📜 💰). Muuten alkupelissä tulisi pelkkiä tervehdyksiä.
export function pickTurnWords(words, progress, today, count, rand) {
  const dueOf = (w) => progress[w.it]?.due ?? '';
  const due = words.filter((w) => progress[w.it] && progress[w.it].due <= today).sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  const chosen = due.slice(0, Math.round(count * 0.4));

  const fresh = shuffle(words.filter((w) => !progress[w.it]), rand);
  const byResource = {};
  for (const w of fresh) (byResource[resourceFor(w)] ??= []).push(w);
  const order = shuffle(Object.keys(RESOURCES), rand);
  for (let i = 0; chosen.length < count && Object.values(byResource).some((l) => l.length); i++) {
    const w = byResource[order[i % order.length]]?.shift();
    if (w) chosen.push(w);
  }
  for (const w of [...due, ...words.slice().sort((a, b) => dueOf(a).localeCompare(dueOf(b)))]) {
    if (chosen.length >= count) break;
    if (!chosen.includes(w)) chosen.push(w);
  }
  return shuffle(chosen, rand);
}

export function startTurn(state, words, progress, today, rand, opts) {
  if (state.turnsLeft <= 0) return null;
  const picked = pickTurnWords(words, progress, today, QUESTIONS_PER_TURN, rand);
  return {
    questions: picked.map((w) => makeQuestion(state, w, words, rand, opts)),
    index: 0,
    results: [],
    earned: { food: 0, prod: 0, science: 0, gold: 0 },
  };
}

// Palauttaa { correct, yield } ja siirtyy seuraavaan kysymykseen.
export function answer(state, turn, choice) {
  const q = turn.questions[turn.index];
  const correct = choice === q.answer;
  const y = yieldFor(state, q.word);
  if (correct) {
    state.resources[y.resource] += y.amount;
    turn.earned[y.resource] += y.amount;
  }
  state.answered++;
  if (correct) state.correct++;
  turn.results.push({ id: q.word.it, outcome: correct ? 'clean' : 'miss' });
  turn.index++;
  return { correct, yield: correct ? y : null, answer: q.answer };
}

export const turnDone = (turn) => turn.index >= turn.questions.length;

// Vuoron loppu: rakennusten tuotto, väestönkasvu ja kertaustilan päivitys.
export function endTurn(state, turn, progress, today) {
  const income = { food: 0, prod: 0, science: 0, gold: 0 };
  for (const id of state.buildings) {
    for (const [r, n] of Object.entries(building(id).yield ?? {})) {
      state.resources[r] += n;
      income[r] += n;
    }
  }
  // Ruoka kasvattaa väestöä: kerätty ruoka siirtyy varastoon, ja täysi varasto tuo asukkaan.
  state.food += turn.earned.food + income.food;
  let grown = 0;
  while (state.food >= foodForNextPop(state)) {
    state.food -= foodForNextPop(state);
    state.pop++;
    grown++;
  }
  applyResult(progress, turn.results, today);
  state.turnsLeft--;
  state.turns++;
  return { income, grown };
}

// Päivän Tessere-pöytä tuottaa kerran päivässä bonuksen kaikkiin resursseihin.
export function claimTessereBonus(state, tessereHistory, today) {
  if (state.tessereBonusDay === today || !tessereHistory?.[today]) return false;
  for (const r of Object.keys(RESOURCES)) state.resources[r] += TESSERE_BONUS;
  state.tessereBonusDay = today;
  return true;
}
