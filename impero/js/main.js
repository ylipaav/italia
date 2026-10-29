import { WORDS } from '../../shared/words.js';
import { mulberry32 } from '../../shared/rng.js';
import { todayStr, loadWordProgress, saveWordProgress, loadJson } from '../../shared/srs.js';
import { speak, stopSpeech, speechSupported } from '../../shared/speech.js';
import { RESOURCES, BUILDINGS, TECHS, REGIONS, ERAS, TURNS_PER_DAY, TESSERE_BONUS, EXPEDITION_PASS } from './data.js';
import {
  loadState, saveState, startDay, build, buildBlocker, buildingCost, research, gloria, has, hasCity, requirementsMet,
  foodForNextPop, startTurn, startExpedition, answer, turnDone, endTurn, claimTessereBonus,
  currentEra, nextEra, region, regionStatus, expeditionBlocker, expeditionCost, masteredCount,
  rollEvent, applyEvent,
} from './game.js';
import { VERSION } from './version.js';
import { profileStorage, activeProfile } from '../../shared/store.js';
import { submitScore } from '../../shared/board.js';

const $ = (id) => document.getElementById(id);
const overlayEl = $('overlay');
const sheetEl = $('sheet');
const toastEl = $('toast');

const store = profileStorage(localStorage);
const state = loadState(store);
const progress = loadWordProgress(store);
const rand = mulberry32((Math.random() * 2 ** 32) >>> 0);
let turn = null;
let pendingEvent = null;
let view = 'city'; // 'city' | 'map'
let toastTimer = null;

const speechOpts = () => ({ speech: speechSupported && state.sound });

function save() {
  saveState(store, state);
  saveWordProgress(store, progress);
}

// ---------- Kaupunki ja kartta ----------

function renderAll(changed = []) {
  renderResources(changed);
  renderHeader();
  if (view === 'city') renderCity();
  else renderMap();
  renderTurnButton();
}

function renderResources(changed) {
  $('resources').innerHTML = Object.entries(RESOURCES)
    .map(([k, r]) => `<div class="res ${changed.includes(k) ? 'bump' : ''}"><b>${r.icon} ${state.resources[k]}</b><span>${r.name}</span></div>`)
    .join('');
}

function renderHeader() {
  const era = currentEra(state);
  const next = nextEra(state);
  document.body.dataset.era = era.id;
  $('city-meta').innerHTML = `<span title="Asukkaat">👥 ${state.pop}</span><span title="Kaupunkeja">🏙️ ${state.cities.length}</span><span title="Gloria">⭐ ${gloria(state)}</span>`;
  $('era').innerHTML = `<button type="button" class="era-btn" data-action="era">${era.icon} ${era.name}${next ? ` <small>→ ${next.name} ⭐ ${next.gloria}</small>` : ''}</button>`;
  $('view-city').classList.toggle('on', view === 'city');
  $('view-map').classList.toggle('on', view === 'map');
}

function renderCity() {
  const built = BUILDINGS.filter((b) => has(state, b.id));
  $('skyline').hidden = false;
  $('map').hidden = true;
  $('skyline').innerHTML = built.length
    ? built.map((b) => `<div class="b ${b.wonder ? 'wonder' : ''}" title="${esc(b.desc)}">${b.icon}<small>${esc(b.name)}</small></div>`).join('')
    : '<p class="empty">Roma on vielä kylä. Pelaa vuoro, kerää 🔨 ja rakenna Foro.</p>';
  const need = foodForNextPop(state);
  $('growth').innerHTML = `Seuraava asukas: 🌾 ${state.food} / ${need}<span class="bar"><span style="width:${Math.min(100, (state.food / need) * 100)}%"></span></span>`;
}

