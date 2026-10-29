import { WORDS } from '../../shared/words.js';
import { LAYOUTS, pickLayout, flatLayout } from './layout.js';
import { generateBoard, isFree, isMatch, findFreePairs } from './board.js';
import { hashString, mulberry32 } from '../../shared/rng.js';
import {
  loadState, saveState, todayStr, pickWords, applyResult, updateStreak, currentStreak,
} from './progress.js';
import { speak, stopSpeech, speechSupported } from '../../shared/speech.js';
import { VERSION } from './version.js';
import {
  puzzleNumber, computeStats, wordStats, calendarWeeks, sequenceEmoji, shareText, formatTime,
} from './stats.js';

const $ = (id) => document.getElementById(id);
const boardEl = $('board');
const toastEl = $('toast');
const overlayEl = $('overlay');
const sheetEl = $('sheet');

const state = loadState(localStorage);
let game = null;
let timerId = null;
let toastTimer = null;

// ---------- Pelin kulku ----------

function startGame(mode) {
  const today = todayStr();
  const seed = mode === 'daily' ? hashString(`tessere-${today}`) : (Math.random() * 2 ** 32) >>> 0;
  const rand = mulberry32(seed);
  // Kehitysapu: ?layout=Portaat pakottaa pöytämuodon.
  const forced = new URLSearchParams(location.search).get('layout');
  const layout = LAYOUTS.find((l) => l.name === forced) ?? pickLayout(rand);
  const words = pickWords(WORDS, state.words, today, layout.tiles.length / 2, rand);
  const { tiles } = generateBoard(layout.tiles, words, rand);

  game = {
    mode, today, rand, words, tiles, layout,
    selected: null,
    mistakes: 0,
    hints: 0,
    missed: new Set(),
    hinted: new Set(),
    sequence: [], // parien ratkaisutapa järjestyksessä jakotekstiä varten
    start: Date.now(),
    seconds: 0,
    done: false,
  };
  $('mode-label').textContent = `${mode === 'daily' ? 'Päivän pöytä' : 'Harjoitus'} · ${layout.name}`;
  closeOverlay();
  renderBoard();
  startTimer();
}

function onTileClick(tile) {
  if (!game || game.done) return;
  stopSpeech();

  if (!isFree(tile, game.tiles)) {
    nudge(tile, 'blocked');
    return;
  }
  const sel = game.selected;
  if (!sel || sel === tile || sel.lang === tile.lang) {
    // Saman kielen laatta vaihtaa valinnan, se ei ole virhe.
    game.selected = sel === tile ? null : tile;
    updateTiles();
    return;
  }

  game.selected = null;
  if (isMatch(sel, tile)) {
    removePair(sel, tile);
  } else {
    game.mistakes++;
    game.missed.add(sel.pairId);
    game.missed.add(tile.pairId);
    nudge(sel, 'wrong');
    nudge(tile, 'wrong');
    showToast(`${pairLine(sel.word)}<br>${pairLine(tile.word)}`, 'wrong', 3200);
    updateTiles();
  }
}

function removePair(a, b) {
  game.tiles = game.tiles.filter((t) => t !== a && t !== b);
  game.sequence.push(game.missed.has(a.pairId) ? 'miss' : game.hinted.has(a.pairId) ? 'hint' : 'clean');
  for (const t of [a, b]) {
    const el = tileEl(t);
    el?.classList.add('gone');
    setTimeout(() => el?.remove(), 280);
  }
  showToast(`✓ ${pairLine(a.word)}`, 'ok', 1600);
  if (state.sound) speak(a.word.it);
  updateTiles();

  if (game.tiles.length === 0) {
    finishGame();
  } else if (findFreePairs(game.tiles).length === 0) {
    showToast('Ei enää pareja esillä – sekoita laatat 🔀', 'info', 3500);
  }
}

