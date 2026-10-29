// Aloitussivu: pelaajaprofiilit ja varmuuskopiot (vie / tuo).

import {
  loadProfiles, addProfile, switchProfile, renameProfile, deleteProfile,
  exportProfile, parseExport, importProfile, describeExport,
} from './shared/store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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

render();