// Italia pelkistettynä: alueet pisteinä, yhteydet viivoina. Sumu peittää alueet, joihin ei ole yhteyttä.
const BOOT = 'M20,10 L40,6 L60,8 L66,16 L58,26 L54,40 L58,54 L66,66 L80,66 L94,70 L92,78 L82,82 L84,92 L86,104 L76,106 L74,116 L60,118 L56,110 L64,104 L72,96 L70,86 L62,80 L52,70 L44,58 L38,46 L26,40 L14,30 L12,18 Z';
const ISLANDS = 'M16,70 L28,68 L30,86 L18,90 Z M58,106 L72,104 L78,112 L62,120 L54,114 Z';

function renderMap() {
  $('skyline').hidden = true;
  $('map').hidden = false;
  $('growth').innerHTML = `${state.cities.length}/${REGIONS.length} aluetta. Napauta aluetta: tutkimusmatka maksaa 🌾 ja 💰 ja vie yhden vuoron.`;
  const lines = [];
  for (const r of REGIONS) {
    for (const n of r.neighbors) {
      if (r.id < n) {
        const o = region(n);
        const visible = hasCity(state, r.id) || hasCity(state, n);
        lines.push(`<line x1="${r.x}" y1="${r.y}" x2="${o.x}" y2="${o.y}" class="${visible ? 'road' : 'road dim'} ${r.sea || o.sea ? 'sea' : ''}"/>`);
      }
    }
  }
  const nodes = REGIONS.map((r) => {
    const status = regionStatus(state, r);
    const label = status === 'owned' ? r.city : status === 'hidden' ? '?' : r.name;
    const icon = status === 'owned' ? (r.start ? '🏛️' : '🏘️') : status === 'sea' ? '⛵' : status === 'hidden' ? '' : '⛺';
    return `<g class="region ${status}" data-region="${r.id}" tabindex="0" role="button" aria-label="${esc(r.name)}">
      <circle cx="${r.x}" cy="${r.y}" r="${status === 'owned' ? 6 : 5}"/>
      <text x="${r.x}" y="${r.y + 1.6}" class="ico">${icon}</text>
      <text x="${r.x}" y="${r.y + 10}" class="lbl">${esc(label)}</text>
    </g>`;
  }).join('');
  $('map').innerHTML = `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg" aria-label="Italian kartta">
    <path d="${BOOT}" class="land"/><path d="${ISLANDS}" class="land"/>
    ${lines.join('')}${nodes}
  </svg>`;
}

function renderTurnButton() {
  const btn = $('turn-btn');
  btn.disabled = state.turnsLeft <= 0;
  btn.innerHTML = state.turnsLeft > 0
    ? `▶ Vuoro<span class="sub">${state.turnsLeft}/${TURNS_PER_DAY} jäljellä tänään</span>`
    : `Vuorot käytetty<span class="sub">uudet huomenna</span>`;
}

// ---------- Vuoro, tapahtumat ja tutkimusmatkat ----------

function beginTurn() {
  if (state.turnsLeft <= 0) return;
  const event = rollEvent(state, rand);
  if (event) {
    pendingEvent = { event, next: () => startQuiz(startTurn(state, WORDS, progress, todayStr(), rand, speechOpts())) };
    renderEvent();
    return;
  }
  startQuiz(startTurn(state, WORDS, progress, todayStr(), rand, speechOpts()));
}

function startQuiz(t) {
  turn = t;
  if (!turn) return;
  renderQuestion();
}

function renderEvent() {
  const { event } = pendingEvent;
  openSheet(`
    <p class="q-type">Tapahtuma</p>
    <p class="event-text">${esc(event.text)} <button type="button" class="say-inline" data-say="${esc(event.text)}" aria-label="Kuuntele">🔊</button></p>
    <p class="note">Valitse italiaksi. Suomennos ja seuraus näkyvät valinnan jälkeen.</p>
    <div class="options">${event.options.map((o, i) => `<button class="opt" type="button" data-event-opt="${i}">${esc(o.it)}</button>`).join('')}</div>
    <p class="q-feedback" id="feedback"></p>
  `);
  if (state.sound) speak(event.text);
}