function useHint() {
  if (!game || game.done) return;
  const pairs = findFreePairs(game.tiles);
  if (pairs.length === 0) {
    showToast('Ei pareja esillä – sekoita laatat 🔀', 'info', 2500);
    return;
  }
  const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
  game.hints++;
  game.hinted.add(a.pairId);
  for (const t of [a, b]) {
    const el = tileEl(t);
    el?.classList.add('hint');
    setTimeout(() => el?.classList.remove('hint'), 1600);
  }
}

function shuffleBoard() {
  if (!game || game.done || game.tiles.length === 0) return;
  const positions = game.tiles.map(({ x, y, z }) => ({ x, y, z }));
  const words = [...new Map(game.tiles.map((t) => [t.pairId, t.word])).values()];
  // Jos jäljellä olevista paikoista ei saa ratkaistavaa, levitetään laatat yhteen kerrokseen.
  const result = generateBoard(positions, words, game.rand, 100)
    ?? generateBoard(flatLayout(positions.length), words, game.rand);
  game.tiles = result.tiles;
  game.selected = null;
  renderBoard();
}

function finishGame() {
  game.done = true;
  stopTimer();
  const results = game.words.map((w) => ({
    id: w.it,
    outcome: game.missed.has(w.it) ? 'miss' : game.hinted.has(w.it) ? 'hint' : 'clean',
  }));
  applyResult(state.words, results, game.today);
  const summary = {
    date: game.today,
    layout: game.layout.name,
    seconds: game.seconds,
    mistakes: game.mistakes,
    hints: game.hints,
    pairs: game.words.length,
    sequence: game.sequence,
    words: results.map((r, i) => ({ ...r, fi: game.words[i].fi, it: game.words[i].it, icon: game.words[i].icon })),
  };
  if (game.mode === 'daily') {
    updateStreak(state, game.today);
    state.daily = summary;
    const { words: _words, ...record } = summary;
    state.history[game.today] = record;
  } else {
    state.practice = (state.practice ?? 0) + 1;
  }
  saveState(localStorage, state);
  updateStreakLabel();
  setTimeout(() => showSummary(summary, game.mode), 400);
}

// ---------- Piirtäminen ----------

const ICON_MODES = ['none', 'some', 'all'];
const ICON_LABELS = { none: 'Aa', some: '🍕Aa', all: '🍕' };
const ICON_TOASTS = { none: 'Suomen sanat tekstinä', some: 'Osa suomen sanoista kuvakkeina', all: 'Kaikki mahdolliset suomen sanat kuvakkeina' };

// Näytetäänkö sanan suomenkielinen laatta kuvakkeena. Osa-tilassa valinta on päiväkohtainen
// mutta pysyvä, joten laatta ei vaihdu kesken pelin.
function showIcon(word) {
  if (!word.icon || state.icons === 'none') return false;
  if (state.icons === 'all') return true;
  return hashString(`${word.it}-${game.today}`) % 2 === 0;
}

const LAYER_SHIFT = 6;

