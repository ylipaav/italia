// Imperon pelilogiikka ilman käyttöliittymää: tila, aikakaudet, alueet, vuorot, kysymykset,
// rakentaminen, tutkimus, tapahtumat ja ihmeet.

import { shuffle } from '../../shared/rng.js';
import { applyResult, loadJson, saveJson, INTERVALS } from '../../shared/srs.js';
import {
  VERBS, PERSONS, passato, numberToItalian, PLURALS, PREPOSITIONS, AGREEMENTS, adjectiveForms,
} from '../../shared/grammar.js';
import {
  RESOURCES, THEME_RESOURCE, ERAS, REGIONS, BUILDINGS, TECHS, EVENTS, EVENT_CHANCE,
  TURNS_PER_DAY, QUESTIONS_PER_TURN, EXPEDITION_QUESTIONS, EXPEDITION_PASS, TESSERE_BONUS,
} from './data.js';

export const KEY = 'impero.v1';

export function defaultState() {
  return {
    resources: { food: 0, prod: 6, science: 0, gold: 0 }, // pieni perintö: Foro heti ensimmäisen vuoron jälkeen
    buildings: [],
    techs: [],
    cities: ['lazio'], // hallitut alueet; Roma on aina ensimmäinen
    pop: 1,
    food: 0, // kerätty ruoka seuraavaa asukasta varten
    gloriaBonus: 0, // tapahtumista kertynyt gloria
    turnsLeft: TURNS_PER_DAY,
    lastDay: null,
    turns: 0, // pelattuja vuoroja yhteensä
    answered: 0,
    correct: 0,
    tessereBonusDay: null,
    seenEras: ['regno'], // aikakaudet, joiden siirtymä on jo näytetty
    sound: true,
  };
}