function onEventOption(i) {
  const { event, next } = pendingEvent;
  const { option, applied } = applyEvent(state, event, i);
  save();
  for (const btn of sheetEl.querySelectorAll('.opt')) {
    btn.disabled = true;
    if (Number(btn.dataset.eventOpt) === i) btn.classList.add('right');
    else btn.classList.add('dim');
  }
  const effects = Object.entries(applied).filter(([, n]) => n).map(([k, n]) => `${n > 0 ? '+' : ''}${n} ${k === 'gloria' ? '⭐' : RESOURCES[k].icon}`).join(' · ');
  $('feedback').className = 'q-feedback ok';
  $('feedback').innerHTML = `<i>${esc(event.fi)}</i><br>„${esc(option.fi)}“ ${effects ? `→ ${effects}` : ''}`;
  renderResources(Object.keys(applied));
  renderHeader();
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.innerHTML = '<button class="btn primary" type="button" data-action="event-next">Jatka vuoroon ▶</button>';
  sheetEl.append(actions);
  pendingEvent = { next };
}

function startExpeditionTo(regionId) {
  const t = startExpedition(state, regionId, WORDS, progress, todayStr(), rand, speechOpts());
  if (!t) return;
  save();
  renderResources(Object.keys(t.cost));
  startQuiz(t);
}

const TYPE_LABELS = {
  fi2it: 'Mikä on italiaksi?', icon2it: 'Mikä on italiaksi?', it2fi: 'Mitä tämä tarkoittaa?',
  listen: 'Kuuntele ja valitse käännös', article: 'Valitse artikkeli', plural: 'Mikä on monikko?',
  number: 'Lue luku italiaksi', price: 'Hinta tai kellonaika', conj: 'Taivuta verbi (preesens)',
  past: 'Taivuta verbi (passato prossimo)', future: 'Taivuta verbi (futuuri)', prep: 'Valitse prepositio',
  agree: 'Taivuta adjektiivi',
};

