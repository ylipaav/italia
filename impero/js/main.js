import { WORDS } from '../../shared/words.js';
import { mulberry32 } from '../../shared/rng.js';
import { todayStr, loadWordProgress, saveWordProgress, loadJson } from '../../shared/srs.js';
import { speak, stopSpeech, speechSupported } from '../../shared/speech.js';
import { RESOURCES, BUILDINGS, TECHS, TURNS_PER_DAY, TESSERE_BONUS } from './data.js';
import {
  loadState, saveState, startDay, build, research, gloria, has, requirementsMet, canAfford,
  foodForNextPop, startTurn, answer, turnDone, endTurn, claimTessereBonus,
} from './game.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);
const overlayEl = $('overlay');
const sheetEl = $('sheet');
const toastEl = $('toast');

const state = loadState(localStorage);
const progress = loadWordProgress(localStorage);
const rand = mulberry32((Math.random() * 2 ** 32) >>> 0);
let turn = null;
let toastTimer = null;

function save() {
  saveState(localStorage, state);
  saveWordProgress(localStorage, progress);
}

// ---------- Kaupunkinäkymä ----------

function renderCity(changed = []) {
  $('resources').innerHTML = Object.entries(RESOURCES)
    .map(([k, r]) => `<div class="res ${changed.includes(k) ? 'bump' : ''}"><b>${r.icon} ${state.resources[k]}</b><span>${r.name}</span></div>`)
    .join('');
  $('city-meta').innerHTML = `<span title="Asukkaat">👥 ${state.pop}</span><span title="Gloria">⭐ ${gloria(state)}</span>`;

  const built = BUILDINGS.filter((b) => has(state, b.id));
  $('skyline').innerHTML = built.length
    ? built.map((b) => `<div class="b ${b.wonder ? 'wonder' : ''}" title="${b.desc}">${b.icon}<small>${b.name}</small></div>`).join('')
    : '<p class="empty">Roma on vielä kylä. Pelaa vuoro, kerää 🔨 ja rakenna Foro.</p>';

  const need = foodForNextPop(state);
  $('growth').innerHTML = `Seuraava asukas: 🌾 ${state.food} / ${need}<span class="bar"><span style="width:${Math.min(100, (state.food / need) * 100)}%"></span></span>`;

  const btn = $('turn-btn');
  btn.disabled = state.turnsLeft <= 0;
  btn.innerHTML = state.turnsLeft > 0
    ? `▶ Vuoro<span class="sub">${state.turnsLeft}/${TURNS_PER_DAY} jäljellä tänään</span>`
    : `Vuorot käytetty<span class="sub">uudet huomenna</span>`;
}

// ---------- Vuoro ----------

function beginTurn() {
  turn = startTurn(state, WORDS, progress, todayStr(), rand, { speech: speechSupported && state.sound });
  if (!turn) return;
  renderQuestion();
}

