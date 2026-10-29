// Jaksotettu kertaus (Leitner-laatikot), päivämääräapurit ja tallennus.
// Sanojen edistyminen on yhteinen kaikille peleille: sekä Tessere että Impero lukevat ja
// päivittävät samaa `italia.words.v1`-avainta, joten yhdessä pelissä opittu sana kertautuu toisessa.

import { shuffle } from './rng.js';

export const WORDS_KEY = 'italia.words.v1';

// Laatikon numero → montako päivää seuraavaan kertaukseen.
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];

export function loadJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch {
    // Selain voi estää tallennuksen (esim. yksityinen tila): pelataan ilman sitä.
  }
  return fallback;
}

export function saveJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ks. yllä.
  }
}

export function loadWordProgress(storage) {
  return loadJson(storage, WORDS_KEY, {});
}

export function saveWordProgress(storage, progress) {
  saveJson(storage, WORDS_KEY, progress);
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

// outcome: 'clean' (ei virheitä), 'hint' (vihje käytetty), 'miss' (väärä vastaus).
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