function renderQuestion() {
  const q = turn.questions[turn.index];
  const bars = turn.questions.map((_, i) => {
    const r = turn.results[i];
    return `<span class="${r ? (r.outcome === 'clean' ? 'done' : 'miss') : i === turn.index ? 'now' : ''}"></span>`;
  }).join('');
  const listen = q.prompt === '🔊';
  const prompt = listen
    ? `<button type="button" data-say="${esc(q.say)}" aria-label="Kuuntele uudelleen">🔊</button>`
    : esc(q.prompt);
  const title = turn.kind === 'expedition' ? `<p class="exp-title">🧭 Tutkimusmatka: ${esc(turn.region.name)} · vähintään ${EXPEDITION_PASS}/${turn.questions.length} oikein</p>` : '';
  openSheet(`
    ${title}
    <div class="progress">${bars}</div>
    <p class="q-type">${turn.index + 1}/${turn.questions.length} · ${TYPE_LABELS[q.type]} · ${RESOURCES[q.resource].icon}</p>
    <p class="q-prompt ${q.type === 'icon2it' ? 'icon' : ''} ${q.prompt.length > 18 ? 'long' : ''}">${prompt}</p>
    <p class="q-hint">${q.hint ? esc(q.hint) : ''}</p>
    <div class="options">${q.options.map((o) => `<button class="opt" type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
    <p class="q-feedback" id="feedback"></p>
  `);
  if (listen) speak(q.say);
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
  const explain = q.word ? `${q.word.fi} = ${q.word.it}` : `${q.hint ?? ''} → ${q.answer}`;
  if (result.correct) {
    fb.className = 'q-feedback ok';
    fb.textContent = `+${result.yield.amount} ${RESOURCES[result.yield.resource].icon} ${explain}`;
  } else {
    fb.className = 'q-feedback bad';
    fb.textContent = explain;
  }
  if (state.sound && q.prompt !== '🔊') speak(q.word ? q.word.it : q.say ?? q.answer);
  renderResources(result.correct ? [result.yield.resource] : []);
  setTimeout(() => (turnDone(turn) ? finishTurn() : renderQuestion()), result.correct ? 900 : 1800);
}

function finishTurn() {
  const today = todayStr();
  const done = turn;
  const { income, grown, expedition, era } = endTurn(state, done, progress, today);
  const bonus = claimTessereBonus(state, loadJson(store, 'tessere.v1', {}).history, today);
  save();
  submitScore(localStorage, 'impero', {
    gloria: gloria(state), pop: state.pop, buildings: state.buildings.length, techs: state.techs.length, turns: state.turns, era: currentEra(state).name,
  });
  turn = null;
  renderAll(Object.keys(RESOURCES));

  const right = done.results.filter((r) => r.outcome === 'clean').length;
  const chips = Object.entries(RESOURCES)
    .map(([k, r]) => `<div class="res"><b>+${done.earned[k] + income[k] + (bonus ? TESSERE_BONUS : 0)}</b><span>${r.icon} ${r.name}</span></div>`)
    .join('');
  const incomeTotal = Object.values(income).reduce((a, b) => a + b, 0);
  let title = 'Vuoro pelattu';
  let expHtml = '';
  if (expedition) {
    title = expedition.success ? `🏘️ ${expedition.region.city} perustettu!` : '🧭 Tutkimusmatka epäonnistui';
    expHtml = expedition.success
      ? `<p>${esc(expedition.region.desc)} Alue antaa +10 ⭐ ja uuden asukkaan.</p>`
      : `<p>Vain ${expedition.right}/${done.questions.length} oikein, tarvitaan ${EXPEDITION_PASS}. Puolet kustannuksista palautui. Yritä uudelleen, kun sanat ovat tutumpia.</p>`;
  }
  openSheet(`
    <h2>${title}</h2>
    <p>${right}/${done.questions.length} oikein${incomeTotal ? ` · rakennukset ja kaupungit tuottivat ${incomeTotal}` : ''}${bonus ? ` · 🀄 Tessere-bonus +${TESSERE_BONUS} kaikkiin` : ''}</p>
    ${expHtml}
    <div class="summary">${chips}</div>
    ${grown ? `<p>👥 Väestö kasvoi: ${grown} uusi asukas! Väkiluku ${state.pop}.</p>` : ''}
    ${suggestion()}
    <div class="actions">
      <button class="btn" type="button" data-action="build">🏗️ Rakenna</button>
      <button class="btn primary" type="button" data-action="${state.turnsLeft > 0 ? 'turn' : 'close'}">${state.turnsLeft > 0 ? `▶ Seuraava vuoro (${state.turnsLeft})` : 'Valmis tältä päivältä'}</button>
    </div>
  `);
  if (era) setTimeout(() => showEra(era, true), 300);
}

// Vinkki siitä, mihin resurssit riittävät.
function suggestion() {
  const b = BUILDINGS.find((x) => !has(state, x.id) && !buildBlocker(state, x, progress, WORDS));
  if (b) return `<p class="note">Varat riittävät: ${b.icon} <b>${esc(b.name)}</b>. ${esc(b.desc)}</p>`;
  const t = TECHS.find((x) => !has(state, x.id) && requirementsMet(state, x) && state.resources.science >= x.cost);
  if (t) return `<p class="note">Tiedettä riittää tutkimukseen: ${t.icon} <b>${esc(t.name)}</b>.</p>`;
  const r = REGIONS.find((x) => !hasCity(state, x.id) && regionStatus(state, x) === 'available' && !expeditionBlocker(state, x));
  if (r && state.turnsLeft > 0) return `<p class="note">Varat riittävät tutkimusmatkaan: 🧭 <b>${esc(r.name)}</b> (${esc(r.city)}). Avaa kartta 🗺️.</p>`;
  if (state.turnsLeft === 0 && state.tessereBonusDay !== todayStr()) {
    return `<p class="note">Pelaa <a href="../tessere/">päivän Tessere-pöytä</a>, niin saat +${TESSERE_BONUS} kaikkiin resursseihin.</p>`;
  }
  return '';
}

// ---------- Paneelit: alue, aikakausi, rakentaminen, tutkimus, ohje ----------

function costHtml(cost) {
  return Object.entries(cost)
    .map(([r, n]) => `<span class="${state.resources[r] < n ? 'short' : ''}">${RESOURCES[r].icon} ${n}</span>`)
    .join(' ');
}

function showRegion(id) {
  const r = region(id);
  const status = regionStatus(state, r);
  const blocker = expeditionBlocker(state, r);
  let body = '';
  let action = '';
  if (status === 'owned') {
    body = `<p>${r.start ? 'Valtakunnan pääkaupunki.' : esc(r.desc)}</p>`;
  } else if (status === 'hidden') {
    body = '<p>Tuntematon alue. Perusta ensin kaupunki naapurialueelle.</p>';
  } else {
    body = `<p>${esc(r.desc)}</p>
      <p>Tutkimusmatka: 6 tehtävää aiheesta <b>${esc(r.theme)}</b>, vähintään ${EXPEDITION_PASS} oikein. Vie yhden vuoron.</p>
      <p class="cost">Hinta: ${costHtml(expeditionCost(state, r))}${r.sea ? ' · ⛵ meren yli' : ''}</p>`;
    if (blocker?.kind === 'sea') action = '<p class="locked">Vaatii tutkimuksen La navigazione.</p>';
    else if (blocker?.kind === 'turns') action = '<p class="locked">Vuorot on käytetty tältä päivältä.</p>';
    else if (blocker?.kind === 'cost') action = '<p class="locked">Varat eivät riitä.</p>';
    else action = `<button class="btn primary" type="button" data-expedition="${r.id}">🧭 Lähetä tutkimusmatka</button>`;
  }
  openSheet(`
    <h2>${status === 'owned' ? '🏘️' : '🗺️'} ${esc(r.name)} · ${esc(r.city)}</h2>
    ${body}
    <div class="actions">${action}<button class="btn" type="button" data-action="close">Sulje</button></div>
  `);
}

function showEra(era, celebrate = false) {
  const i = ERAS.indexOf(era);
  const steps = ERAS.map((e, j) => `<li class="${j < i ? 'past' : j === i ? 'now' : ''}">${e.icon} <b>${esc(e.name)}</b> <small>⭐ ${e.gloria}</small><br><span>${esc(e.desc)}</span></li>`).join('');
  openSheet(`
    <h2>${celebrate ? `Uusi aikakausi: ${era.icon} ${esc(era.name)}!` : `${era.icon} ${esc(era.name)}`}</h2>
    ${celebrate ? `<p>${esc(era.desc)} Uusia rakennuksia on nyt rakennettavissa.</p>` : '<p class="note">Gloria ⭐ kertyy väestöstä, rakennuksista, tutkimuksista, kaupungeista ja tapahtumista. Jokainen aikakausi avaa uusia rakennuksia.</p>'}
    <ol class="eras">${steps}</ol>
    <div class="actions"><button class="btn primary" type="button" data-action="close">${celebrate ? 'Avanti!' : 'Sulje'}</button></div>
  `);
}

function showBuild() {
  const groups = ERAS.map((era) => {
    const list = BUILDINGS.filter((b) => b.era === era.id);
    const rows = list.map((b) => {
      const built = has(state, b.id);
      const blocker = built ? null : buildBlocker(state, b, progress, WORDS);
      let action;
      if (built) action = '<span class="built">✓ Rakennettu</span>';
      else if (!blocker) action = `<button class="buy" type="button" data-build="${b.id}">Rakenna</button>`;
      else if (blocker.kind === 'cost') action = '<button class="buy" type="button" disabled>Rakenna</button>';
      else if (blocker.kind === 'era') action = `<span class="locked">Aikakausi: ${esc(blocker.era.name)}</span>`;
      else if (blocker.kind === 'requires') action = `<span class="locked">Vaatii: ${blocker.ids.map((id) => esc(BUILDINGS.find((x) => x.id === id)?.name ?? TECHS.find((x) => x.id === id)?.name)).join(', ')}</span>`;
      else if (blocker.kind === 'cities') action = `<span class="locked">Vaatii ${blocker.count} kaupunkia</span>`;
      else if (blocker.kind === 'cityIn') action = `<span class="locked">Vaatii: ${esc(blocker.region.city)}</span>`;
      else if (blocker.kind === 'mastery') action = `<span class="locked">Hallussa: ${esc(blocker.theme)} ${blocker.have}/${blocker.need}</span>`;
      const mastery = b.mastery && !built
        ? `<div class="mastery"><span style="width:${Math.min(100, (masteredCount(progress, WORDS, b.mastery.theme) / b.mastery.count) * 100)}%"></span></div><div class="cost">Vaatii ${b.mastery.count} hallussa olevaa sanaa aiheesta ${esc(b.mastery.theme)}</div>`
        : '';
      return `<li class="${built ? 'done' : ''}"><span class="ico">${b.icon}</span><span><div class="name">${esc(b.name)}${b.wonder ? ' ✨' : ''}</div><div class="desc">${esc(b.desc)}</div>${built ? '' : `<div class="cost">${costHtml(buildingCost(state, b))}</div>`}${mastery}</span>${action}</li>`;
    }).join('');
    return `<h3>${era.icon} ${esc(era.name)}</h3><ul class="items">${rows}</ul>`;
  }).join('');
  openSheet(`
    <h2>Rakenna</h2>
    <p class="note">Rakennukset tuottavat joka vuoro, kasvattavat väestöä tai tuovat gloriaa ⭐. Ihmeet ✨ vaativat lisäksi, että aiheen sanoja on hallussa (kertausväli vähintään 14 päivää).${has(state, 'ingegneria') ? ' L’ingegneria: hinnat −20 %.' : ''}</p>
    ${groups}
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
        : `<span class="locked">Vaatii: ${t.requires.map((id) => esc(TECHS.find((x) => x.id === id).name)).join(', ')}</span>`;
    return `<li class="${done ? 'done' : ''}"><span class="ico">${t.icon}</span><span><div class="name">${esc(t.name)}</div><div class="desc">${esc(t.desc)}</div>${done ? '' : `<div class="cost">${costHtml({ science: t.cost })}</div>`}</span>${action}</li>`;
  }).join('');
  openSheet(`
    <h2>Kielioppipuu</h2>
    <p class="note">Tutkimukset maksavat tiedettä 📜 ja avaavat uusia tehtävätyyppejä tai etuja. Avatut tehtävät tulevat vuoroihin mukaan ja tuottavat 📜.</p>
    <ul class="items">${rows}</ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Sulje</button></div>
  `);
}