function renderBoard() {
  boardEl.innerHTML = '';
  if (!game) return;
  const all = [...game.layout.tiles, ...game.tiles];
  const maxX = Math.max(...all.map((p) => p.x)) + 2;
  const maxY = Math.max(...all.map((p) => p.y)) + 2;
  const maxZ = Math.max(...all.map((p) => p.z));

  const wrap = getComputedStyle(boardEl.parentElement);
  const innerW = boardEl.parentElement.clientWidth - parseFloat(wrap.paddingLeft) - parseFloat(wrap.paddingRight);
  const innerH = boardEl.parentElement.clientHeight - parseFloat(wrap.paddingTop) - parseFloat(wrap.paddingBottom);
  const availW = Math.min(innerW, 520) - maxZ * LAYER_SHIFT;
  const availH = innerH - maxZ * LAYER_SHIFT;
  // Laatat venyvät korkeussuunnassa täyttämään näytön, mutta pysyvät laatan muotoisina.
  let w = availW / (maxX / 2);
  const ratio = Math.min(1.1, Math.max(0.72, availH / (maxY / 2) / w));
  if ((maxY / 2) * w * ratio > availH) w = availH / ((maxY / 2) * ratio);
  const h = w * ratio;
  const baseFont = Math.max(11, Math.min(19, w * 0.18));

  boardEl.style.width = `${(maxX / 2) * w + maxZ * LAYER_SHIFT}px`;
  boardEl.style.height = `${(maxY / 2) * h + maxZ * LAYER_SHIFT}px`;

  for (const t of game.tiles) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tile ${t.lang}`;
    el.dataset.key = t.key;
    el.style.left = `${(t.x / 2) * w + (maxZ - t.z) * LAYER_SHIFT}px`;
    el.style.top = `${(t.y / 2) * h + (maxZ - t.z) * LAYER_SHIFT}px`;
    el.style.width = `${w - 2}px`;
    el.style.height = `${h - 2}px`;
    el.style.zIndex = String(t.z * 1000 + t.y * 10 + t.x);
    if (t.lang === 'fi' && showIcon(t.word)) {
      el.style.fontSize = `${w * 0.42}px`;
      el.innerHTML = `<span class="lang">FI</span><span class="word icon" role="img" aria-label="${escapeHtml(t.text)}">${t.word.icon}</span>`;
    } else {
      // Pienennetään fonttia, jos pisin sana ei muuten mahdu laatan leveyteen.
      const longest = Math.max(...t.text.split(' ').map((s) => s.length));
      el.style.fontSize = `${Math.max(10, Math.min(baseFont, (w - 14) / (longest * 0.62)))}px`;
      el.innerHTML = `<span class="lang">${t.lang.toUpperCase()}</span><span class="word">${escapeHtml(t.text)}</span>`;
    }
    el.addEventListener('click', () => onTileClick(t));
    boardEl.append(el);
  }
  updateTiles();
}

function updateTiles() {
  for (const t of game.tiles) {
    const el = tileEl(t);
    if (!el) continue;
    const free = isFree(t, game.tiles);
    el.classList.toggle('free', free);
    el.classList.toggle('selected', game.selected === t);
    el.setAttribute('aria-label', `${t.lang === 'fi' ? 'suomi' : 'italia'}: ${t.text}${free ? '' : ' (peitossa)'}`);
  }
  $('pairs-left').textContent = `${game.tiles.length / 2} paria`;
}

function tileEl(t) {
  return boardEl.querySelector(`[data-key="${t.key}"]`);
}

function nudge(t, cls) {
  const el = tileEl(t);
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // käynnistää animaation uudelleen
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 500);
}

// ---------- Ajastin, ilmoitukset, ikkunat ----------

function startTimer() {
  stopTimer();
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

function stopTimer() {
  clearInterval(timerId);
}

function updateTimer() {
  game.seconds = Math.floor((Date.now() - game.start) / 1000);
  $('timer').textContent = formatTime(game.seconds);
}

function showToast(html, kind, ms) {
  toastEl.innerHTML = html;
  toastEl.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function openOverlay(html) {
  sheetEl.innerHTML = html;
  overlayEl.hidden = false;
}

function closeOverlay() {
  overlayEl.hidden = true;
  stopSpeech();
}

function showSummary(summary, mode) {
  const title = mode === 'daily' ? `Pöytä #${puzzleNumber(summary.date)} ratkaistu! 🎉` : 'Harjoitus valmis! 👏';
  const rows = summary.words
    .map((w) => `
      <li class="${w.outcome}">
        <span class="mark">${w.outcome === 'clean' ? '✓' : w.outcome === 'hint' ? '💡' : '✗'}</span>
        <span class="it">${escapeHtml(w.it)}</span>
        <span class="fi">${w.icon ? `${w.icon} ` : ''}${escapeHtml(w.fi)}</span>
        ${speechSupported ? `<button class="say" type="button" data-say="${escapeHtml(w.it)}" aria-label="Kuuntele ${escapeHtml(w.it)}">🔊</button>` : ''}
      </li>`)
    .join('');
  openOverlay(`
    <h2>${title}</h2>
    <p class="stats">⏱ ${formatTime(summary.seconds)} · ✗ ${summary.mistakes} virhettä · 💡 ${summary.hints} vihjettä</p>
    <p class="stats">🔥 Putki: ${currentStreak(state, todayStr())} päivää (paras ${state.bestStreak})</p>
    ${summary.sequence?.length ? `<p class="sequence">${sequenceEmoji(summary.sequence).replace(/\n/g, '<br>')}</p>` : ''}
    <h3>Tämän pöydän sanat</h3>
    <ul class="wordlist">${rows}</ul>
    <div class="actions">
      ${mode === 'daily' ? '<button class="btn" type="button" data-action="share">📤 Jaa</button>' : ''}
      <button class="btn" type="button" data-action="stats">📊 Tilastot</button>
      <button class="btn primary" type="button" data-action="practice">Harjoittele</button>
    </div>
    <p class="note">Uusi päivän pöytä huomenna. Virheelliset sanat tulevat kertaukseen pian.</p>
  `);
}

