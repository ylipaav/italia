// Aloitussivu: pelaajaprofiilit, varmuuskopiot (vie / tuo) ja tulostaulu.

import {
  loadProfiles, addProfile, switchProfile, renameProfile, deleteProfile,
  exportProfile, parseExport, importProfile, describeExport, activeProfile,
} from './shared/store.js';
import { loadBoardConfig, saveBoardConfig, boardReady, fetchBoard, pingBoard, DEFAULT_BOARD_URL, DEFAULT_GROUP } from './shared/board.js';
import { todayStr } from './shared/srs.js';
import { showNameGate } from './shared/namegate.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ---------- Pelaajat ----------

function render() {
  const p = loadProfiles(localStorage);
  const active = p.list.find((x) => x.id === p.active);
  $('active-name').textContent = active.name;
  $('profiles').innerHTML = p.list.map((x) => `
    <li class="${x.id === p.active ? 'active' : ''}">
      <button type="button" class="pick" data-pick="${x.id}">${x.id === p.active ? '✓ ' : ''}${esc(x.name)}</button>
      <button type="button" class="small" data-rename="${x.id}" aria-label="Nimeä uudelleen">✏️</button>
      ${p.list.length > 1 ? `<button type="button" class="small" data-delete="${x.id}" aria-label="Poista">🗑️</button>` : ''}
    </li>`).join('');
  $('export-code').value = '';
  $('import-status').textContent = '';
  renderBoardSettings();
  renderBoard();
}

$('profiles').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.pick) {
    switchProfile(localStorage, btn.dataset.pick);
  } else if (btn.dataset.rename) {
    const current = loadProfiles(localStorage).list.find((x) => x.id === btn.dataset.rename)?.name ?? '';
    const name = prompt('Pelaajan nimi', current);
    if (name !== null) renameProfile(localStorage, btn.dataset.rename, name);
  } else if (btn.dataset.delete) {
    const name = loadProfiles(localStorage).list.find((x) => x.id === btn.dataset.delete)?.name;
    if (confirm(`Poistetaanko pelaaja "${name}" ja kaikki sen tallennukset? Tätä ei voi perua.`)) {
      deleteProfile(localStorage, btn.dataset.delete);
    }
  }
  render();
});

$('add-profile').addEventListener('click', () => {
  const name = prompt('Uuden pelaajan nimi');
  if (name === null) return;
  addProfile(localStorage, name);
  render();
});

// ---------- Varmuuskopio ----------

$('export-btn').addEventListener('click', async () => {
  const code = exportProfile(localStorage, loadProfiles(localStorage).active);
  $('export-code').value = code;
  $('export-code').hidden = false;
  try {
    await navigator.clipboard.writeText(code);
    $('export-status').textContent = 'Koodi kopioitu leikepöydälle. Tallenna se esimerkiksi muistiinpanoihin tai lähetä itsellesi.';
  } catch {
    $('export-status').textContent = 'Kopioi koodi alta talteen.';
  }
});

$('share-btn').addEventListener('click', async () => {
  const code = exportProfile(localStorage, loadProfiles(localStorage).active);
  if (navigator.share) {
    try { await navigator.share({ title: 'Italia-varmuuskopio', text: code }); } catch { /* peruttu */ }
  } else {
    $('export-code').value = code;
    $('export-code').hidden = false;
    $('export-status').textContent = 'Jakaminen ei ole käytettävissä tässä selaimessa. Kopioi koodi alta.';
  }
});