function showWonderFact(b) {
  openSheet(`
    <h2>${b.icon} ${esc(b.name)} valmis! ✨</h2>
    <p class="fact">${esc(b.fact)}</p>
    <p class="note">${esc(b.desc)}</p>
    <div class="actions"><button class="btn primary" type="button" data-action="build">Takaisin rakentamaan</button><button class="btn" type="button" data-action="close">Sulje</button></div>
  `);
}

function showHelp() {
  openSheet(`
    <h2>Näin pelaat</h2>
    <ul class="help">
      <li>Joka päivä saat <b>${TURNS_PER_DAY} vuoroa</b>. Vuorossa on kuusi italian tehtävää, joskus ensin tapahtuma, johon vastataan italiaksi.</li>
      <li>Oikea vastaus tuottaa resurssin sanan aiheen mukaan: ruoka 🌾, koti ja tekeminen 🔨, numerot, värit, aika ja kulttuuri 📜, matkustus ja ihmiset 💰.</li>
      <li><b>Rakenna</b> 🏗️ Roomaa: rakennukset tuottavat joka vuoro, kasvattavat väestöä 👥 tai tuovat gloriaa ⭐. Ihmeet ✨ vaativat myös, että aiheen sanat ovat hallussa.</li>
      <li><b>Tutki</b> 📜 kielioppipuuta: artikkelit, monikot, verbintaivutus, prepositiot… Jokainen tutkimus tuo uuden tehtävätyypin tai edun.</li>
      <li><b>Kartta</b> 🗺️: lähetä tutkimusmatka naapurialueelle (🌾 + 💰, yksi vuoro). Kuusi tehtävää alueen aiheesta, ${EXPEDITION_PASS} oikein perustaa kaupungin. Kaupungit tuottavat ja avaavat uusia alueita.</li>
      <li><b>Aikakaudet</b> vaihtuvat glorian mukaan: Regno → Repubblica → Impero → Rinascimento → Italia moderna. Jokainen avaa uusia rakennuksia.</li>
      <li>Päivän <a href="../tessere/">Tessere-pöytä</a> 🀄 antaa kerran päivässä +${TESSERE_BONUS} kaikkiin resursseihin. Sanojen edistyminen on yhteinen.</li>
    </ul>
    <div class="actions"><button class="btn primary" type="button" data-action="close">Avanti!</button></div>
  `);
}