function renderQuestion() {
  const q = turn.questions[turn.index];
  const typeLabel = {
    fi2it: 'Mikä on italiaksi?', icon2it: 'Mikä on italiaksi?', it2fi: 'Mitä tämä tarkoittaa?',
    listen: 'Kuuntele ja valitse käännös', article: 'Valitse artikkeli',
  }[q.type];
  const bars = turn.questions.map((_, i) => {
    const r = turn.results[i];
    return `<span class="${r ? (r.outcome === 'clean' ? 'done' : 'miss') : i === turn.index ? 'now' : ''}"></span>`;
  }).join('');
  const prompt = q.type === 'listen'
    ? `<button type="button" data-say="${esc(q.say)}" aria-label="Kuuntele uudelleen">🔊</button>`
    : esc(q.prompt);
  openSheet(`
    <div class="progress">${bars}</div>
    <p class="q-type">${turn.index + 1}/${turn.questions.length} · ${typeLabel}</p>
    <p class="q-prompt ${q.type === 'icon2it' ? 'icon' : ''}">${prompt}</p>
    <p class="q-hint">${q.hint ? esc(q.hint) : ''}</p>
    <div class="options">${q.options.map((o) => `<button class="opt" type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    <p class="q-feedback" id="feedback"></p>
  `);
  if (q.type === 'listen') speak(q.say);
}

function onOption(choice) {
  const q = turn.questions[turn.index];
  const result = answer(state, turn, choice);
  for (const btn of sheetEl.querySelectorAll('.opt')) {
    btn.disabled = true;
    if (btn.dataset.opt === result.answer) btn.classList.add('right');
    else if (btn.dataset.opt === choice) btn.classList.add('wrong');
    else btn.classList.add('dim');
  }
  const fb = $('feedback');
  if (result.correct) {
    fb.className = 'q-feedback ok';
    fb.textContent = `+${result.yield.amount} ${RESOURCES[result.yield.resource].icon} ${q.word.fi} = ${q.word.it}`;
  } else {
    fb.className = 'q-feedback bad';
    fb.textContent = `${q.word.fi} = ${q.word.it}`;
  }
  if (state.sound && q.type !== 'listen') speak(q.word.it);
  renderCity(result.correct ? [result.yield.resource] : []);
  setTimeout(() => (turnDone(turn) ? finishTurn() : renderQuestion()), result.correct ? 900 : 1800);
}

function finishTurn() {
  const today = todayStr();
  const { income, grown } = endTurn(state, turn, progress, today);
  const bonus = claimTessereBonus(state, loadJson(localStorage, 'tessere.v1', {}).history, today);
  save();
  renderCity(Object.keys(RESOURCES));
  const right = turn.results.filter((r) => r.outcome === 'clean').length;
  const chips = Object.entries(RESOURCES)
    .map(([k, r]) => `<div class="res"><b>+${turn.earned[k] + income[k] + (bonus ? TESSERE_BONUS : 0)}</b><span>${r.icon} ${r.name}</span></div>`)
    .join('');
  const incomeTotal = Object.values(income).reduce((a, b) => a + b, 0);
  openSheet(`
    <h2>Vuoro pelattu</h2>
    <p>${right}/${turn.questions.length} oikein${incomeTotal ? ` · rakennukset tuottivat ${incomeTotal}` : ''}${bonus ? ` · 🀄 Tessere-bonus +${TESSERE_BONUS} kaikkiin` : ''}</p>
    <div class="summary">${chips}</div>
    ${grown ? `<p>👥 Roma kasvoi: ${grown} uusi asukas! Väkiluku ${state.pop}.</p>` : ''}
    ${suggestion()}
    <div class="actions">
      <button class="btn" type="button" data-action="build">🏗️ Rakenna</button>
      <button class="btn primary" type="button" data-action="${state.turnsLeft > 0 ? 'turn' : 'close'}">${state.turnsLeft > 0 ? `▶ Seuraava vuoro (${state.turnsLeft})` : 'Valmis tältä päivältä'}</button>
    </div>
  `);
  turn = null;
}

// Vinkki siitä, mihin resurssit riittävät.
function suggestion() {
  const b = BUILDINGS.find((x) => !has(state, x.id) && requirementsMet(state, x) && canAfford(state, x.cost));
  if (b) return `<p class="note">Varat riittävät: ${b.icon} <b>${b.name}</b>. ${b.desc}</p>`;
  const t = TECHS.find((x) => !has(state, x.id) && requirementsMet(state, x) && state.resources.science >= x.cost);
  if (t) return `<p class="note">Tiedettä riittää tutkimukseen: ${t.icon} <b>${t.name}</b>.</p>`;
  if (state.turnsLeft === 0 && state.tessereBonusDay !== todayStr()) {
    return `<p class="note">Pelaa <a href="../tessere/">päivän Tessere-pöytä</a>, niin saat +${TESSERE_BONUS} kaikkiin resursseihin.</p>`;
  }
  return '';
}

// ---------- Rakentaminen ja tutkimus ----------

function costHtml(cost) {
  return Object.entries(cost)
    .map(([r, n]) => `<span class="${state.resources[r] < n ? 'short' : ''}">${RESOURCES[r].icon} ${n}</span>`)
    .join(' ');
}

function showBuild() {
  const rows = BUILDINGS.map((b) => {
    const built = has(state, b.id);
    const ok = requirementsMet(state, b);
    const action = built
      ? '<span class="built">✓ Rakennettu</span>'
      : ok
        ? `<button class="buy" type="button" data-build="${b.id}" ${canAfford(state, b.cost) ? '' : 'disabled'}>Rakenna</button>`
        : `<span class="locked">Vaatii: ${b.requires.map((id) => BUILDINGS.find((x) => x.id === id).name).join(', ')}</span>`;
    return `<li><span class="ico">${b.icon}</span><span><div class="name">${b.name}${b.wonder ? ' ✨' : ''}</div><div class="desc">${b.desc}</div>${built ? '' : `<div class="cost">${costHtml(b.cost)}</div>`}</span>${action}</li>`;
  }).join('');
  openSheet(`
    <h2>Rakenna</h2>
    <p class="note">Rakennukset tuottavat resursseja joka vuoro, kasvattavat väestöä tai tuovat gloriaa ⭐.</p>
    <ul class="items">${rows}</ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Sulje</button></div>
  `);
}

function showTech() {
  const rows = TECHS.map((t) => {
    const done = has(state, t.id);
    const ok = requirementsMet(state, t);
    const action = done
      ? '<span class="built">✓ Tutkittu</span>'
      : ok
        ? `<button class="buy" type="button" data-tech="${t.id}" ${state.resources.science >= t.cost ? '' : 'disabled'}>Tutki</button>`
        : `<span class="locked">Vaatii: ${t.requires.map((id) => TECHS.find((x) => x.id === id).name).join(', ')}</span>`;
    return `<li><span class="ico">${t.icon}</span><span><div class="name">${t.name}</div><div class="desc">${t.desc}</div>${done ? '' : `<div class="cost">${costHtml({ science: t.cost })}</div>`}</span>${action}</li>`;
  }).join('');
  openSheet(`
    <h2>Tutkimus</h2>
    <p class="note">Kielioppipuu: tutkimukset maksavat tiedettä 📜 ja avaavat uusia tehtävätyyppejä tai etuja.</p>
    <ul class="items">${rows}</ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Sulje</button></div>
  `);
}

function showHelp() {
  openSheet(`
    <h2>Näin pelaat</h2>
    <ul class="help">
      <li>Joka päivä saat <b>${TURNS_PER_DAY} vuoroa</b>. Vuorossa on kuusi italian tehtävää.</li>
      <li>Oikea vastaus tuottaa resurssin sanan aiheen mukaan: ruokasanat 🌾, kodin ja tekemisen sanat 🔨, numerot, värit ja aika 📜, matkustus ja ihmiset 💰.</li>
      <li>Resursseilla <b>rakennat</b> Roomaa 🏗️. Rakennukset tuottavat joka vuoro, kasvattavat väestöä 👥 tai tuovat gloriaa ⭐.</li>
      <li>Tieteellä <b>tutkit</b> kielioppia 📜: uudet tehtävätyypit, kuten artikkelit ja kuuntelu, aukeavat.</li>
      <li>Ruoka 🌾 kerääntyy varastoon, ja täysi varasto tuo uuden asukkaan. Isompi kaupunki tuottaa enemmän joka vastauksesta.</li>
      <li>Päivän <a href="../tessere/">Tessere-pöytä</a> 🀄 antaa kerran päivässä +${TESSERE_BONUS} kaikkiin resursseihin.</li>
      <li>Väärin menneet sanat palaavat pian uudelleen. Sanojen edistyminen on yhteinen Tesseren kanssa.</li>
    </ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Avanti!</button></div>
  `);
}

// ---------- Paneeli, ilmoitukset, tapahtumat ----------

function openSheet(html) {
  sheetEl.innerHTML = html;
  overlayEl.hidden = false;
}

function closeSheet() {
  if (turn) return; // tehtävää ei voi hylätä kesken
  overlayEl.hidden = true;
  stopSpeech();
}

function showToast(text, kind = '', ms = 1800) {
  toastEl.textContent = text;
  toastEl.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

sheetEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.opt !== undefined && turn) onOption(btn.dataset.opt);
  else if (btn.dataset.say) speak(btn.dataset.say);
  else if (btn.dataset.build) {
    const b = BUILDINGS.find((x) => x.id === btn.dataset.build);
    if (build(state, b.id)) {
      save();
      renderCity(Object.keys(b.cost));
      showToast(`${b.icon} ${b.name} rakennettu!`, 'ok');
      showBuild();
    }
  } else if (btn.dataset.tech) {
    const t = TECHS.find((x) => x.id === btn.dataset.tech);
    if (research(state, t.id)) {
      save();
      renderCity(['science']);
      showToast(`${t.icon} ${t.name} tutkittu!`, 'ok');
      showTech();
    }
  } else if (btn.dataset.action === 'turn') beginTurn();
  else if (btn.dataset.action === 'build') showBuild();
  else if (btn.dataset.action === 'close') {
    overlayEl.hidden = true;
    stopSpeech();
  }
});
overlayEl.addEventListener('click', (e) => e.target === overlayEl && closeSheet());

$('turn-btn').addEventListener('click', beginTurn);
$('build-btn').addEventListener('click', showBuild);
$('tech-btn').addEventListener('click', showTech);
$('help-btn').addEventListener('click', showHelp);
$('sound-btn').addEventListener('click', () => {
  state.sound = !state.sound;
  if (!state.sound) stopSpeech();
  else speak('Avanti!');
  save();
  updateSoundButton();
  showToast(state.sound ? 'Ääntäminen päällä' : 'Ääntäminen pois');
});

function updateSoundButton() {
  const btn = $('sound-btn');
  btn.textContent = state.sound ? '🔊' : '🔇';
  btn.setAttribute('aria-pressed', String(state.sound));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ---------- Käynnistys ----------

if (!speechSupported) {
  $('sound-btn').disabled = true;
  $('sound-btn').title = 'Selain ei tue puhesynteesiä';
}
updateSoundButton();
$('version').textContent = `Impero v${VERSION}`;

const firstVisit = state.lastDay === null;
startDay(state, todayStr());
if (claimTessereBonus(state, loadJson(localStorage, 'tessere.v1', {}).history, todayStr())) {
  showToast(`🀄 Tessere-bonus: +${TESSERE_BONUS} kaikkiin resursseihin`, 'ok', 2500);
}
save();
renderCity();
if (firstVisit) showHelp();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
