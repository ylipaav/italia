// Edistyminen: jaksotettu kertaus (Leitner-laatikot), päivän putki ja tallennus.

import { shuffle } from './rng.js';

const KEY = 'tessere.v1';

// Laatikon numero → montako päivää seuraavaan kertaukseen.
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

export function defaultState() {
  return { words: {}, streak: 0, bestStreak: 0, lastDaily: null, daily: null, sound: true };
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    // Selain voi estää tallennuksen (esim. yksityinen tila): pelataan ilman sitä.
  }
  return defaultState();
}

export function saveState(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ks. yllä.
  }
}

export function todayStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// Noin 40 % erääntyneitä kertaussanoja, loput uusia sanalistan järjestyksessä.
export function pickWords(words, progress, today, count, rand) {
  const dueOf = (w) => progress[w.it]?.due ?? '';
  const due = words.filter((w) => progress[w.it] && progress[w.it].due <= today).sort((a, b) => dueOf(a).localeCompare(dueOf(b)));
  const fresh = words.filter((w) => !progress[w.it]);
  const reviewCap = Math.round(count * 0.4);

  const chosen = due.slice(0, reviewCap);
  const fill = (list) => {
    for (const w of list) {
      if (chosen.length >= count) return;
      if (!chosen.includes(w)) chosen.push(w);
    }
  };
  fill(fresh);
  fill(due);
  // Kaikki opittu eikä mitään erääntynyt: otetaan lähimpänä erääntymistä olevat.
  fill(words.slice().sort((a, b) => dueOf(a).localeCompare(dueOf(b))));
  return shuffle(chosen, rand);
}

// outcome: 'clean' (ei virheitä), 'hint' (vihje käytetty), 'miss' (väärä pari).
export function applyResult(progress, results, today) {
  for (const { id, outcome } of results) {
    const entry = progress[id] ?? { box: 0, seen: 0 };
    if (outcome === 'miss') entry.box = 1;
    else if (outcome === 'clean') entry.box = Math.min(entry.box + 1, INTERVALS.length - 1);
    else entry.box = Math.max(entry.box, 1);
    entry.due = addDays(today, INTERVALS[entry.box]);
    entry.seen += 1;
    progress[id] = entry;
  }
}

export function updateStreak(state, today) {
  if (state.lastDaily === today) return;
  state.streak = state.lastDaily === addDays(today, -1) ? state.streak + 1 : 1;
  state.lastDaily = today;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
}

// Näytettävä putki: katkeaa, jos eilinen ja tämä päivä ovat molemmat pelaamatta.
export function currentStreak(state, today) {
  if (state.lastDaily === today || state.lastDaily === addDays(today, -1)) return state.streak;
  return 0;
}