// ---------- Paneeli, ilmoitukset, tapahtumat ----------

function openSheet(html) {
  sheetEl.innerHTML = html;
  sheetEl.scrollTop = 0;
  overlayEl.hidden = false;
}

function closeSheet() {
  if (turn || pendingEvent) return; // tehtävää tai tapahtumaa ei voi hylätä kesken
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
  const d = btn.dataset;
  if (d.opt !== undefined && turn) onOption(d.opt);
  else if (d.eventOpt !== undefined && pendingEvent?.event) onEventOption(Number(d.eventOpt));
  else if (d.action === 'event-next') {
    const next = pendingEvent.next;
    pendingEvent = null;
    next();
  } else if (d.say) speak(d.say);
  else if (d.build) {
    const b = BUILDINGS.find((x) => x.id === d.build);
    if (build(state, b.id, progress, WORDS)) {
      save();
      renderAll(Object.keys(b.cost));
      showToast(`${b.icon} ${b.name} rakennettu!`, 'ok');
      if (b.wonder) showWonderFact(b);
      else showBuild();
    }
  } else if (d.tech) {
    const t = TECHS.find((x) => x.id === d.tech);
    if (research(state, t.id)) {
      save();
      renderAll(['science']);
      showToast(`${t.icon} ${t.name} tutkittu!`, 'ok');
      showTech();
    }
  } else if (d.expedition) startExpeditionTo(d.expedition);
  else if (d.action === 'turn') beginTurn();
  else if (d.action === 'build') showBuild();
  else if (d.action === 'close') {
    overlayEl.hidden = true;
    stopSpeech();
  }
});
overlayEl.addEventListener('click', (e) => e.target === overlayEl && closeSheet());

$('map').addEventListener('click', (e) => {
  const g = e.target.closest('[data-region]');
  if (g) showRegion(g.dataset.region);
});
$('map').addEventListener('keydown', (e) => {
  const g = e.target.closest('[data-region]');
  if (g && (e.key === 'Enter' || e.key === ' ')) showRegion(g.dataset.region);
});
$('era').addEventListener('click', () => showEra(currentEra(state)));
$('view-city').addEventListener('click', () => { view = 'city'; renderAll(); });
$('view-map').addEventListener('click', () => { view = 'map'; renderAll(); });

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
$('version').textContent = `Impero v${VERSION} · ${activeProfile(localStorage).name}`;

const firstVisit = state.lastDay === null;
startDay(state, todayStr());
if (claimTessereBonus(state, loadJson(store, 'tessere.v1', {}).history, todayStr())) {
  showToast(`🀄 Tessere-bonus: +${TESSERE_BONUS} kaikkiin resursseihin`, 'ok', 2500);
}
save();
renderAll();
if (firstVisit) showHelp();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
