import { WORDS } from './words.js';
import { LAYOUT, flatLayout } from './layout.js';
import { generateBoard, isFree, isMatch, findFreePairs } from './board.js';
import { hashString, mulberry32 } from './rng.js';
import {
  loadState, saveState, todayStr, pickWords, applyResult, updateStreak, currentStreak,
} from './progress.js';
import { speak, stopSpeech, speechSupported } from './speech.js';

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
  const words = pickWords(WORDS, state.words, today, LAYOUT.length / 2, rand);
  const { tiles } = generateBoard(LAYOUT, words, rand);

  game = {
    mode, today, rand, words, tiles,
    selected: null,
    mistakes: 0,
    hints: 0,
    missed: new Set(),
    hinted: new Set(),
    start: Date.now(),
    seconds: 0,
    done: false,
  };
  $('mode-label').textContent = mode === 'daily' ? 'Päivän pöytä' : 'Harjoitus';
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
    seconds: game.seconds,
    mistakes: game.mistakes,
    hints: game.hints,
    words: results.map((r, i) => ({ ...r, fi: game.words[i].fi, it: game.words[i].it })),
  };
  if (game.mode === 'daily') {
    updateStreak(state, game.today);
    state.daily = summary;
  }
  saveState(localStorage, state);
  updateStreakLabel();
  setTimeout(() => showSummary(summary, game.mode), 400);
}

// ---------- Piirtäminen ----------

const LAYER_SHIFT = 5;

function renderBoard() {
  boardEl.innerHTML = '';
  if (!game) return;
  const maxX = Math.max(...LAYOUT.map((p) => p.x), ...game.tiles.map((p) => p.x)) + 2;
  const maxY = Math.max(...LAYOUT.map((p) => p.y), ...game.tiles.map((p) => p.y)) + 2;
  const maxZ = Math.max(...LAYOUT.map((p) => p.z));

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
    // Pienennetään fonttia, jos pisin sana ei muuten mahdu laatan leveyteen.
    const longest = Math.max(...t.text.split(' ').map((s) => s.length));
    el.style.fontSize = `${Math.max(10, Math.min(baseFont, (w - 14) / (longest * 0.62)))}px`;
    el.innerHTML = `<span class="lang">${t.lang.toUpperCase()}</span><span class="word">${escapeHtml(t.text)}</span>`;
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
  const title = mode === 'daily' ? 'Päivän pöytä ratkaistu! 🎉' : 'Harjoitus valmis! 👏';
  const rows = summary.words
    .map((w) => `
      <li class="${w.outcome}">
        <span class="mark">${w.outcome === 'clean' ? '✓' : w.outcome === 'hint' ? '💡' : '✗'}</span>
        <span class="it">${escapeHtml(w.it)}</span>
        <span class="fi">${escapeHtml(w.fi)}</span>
        ${speechSupported ? `<button class="say" type="button" data-say="${escapeHtml(w.it)}" aria-label="Kuuntele ${escapeHtml(w.it)}">🔊</button>` : ''}
      </li>`)
    .join('');
  openOverlay(`
    <h2>${title}</h2>
    <p class="stats">⏱ ${formatTime(summary.seconds)} · ✗ ${summary.mistakes} virhettä · 💡 ${summary.hints} vihjettä</p>
    <p class="stats">🔥 Putki: ${currentStreak(state, todayStr())} päivää (paras ${state.bestStreak})</p>
    <h3>Tämän pöydän sanat</h3>
    <ul class="wordlist">${rows}</ul>
    <div class="actions">
      ${mode === 'daily' ? '<button class="btn" type="button" data-action="share">📤 Jaa tulos</button>' : ''}
      <button class="btn primary" type="button" data-action="practice">Harjoittele lisää</button>
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
      <li>Ääntämisen saa pois 🔊-napista oikeasta yläkulmasta. Uusi napautus keskeyttää lausunnan.</li>
      <li>Päivän pöytä vaihtuu joka päivä. Pelaa päivittäin, niin putki 🔥 kasvaa.</li>
    </ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Selvä!</button></div>
  `);
}

async function shareResult() {
  const d = state.daily;
  if (!d) return;
  const text = `Tessere 🇮🇹 ${d.date}\n🀄 ${d.words.length} paria · ⏱ ${formatTime(d.seconds)} · ✗ ${d.mistakes}\n🔥 ${currentStreak(state, todayStr())} päivän putki`;
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

function updateStreakLabel() {
  $('streak').textContent = `🔥 ${currentStreak(state, todayStr())}`;
}

$('sound-btn').addEventListener('click', () => {
  state.sound = !state.sound;
  if (!state.sound) stopSpeech();
  saveState(localStorage, state);
  updateSoundButton();
  showToast(state.sound ? 'Ääntäminen päällä' : 'Ääntäminen pois', 'info', 1400);
});
$('hint-btn').addEventListener('click', useHint);
$('shuffle-btn').addEventListener('click', shuffleBoard);
$('help-btn').addEventListener('click', showHelp);

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderBoard, 150);
});

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pairLine(word) {
  return `<span class="pair"><b>${escapeHtml(word.fi)}</b> = <b>${escapeHtml(word.it)}</b></span>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

if (!speechSupported) $('sound-btn').hidden = true;
updateSoundButton();
updateStreakLabel();

if (state.daily?.date === todayStr()) {
  showSummary(state.daily, 'daily');
} else {
  startGame('daily');
  if (!state.lastDaily) showHelp();
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
