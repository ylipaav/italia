// Tilastot, kalenteri ja jaettava tulos. Puhtaita funktioita, jotka lukevat tallennettua tilaa.

import { INTERVALS, addDays, currentStreak } from './progress.js';

// Päivän pöydän juokseva numero: ensimmäinen pöytä julkaistiin 2026-10-28.
const FIRST_DAILY = '2026-10-28';

export function puzzleNumber(date) {
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${FIRST_DAILY}T00:00:00Z`);
  return Math.round(ms / 86400000) + 1;
}

// Sanan tila kertauslaatikon mukaan: hallussa (väli 14 pv tai pidempi), kertauksessa tai uusi.
export const MASTERED_BOX = INTERVALS.indexOf(14);

export function wordStats(words, progress) {
  const out = { mastered: 0, learning: 0, fresh: 0, total: words.length };
  for (const w of words) {
    const e = progress[w.it];
    if (!e) out.fresh++;
    else if (e.box >= MASTERED_BOX) out.mastered++;
    else out.learning++;
  }
  return out;
}

export function computeStats(state, today) {
  const days = Object.values(state.history ?? {});
  const played = days.length;
  const sum = (key) => days.reduce((a, d) => a + (d[key] ?? 0), 0);
  const clean = days.filter((d) => d.mistakes === 0).length;
  return {
    played,
    streak: currentStreak(state, today),
    bestStreak: state.bestStreak,
    avgSeconds: played ? Math.round(sum('seconds') / played) : 0,
    bestSeconds: played ? Math.min(...days.map((d) => d.seconds)) : 0,
    cleanRate: played ? Math.round((clean / played) * 100) : 0,
    totalPairs: sum('pairs'),
    practice: state.practice ?? 0,
  };
}

// Viimeiset `weeks` viikkoa maanantaista sunnuntaihin, kuluva viikko viimeisenä.
export function calendarWeeks(history, today, weeks = 6) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // ma = 0
  let date = addDays(today, -dow - (weeks - 1) * 7);
  const out = [];
  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date,
        day: Number(date.slice(8)),
        played: Boolean(history?.[date]),
        clean: history?.[date]?.mistakes === 0,
        today: date === today,
        future: date > today,
      });
      date = addDays(date, 1);
    }
    out.push(week);
  }
  return out;
}

// Parien ratkaisujärjestys emojeina: 🟩 suoraan, 🟨 vihjeellä, 🟥 virheen kautta.
export function sequenceEmoji(sequence = []) {
  const map = { clean: '🟩', hint: '🟨', miss: '🟥' };
  const row = sequence.map((o) => map[o] ?? '⬜');
  const lines = [];
  for (let i = 0; i < row.length; i += 8) lines.push(row.slice(i, i + 8).join(''));
  return lines.join('\n');
}

export function shareText(summary, state, today) {
  const n = puzzleNumber(summary.date);
  const grid = sequenceEmoji(summary.sequence);
  const streak = currentStreak(state, today);
  return [
    `Tessere 🇮🇹 #${n}${summary.layout ? ` · ${summary.layout}` : ''}`,
    `⏱ ${formatTime(summary.seconds)} · ✗ ${summary.mistakes} · 💡 ${summary.hints}`,
    grid,
    streak > 1 ? `🔥 ${streak} päivän putki` : '',
  ].filter(Boolean).join('\n');
}

export function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