$('import-btn').addEventListener('click', () => {
  const text = $('import-code').value;
  const status = $('import-status');
  try {
    const d = describeExport(parseExport(text));
    const p = loadProfiles(localStorage);
    const active = p.list.find((x) => x.id === p.active);
    const when = d.exported ? new Date(d.exported).toLocaleDateString('fi-FI') : '?';
    const ok = confirm(
      `Varmuuskopio "${d.name}" (${when}): ${d.words} sanaa, ${d.tessereDays} Tessere-päivää, `
      + `Impero 👥 ${d.imperoPop} ja ${d.imperoBuildings} rakennusta.\n\n`
      + `Korvataanko pelaajan "${active.name}" nykyiset tallennukset tällä?`,
    );
    if (!ok) return;
    importProfile(localStorage, p.active, text);
    $('import-code').value = '';
    status.className = 'status ok';
    status.textContent = `Tuotu pelaajalle ${active.name}.`;
  } catch (err) {
    status.className = 'status bad';
    status.textContent = err.message;
  }
});

// ---------- Tulostaulu ----------

function renderBoardSettings() {
  const c = loadBoardConfig(localStorage);
  $('board-url').value = c.url;
  $('board-group').value = c.group;
  $('board-enabled').checked = c.enabled;
  $('board-name').textContent = activeProfile(localStorage).name;
}

async function renderBoard() {
  const c = loadBoardConfig(localStorage);
  const view = $('board-view');
  const me = activeProfile(localStorage).name;
  view.innerHTML = '<p class="empty">Haetaan…</p>';
  try {
    const [t, i] = await Promise.all([fetchBoard(localStorage, 'tessere', { date: todayStr() }), fetchBoard(localStorage, 'impero')]);
    const row = (name, cells) => `<tr class="${name === me ? 'me' : ''}"><td>${esc(name)}</td>${cells.map((x) => `<td class="num">${x}</td>`).join('')}</tr>`;
    const tessere = t.rows.length
      ? `<table class="board"><tr><th>Pelaaja</th><th class="num">⏱ Aika</th><th class="num">✗ Virheet</th></tr>${t.rows.map((r) => row(r.name, [fmtTime(r.seconds), r.mistakes])).join('')}</table>`
      : '<p class="empty">Kukaan ryhmässä ei ole vielä pelannut päivän pöytää.</p>';
    const impero = i.rows.length
      ? `<table class="board"><tr><th>Pelaaja</th><th class="num">⭐ Gloria</th><th class="num">👥</th><th class="num">🏗️</th><th class="num">📜</th></tr>${i.rows.map((r) => row(r.name, [r.gloria, r.pop, r.buildings, r.techs])).join('')}</table>`
      : '<p class="empty">Ei vielä Impero-tuloksia ryhmässä.</p>';
    view.innerHTML = `<p class="board-title">🀄 Tessere tänään</p>${tessere}<p class="board-title">🏛️ Impero</p>${impero}`
      + `<p class="empty">Ryhmä <b>${esc(c.group)}</b>${c.enabled ? '' : ' · omia tuloksiasi ei lähetetä (ruksi asetuksista)'}</p>`;
  } catch (err) {
    view.innerHTML = `<p class="empty">Tulostaulua ei saatu haettua (${esc(err.message)}). Tarkista osoite ja verkkoyhteys.</p>`;
  }
}

$('board-save').addEventListener('click', async () => {
  const status = $('board-status');
  const c = { url: $('board-url').value.trim() || DEFAULT_BOARD_URL, group: $('board-group').value.trim() || DEFAULT_GROUP, enabled: $('board-enabled').checked };
  if (c.url) {
    status.className = 'status';
    status.textContent = 'Tarkistetaan palvelinta…';
    try {
      if (!(await pingBoard(c.url))) throw new Error();
    } catch {
      status.className = 'status bad';
      status.textContent = 'Osoitteesta ei vastannut Italia-tulostaulu. Tarkista osoite.';
      return;
    }
  }
  saveBoardConfig(localStorage, c);
  status.className = 'status ok';
  status.textContent = boardReady(c) ? 'Tallennettu. Tulokset lähetetään tästä lähtien.' : 'Tallennettu.';
  renderBoard();
});

render();
showNameGate(localStorage, (html) => {
  $('gate-sheet').innerHTML = html;
  $('gate').hidden = false;
});
