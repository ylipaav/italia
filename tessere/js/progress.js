// Tesseren oma tila: päiväputki, päivän tulos, historia ja asetukset.
// Sanojen kertaustila on yhteinen pelien kesken, ks. shared/srs.js.

import {
  loadJson, saveJson, loadWordProgress, saveWordProgress, addDays,
} from '../../shared/srs.js';

export {
  INTERVALS, todayStr, addDays, pickWords, applyResult,
} from '../../shared/srs.js';

const KEY = 'tessere.v1';

export function defaultState() {
  return {
    words: {}, streak: 0, bestStreak: 0, lastDaily: null, daily: null, sound: true,
    icons: 'some', // 'none' | 'some' | 'all': näytetäänkö suomen sanat kuvakkeina, kun kuvake on
    history: {}, // päivämäärä → päivän pöydän tulos
    practice: 0, // pelattujen harjoituspöytien määrä
  };
}

export function loadState(storage) {
  const state = loadJson(storage, KEY, defaultState());
  // Sanojen edistyminen asui aiemmin Tesseren tilassa; siirretään se yhteiseen avaimeen kerran.
  const shared = loadWordProgress(storage);
  state.words = Object.keys(shared).length ? shared : state.words;
  return state;
}

export function saveState(storage, state) {
  const { words, ...own } = state;
  saveJson(storage, KEY, own);
  saveWordProgress(storage, words);
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