function showHelp() {
  openOverlay(`
    <h2>Näin pelaat</h2>
    <ul class="help">
      <li>Etsi pari: <b>suomenkielinen</b> sana <span class="chip fi">FI</span> ja sen <b>italiankielinen</b> vastine <span class="chip it">IT</span>.</li>
      <li>Vain <b>vapaita</b> laattoja voi valita: niiden päällä ei ole toista laattaa ja vasen tai oikea sivu on tyhjä. Peitetyt laatat näkyvät tummempina.</li>
      <li>Oikea pari poistuu, ja alta paljastuu uusia laattoja.</li>
      <li>Väärästä parista näet oikeat käännökset, ja sanat palaavat pian kertaukseen.</li>
      <li>Osa suomen sanoista voi näkyä kuvakkeina (🍕 = pizza). Yläpalkin 🍕Aa-nappi vaihtaa: teksti, osa kuvakkeina tai kaikki kuvakkeina.</li>
      <li>Ääntämisen saa pois 🔊-napista oikeasta yläkulmasta. Uusi napautus keskeyttää lausunnan.</li>
      <li>Päivän pöytä vaihtuu joka päivä. Pelaa päivittäin, niin putki 🔥 kasvaa.</li>
    </ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Selvä!</button></div>
  `);
}

function showStats() {
  const today = todayStr();
  const st = computeStats(state, today);
  const ws = wordStats(WORDS, state.words);
  const pct = (n) => `${(n / ws.total) * 100}%`;
  const weeks = calendarWeeks(state.history, today);
  const cal = weeks
    .map((week) => week.map((d) => {
      const cls = ['day', d.played && 'played', d.clean && 'clean', d.today && 'today', d.future && 'future'].filter(Boolean).join(' ');
      return `<span class="${cls}" title="${d.date}">${d.day}</span>`;
    }).join(''))
    .join('');
  const tile = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  const played = Boolean(state.history[today]);
  openOverlay(`
    <h2>Tilastot</h2>
    <div class="statgrid">
      ${tile(st.played, 'pelattua päivää')}
      ${tile(`🔥 ${st.streak}`, 'putki nyt')}
      ${tile(st.bestStreak, 'paras putki')}
      ${tile(st.played ? formatTime(st.avgSeconds) : '–', 'keskiaika')}
      ${tile(st.played ? formatTime(st.bestSeconds) : '–', 'paras aika')}
      ${tile(st.played ? `${st.cleanRate} %` : '–', 'virheettömiä')}
    </div>
    <h3>Viimeiset ${weeks.length} viikkoa</h3>
    <div class="calendar">
      ${['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'].map((d) => `<span class="dow">${d}</span>`).join('')}
      ${cal}
    </div>
    <p class="legend"><span class="day played clean"></span> virheetön <span class="day played"></span> pelattu <span class="day today"></span> tänään</p>
    <h3>Sanasto · ${ws.total} sanaa</h3>
    <div class="bar">
      <span class="mastered" style="width:${pct(ws.mastered)}"></span><span class="learning" style="width:${pct(ws.learning)}"></span>
    </div>
    <p class="legend"><span class="dot mastered"></span> ${ws.mastered} hallussa <span class="dot learning"></span> ${ws.learning} kertauksessa <span class="dot fresh"></span> ${ws.fresh} oppimatta</p>
    <p class="stats">🀄 ${st.totalPairs} paria päivän pöydissä · ${st.practice} harjoituspöytää</p>
    <div class="actions">
      ${played ? '<button class="btn" type="button" data-action="share">📤 Jaa päivän tulos</button>' : ''}
      <button class="btn primary" type="button" data-action="${played ? 'summary' : 'close'}">${played ? 'Takaisin' : 'Sulje'}</button>
    </div>
  `);
}