export function loadState(storage) {
  const s = loadJson(storage, KEY, defaultState());
  // Vanhemmat tallennukset ennen karttaa ja aikakausia.
  s.cities ??= ['lazio'];
  s.gloriaBonus ??= 0;
  s.seenEras ??= ['regno'];
  return s;
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
export const region = (id) => REGIONS.find((r) => r.id === id);
export const has = (state, id) => state.buildings.includes(id) || state.techs.includes(id);
export const hasCity = (state, id) => state.cities.includes(id);

// ---------- Gloria ja aikakaudet ----------

export function gloria(state) {
  const fromBuildings = state.buildings.reduce((a, id) => a + (building(id)?.gloria ?? 0), 0);
  return state.pop * 5 + fromBuildings + state.techs.length * 5 + (state.cities.length - 1) * 10 + state.gloriaBonus;
}

export function currentEra(state) {
  const g = gloria(state);
  return [...ERAS].reverse().find((e) => g >= e.gloria);
}

export function nextEra(state) {
  const i = ERAS.indexOf(currentEra(state));
  return ERAS[i + 1] ?? null;
}

export const eraIndex = (id) => ERAS.findIndex((e) => e.id === id);
export const eraReached = (state, id) => eraIndex(currentEra(state).id) >= eraIndex(id);

// Palauttaa uuden aikakauden, jos siirtymää ei ole vielä näytetty.
export function newEra(state) {
  const era = currentEra(state);
  if (state.seenEras.includes(era.id)) return null;
  state.seenEras.push(era.id);
  return era;
}

// ---------- Rakentaminen ja tutkimus ----------

// Seuraava asukas maksaa yhä enemmän ruokaa.
export const foodForNextPop = (state) => 10 + state.pop * 5;

export function scaleCost(cost, factor) {
  return Object.fromEntries(Object.entries(cost).map(([r, n]) => [r, Math.max(1, Math.round(n * factor))]));
}

export function buildingCost(state, b) {
  return has(state, 'ingegneria') ? scaleCost(b.cost, 0.8) : b.cost;
}

export function canAfford(state, cost) {
  return Object.entries(cost).every(([r, n]) => state.resources[r] >= n);
}

export function pay(state, cost) {
  for (const [r, n] of Object.entries(cost)) state.resources[r] -= n;
}

// Montako aiheen sanaa on hallussa (kertausväli vähintään 14 päivää).
export const MASTERED_BOX = INTERVALS.indexOf(14);
export function masteredCount(progress, words, theme) {
  return words.filter((w) => w.theme === theme && (progress[w.it]?.box ?? 0) >= MASTERED_BOX).length;
}

// Miksi rakennusta ei voi rakentaa (null = voi). Järjestys: aikakausi, esivaatimukset, kaupungit, hallinta, varat.
export function buildBlocker(state, b, progress = {}, words = []) {
  if (!eraReached(state, b.era)) return { kind: 'era', era: ERAS.find((e) => e.id === b.era) };
  const missing = (b.requires ?? []).filter((id) => !has(state, id));
  if (missing.length) return { kind: 'requires', ids: missing };
  if (b.cities && state.cities.length < b.cities) return { kind: 'cities', count: b.cities };
  if (b.cityIn && !hasCity(state, b.cityIn)) return { kind: 'cityIn', region: region(b.cityIn) };
  if (b.mastery) {
    const n = masteredCount(progress, words, b.mastery.theme);
    if (n < b.mastery.count) return { kind: 'mastery', theme: b.mastery.theme, have: n, need: b.mastery.count };
  }
  if (!canAfford(state, buildingCost(state, b))) return { kind: 'cost' };
  return null;
}

export function build(state, id, progress = {}, words = []) {
  const b = building(id);
  if (!b || has(state, id) || buildBlocker(state, b, progress, words)) return false;
  pay(state, buildingCost(state, b));
  state.buildings.push(id);
  if (b.pop) state.pop += b.pop;
  return true;
}

export function requirementsMet(state, item) {
  return (item.requires ?? []).every((id) => has(state, id));
}

export function research(state, id) {
  const t = tech(id);
  if (!t || has(state, id) || !requirementsMet(state, t) || state.resources.science < t.cost) return false;
  state.resources.science -= t.cost;
  state.techs.push(id);
  return true;
}

// ---------- Alueet ja tutkimusmatkat ----------

export function expeditionCost(state, r) {
  return has(state, 'esplorazione') ? scaleCost(r.cost, 0.7) : r.cost;
}

// Alueen tila kartalla: owned, available (naapuri hallussa), sea (vaatii navigoinnin) tai hidden.
export function regionStatus(state, r) {
  if (hasCity(state, r.id)) return 'owned';
  const adjacent = r.neighbors.some((n) => hasCity(state, n));
  if (!adjacent) return 'hidden';
  const crossing = r.sea || !r.neighbors.some((n) => hasCity(state, n) && !region(n).sea && !r.sea);
  if ((r.sea || crossing) && !has(state, 'navigazione') && r.sea) return 'sea';
  return 'available';
}

export function expeditionBlocker(state, r) {
  const status = regionStatus(state, r);
  if (status === 'owned') return { kind: 'owned' };
  if (status === 'hidden') return { kind: 'hidden' };
  if (status === 'sea') return { kind: 'sea' };
  if (state.turnsLeft <= 0) return { kind: 'turns' };
  if (!canAfford(state, expeditionCost(state, r))) return { kind: 'cost' };
  return null;
}

// ---------- Kysymykset ----------

const ARTICLES = ['il', 'lo', 'la', "l'", 'i', 'gli', 'le'];

export function splitArticle(it) {
  const m = it.match(/^(l')(.+)$/) ?? it.match(/^(il|lo|la|i|gli|le) (.+)$/);
  return m ? { article: m[1], noun: m[2] } : null;
}

// Tehtävätyypit, jotka pelaajan tutkimukset ovat avanneet (sanasta riippumattomat erikseen).
export function unlockedTypes(state, { speech = false } = {}) {
  const types = new Set(['fi2it', 'icon2it']);
  for (const t of TECHS) if (t.unlock && has(state, t.id)) types.add(t.unlock);
  if (!speech) {
    types.delete('listen');
    // Hintatehtävä toimii myös ilman puhetta lukutehtävänä, joten se jää.
  }
  return types;
}

// Käytettävissä olevat tehtävätyypit sanalle.
export function questionTypes(state, word, opts = {}) {
  const u = unlockedTypes(state, opts);
  const types = ['fi2it'];
  if (word.icon) types.push('icon2it');
  if (u.has('it2fi')) types.push('it2fi');
  if (u.has('listen')) types.push('listen');
  if (u.has('article') && splitArticle(word.it)) types.push('article');
  if (u.has('plural') && PLURALS.some(([sg]) => sg === word.it)) types.push('plural');
  return types;
}

export function resourceFor(word) {
  return THEME_RESOURCE[word.theme] ?? 'gold';
}

// Yksi oikea vastaus tuottaa 2 resurssia; väestö, tutkimukset, kaupungit ja ihmeet lisäävät.
export function yieldFor(state, word) {
  const r = resourceFor(word);
  let n = 2 + Math.floor(state.pop / 4);
  if (r === 'gold' && has(state, 'commercio')) n *= 2;
  if (r === 'food' && has(state, 'agricoltura')) n *= 2;
  if (word.theme === 'Kulttuuri' && has(state, 'cultura')) n *= 2;
  for (const id of state.cities) if (region(id).bonusTheme === word.theme) n += 1;
  for (const id of state.buildings) if (building(id)?.bonusTheme === word.theme) n += 1;
  return { resource: r, amount: n };
}

function distractors(word, all, rand, count = 3) {
  const same = all.filter((w) => w !== word && w.theme === word.theme);
  const rest = all.filter((w) => w !== word && w.theme !== word.theme);
  return [...shuffle(same, rand), ...shuffle(rest, rand)].slice(0, count);
}

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
// Poistaa kaksoiskappaleet: esim. essere-verbin "sono" on sekä io- että loro-muoto.
const withOptions = (answer, pool, rand) => shuffle([answer, ...shuffle([...new Set(pool)].filter((x) => x !== answer), rand).slice(0, 3)], rand);

// Sanaan sidottu kysymys.
export function makeQuestion(state, word, all, rand, opts) {
  const types = questionTypes(state, word, opts);
  const type = pick(types, rand);
  const others = distractors(word, all, rand);
  const base = { type, word, say: null, resource: resourceFor(word) };

  if (type === 'article') {
    const { article, noun } = splitArticle(word.it);
    return { ...base, prompt: `___ ${noun}`, hint: word.fi, answer: article, options: withOptions(article, ARTICLES, rand) };
  }
  if (type === 'plural') {
    const [, pl] = PLURALS.find(([sg]) => sg === word.it);
    return { ...base, prompt: `${word.it} → ?`, hint: 'monikko', answer: pl, options: withOptions(pl, PLURALS.map(([, p]) => p), rand) };
  }
  if (type === 'it2fi') {
    return { ...base, prompt: word.it, hint: null, answer: word.fi, options: shuffle([word, ...others], rand).map((w) => w.fi), say: word.it };
  }
  if (type === 'listen') {
    return { ...base, prompt: '🔊', hint: 'Kuuntele ja valitse käännös', answer: word.fi, options: shuffle([word, ...others], rand).map((w) => w.fi), say: word.it };
  }
  const prompt = type === 'icon2it' ? word.icon : word.fi;
  return { ...base, prompt, hint: type === 'icon2it' ? null : word.icon ?? null, answer: word.it, options: shuffle([word, ...others], rand).map((w) => w.it) };
}

// Kielioppikysymys, joka ei liity yksittäiseen sanaston sanaan. Tuottaa aina 📜.
export function makeGrammarQuestion(state, type, rand, { speech = false } = {}) {
  const base = { type, word: null, say: null, resource: 'science' };
  if (type === 'number') {
    const n = 1 + Math.floor(rand() * 20);
    const answer = numberToItalian(n);
    const pool = Array.from({ length: 20 }, (_, i) => numberToItalian(i + 1));
    return { ...base, prompt: String(n), hint: 'luku italiaksi', answer, options: withOptions(answer, pool, rand), say: answer, id: `number:${n}` };
  }
  if (type === 'price') {
    const n = 1 + Math.floor(rand() * 100);
    const time = rand() < 0.4;
    const words = time ? `le ${numberToItalian(Math.max(1, n % 24 || 1))}` : `${numberToItalian(n)} euro`;
    const value = time ? Math.max(1, n % 24 || 1) : n;
    const fmt = (v) => (time ? `klo ${v}` : `${v} €`);
    const pool = new Set([value]);
    while (pool.size < 4) pool.add(Math.max(1, value + Math.floor(rand() * 21) - 10));
    const options = shuffle([...pool].map(fmt), rand);
    const prompt = speech ? '🔊' : words;
    return { ...base, prompt, hint: speech ? 'Kuuntele ja valitse' : 'Mikä luku?', answer: fmt(value), options, say: words, id: `price:${words}` };
  }
  if (type === 'conj' || type === 'future') {
    const v = pick(VERBS, rand);
    const p = Math.floor(rand() * 6);
    const forms = type === 'conj' ? v.pres : v.fut;
    const answer = forms[p];
    const prefix = type === 'future' ? 'Domani ' : '';
    return { ...base, prompt: `${prefix}${PERSONS[p]} ___ (${v.inf})`, hint: v.fi, answer, options: withOptions(answer, forms, rand), say: `${PERSONS[p].split('/')[0]} ${answer}`, id: `${type}:${v.inf}` };
  }
  if (type === 'past') {
    const v = pick(VERBS, rand);
    const p = Math.floor(rand() * 6);
    const answer = passato(v, p);
    const pool = [0, 1, 2, 3, 4, 5].map((i) => passato(v, i));
    const alt = pick(VERBS.filter((x) => x !== v), rand);
    pool.push(passato(alt, p));
    return { ...base, prompt: `Ieri ${PERSONS[p]} ___ (${v.inf})`, hint: v.fi, answer, options: withOptions(answer, pool, rand), say: `${PERSONS[p].split('/')[0]} ${answer}`, id: `past:${v.inf}` };
  }
  if (type === 'prep') {
    const q = pick(PREPOSITIONS, rand);
    return { ...base, prompt: q.it, hint: q.fi, answer: q.answer, options: shuffle(q.options, rand), say: q.it.replace('___', q.answer), id: `prep:${q.it}` };
  }
  if (type === 'agree') {
    const q = pick(AGREEMENTS, rand);
    const forms = adjectiveForms(q.adj);
    const pool = forms.length >= 4 ? forms : [...forms, ...adjectiveForms(pick(AGREEMENTS.filter((x) => x.adj !== q.adj), rand).adj)];
    return { ...base, prompt: `${q.noun} ___ (${q.adj})`, hint: q.fi, answer: q.answer, options: withOptions(q.answer, pool, rand), say: `${q.noun} ${q.answer}`, id: `agree:${q.noun}` };
  }
  throw new Error(`Tuntematon kysymystyyppi ${type}`);
}

export const GRAMMAR_TYPES = ['number', 'price', 'conj', 'past', 'prep', 'agree', 'future'];

// ---------- Sanat ja vuoro ----------

// Kulttuurisanat tulevat mukaan renessanssissa tai La cultura -tutkimuksella.
export function availableWords(state, words) {
  const culture = eraReached(state, 'rinascimento') || has(state, 'cultura');
  return culture ? words : words.filter((w) => w.theme !== 'Kulttuuri');
}

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

// Tutkimusmatkan sanat: pääosin alueen teemasta.
export function pickExpeditionWords(words, theme, progress, today, count, rand) {
  const themed = shuffle(words.filter((w) => w.theme === theme), rand);
  const n = Math.min(themed.length, Math.ceil(count * 0.7));
  const rest = pickTurnWords(words.filter((w) => w.theme !== theme), progress, today, count - n, rand);
  return shuffle([...themed.slice(0, n), ...rest], rand);
}

function makeTurn(state, words, picked, rand, opts) {
  const questions = picked.map((w) => makeQuestion(state, w, words, rand, opts));
  // Avatut kielioppitehtävät korvaavat 1–2 sanakysymystä, jotta tutkimus näkyy heti pelissä.
  const grammar = GRAMMAR_TYPES.filter((t) => unlockedTypes(state, opts).has(t));
  if (grammar.length) {
    const slots = Math.min(2, questions.length - 1);
    for (let i = 0; i < slots; i++) {
      if (rand() < 0.6) questions[Math.floor(rand() * questions.length)] = makeGrammarQuestion(state, pick(grammar, rand), rand, opts);
    }
  }
  return { questions, index: 0, results: [], earned: { food: 0, prod: 0, science: 0, gold: 0 } };
}

export function startTurn(state, words, progress, today, rand, opts = {}) {
  if (state.turnsLeft <= 0) return null;
  const pool = availableWords(state, words);
  const picked = pickTurnWords(pool, progress, today, QUESTIONS_PER_TURN, rand);
  return { kind: 'turn', ...makeTurn(state, pool, picked, rand, opts) };
}

// Tutkimusmatka: maksaa heti, kuluttaa vuoron ja onnistuu, jos vähintään EXPEDITION_PASS oikein.
export function startExpedition(state, regionId, words, progress, today, rand, opts = {}) {
  const r = region(regionId);
  if (!r || expeditionBlocker(state, r)) return null;
  const cost = expeditionCost(state, r);
  pay(state, cost);
  const pool = availableWords(state, words);
  const picked = pickExpeditionWords(pool, r.theme, progress, today, EXPEDITION_QUESTIONS, rand);
  const turn = makeTurn(state, pool, picked, rand, opts);
  // Tutkimusmatkalla ei ole kielioppitehtäviä: ne eivät liity alueen teemaan.
  turn.questions = picked.map((w) => makeQuestion(state, w, pool, rand, opts));
  return { kind: 'expedition', region: r, cost, ...turn };
}

// Palauttaa { correct, yield, answer } ja siirtyy seuraavaan kysymykseen.
export function answer(state, turn, choice) {
  const q = turn.questions[turn.index];
  const correct = choice === q.answer;
  const y = q.word ? yieldFor(state, q.word) : { resource: 'science', amount: 2 + Math.floor(state.pop / 4) };
  if (correct) {
    state.resources[y.resource] += y.amount;
    turn.earned[y.resource] += y.amount;
  }
  state.answered++;
  if (correct) state.correct++;
  if (q.word) turn.results.push({ id: q.word.it, outcome: correct ? 'clean' : 'miss' });
  else turn.results.push({ id: q.id, outcome: correct ? 'clean' : 'miss', grammar: true });
  turn.index++;
  return { correct, yield: correct ? y : null, answer: q.answer };
}

export const turnDone = (turn) => turn.index >= turn.questions.length;

// Vuoron loppu: rakennusten ja kaupunkien tuotto, väestönkasvu, kertaustila ja tutkimusmatkan tulos.
export function endTurn(state, turn, progress, today) {
  const income = { food: 0, prod: 0, science: 0, gold: 0 };
  const add = (yieldObj) => {
    for (const [r, n] of Object.entries(yieldObj ?? {})) {
      state.resources[r] += n;
      income[r] += n;
    }
  };
  for (const id of state.buildings) {
    const b = building(id);
    add(b?.yield);
    if (b?.perCity) add(Object.fromEntries(Object.entries(b.perCity).map(([r, n]) => [r, n * state.cities.length])));
  }
  for (const id of state.cities) add(region(id).income);
  if (has(state, 'stampa')) add({ science: 2 });

  // Ruoka kasvattaa väestöä: kerätty ruoka siirtyy varastoon, ja täysi varasto tuo asukkaan.
  state.food += turn.earned.food + income.food;
  let grown = 0;
  while (state.food >= foodForNextPop(state)) {
    state.food -= foodForNextPop(state);
    state.pop++;
    grown++;
  }

  applyResult(progress, turn.results.filter((r) => !r.grammar), today);

  let expedition = null;
  if (turn.kind === 'expedition') {
    const right = turn.results.filter((r) => r.outcome === 'clean').length;
    const success = right >= EXPEDITION_PASS;
    if (success) {
      state.cities.push(turn.region.id);
      state.pop += 1;
    } else {
      // Epäonnistunut matka palauttaa puolet kustannuksista.
      for (const [r, n] of Object.entries(turn.cost)) state.resources[r] += Math.floor(n / 2);
    }
    expedition = { success, right, region: turn.region };
  }

  state.turnsLeft--;
  state.turns++;
  return { income, grown, expedition, era: newEra(state) };
}

// ---------- Tapahtumat ----------

// Vuoron alussa noin joka kolmannella vuorolla sopiva tapahtuma, tai null.
export function rollEvent(state, rand, month = new Date().getMonth() + 1) {
  if (rand() >= EVENT_CHANCE) return null;
  const pool = EVENTS.filter((e) => {
    if (e.months && !e.months.includes(month)) return false;
    if (e.needs?.city && !hasCity(state, e.needs.city)) return false;
    if (e.needs?.era && !eraReached(state, e.needs.era)) return false;
    return true;
  });
  // Kausitapahtumat ensin, jotta ne eivät huku yleisten joukkoon.
  const seasonal = pool.filter((e) => e.months);
  return pick(seasonal.length && rand() < 0.6 ? seasonal : pool, rand) ?? null;
}

// Soveltaa valinnan seuraukset. Resurssit eivät mene miinukselle.
export function applyEvent(state, event, optionIndex) {
  const opt = event.options[optionIndex];
  const applied = {};
  for (const [k, n] of Object.entries(opt.effect)) {
    if (k === 'gloria') {
      state.gloriaBonus += n;
      applied.gloria = n;
    } else {
      const real = Math.max(-state.resources[k], n);
      state.resources[k] += real;
      applied[k] = real;
    }
  }
  return { option: opt, applied };
}

// Päivän Tessere-pöytä tuottaa kerran päivässä bonuksen kaikkiin resursseihin.
export function claimTessereBonus(state, tessereHistory, today) {
  if (state.tessereBonusDay === today || !tessereHistory?.[today]) return false;
  for (const r of Object.keys(RESOURCES)) state.resources[r] += TESSERE_BONUS;
  state.tessereBonusDay = today;
  return true;
}