async function shareResult() {
  const d = state.daily;
  if (!d) return;
  const text = shareText(d, state, todayStr());
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast('Tulos kopioitu leikepöydälle', 'ok', 2000);
  } catch {
    // Käyttäjä perui jakamisen.
  }
}

sheetEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.say) speak(btn.dataset.say);
  else if (btn.dataset.action === 'practice') startGame('practice');
  else if (btn.dataset.action === 'share') shareResult();
  else if (btn.dataset.action === 'stats') showStats();
  else if (btn.dataset.action === 'summary') showSummary(state.daily, 'daily');
  else if (btn.dataset.action === 'close') closeOverlay();
});

// Ohjeen voi sulkea taustaa napauttamalla, kun peli on kesken.
overlayEl.addEventListener('click', (e) => {
  if (e.target === overlayEl && game && !game.done) closeOverlay();
});

// ---------- Asetukset ja käynnistys ----------

function updateSoundButton() {
  const btn = $('sound-btn');
  btn.textContent = state.sound ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', String(state.sound));
}

function updateIconButton() {
  const btn = $('icon-btn');
  btn.textContent = ICON_LABELS[state.icons];
  btn.title = ICON_TOASTS[state.icons];
}

$('icon-btn').addEventListener('click', () => {
  state.icons = ICON_MODES[(ICON_MODES.indexOf(state.icons) + 1) % ICON_MODES.length];
  saveState(localStorage, state);
  updateIconButton();
  if (game && !game.done) renderBoard();
  showToast(ICON_TOASTS[state.icons], 'info', 1600);
});

function updateStreakLabel() {
  $('streak').textContent = `🔥 ${currentStreak(state, todayStr())}`;
}

$('sound-btn').addEventListener('click', () => {
  state.sound = !state.sound;
  if (!state.sound) stopSpeech();
  else speak('Pronto!'); // kuuluu heti, jotta tietää toimiiko ääni
  saveState(localStorage, state);
  updateSoundButton();
  showToast(state.sound ? 'Ääntäminen päällä' : 'Ääntäminen pois', 'info', 1400);
});
$('hint-btn').addEventListener('click', useHint);
$('shuffle-btn').addEventListener('click', shuffleBoard);
$('help-btn').addEventListener('click', showHelp);
$('stats-btn').addEventListener('click', showStats);

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderBoard, 150);
});

function pairLine(word) {
  const icon = word.icon ? `${word.icon} ` : '';
  return `<span class="pair">${icon}<b>${escapeHtml(word.fi)}</b> = <b>${escapeHtml(word.it)}</b></span>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

if (!speechSupported) {
  $('sound-btn').disabled = true;
  $('sound-btn').title = 'Selain ei tue puhesynteesiä';
}
updateSoundButton();
updateIconButton();
updateStreakLabel();
$('version').textContent = `Tessere v${VERSION}`;

if (state.daily?.date === todayStr()) {
  showSummary(state.daily, 'daily');
} else {
  startGame('daily');
  if (!state.lastDaily) showHelp();
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
