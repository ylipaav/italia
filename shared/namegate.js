// Nimikysely ennen ensimmäistä peliä. Palauttaa true, jos kysely näytettiin.
// Sivu antaa funktion, joka avaa paneelin annetulla HTML:llä; tallennuksen jälkeen sivu ladataan uudelleen.

import { needsName, activeProfile, renameProfile } from './store.js';

export function nameGateHtml() {
  return `
    <h2>Benvenuto! 👋</h2>
    <p>Anna pelaajanimi. Se näkyy tulostaululla ja pelien alalaidassa, ja sen voi vaihtaa myöhemmin aloitussivulta.</p>
    <form id="name-form" class="name-form">
      <input id="name-input" type="text" maxlength="24" placeholder="Nimesi" autocomplete="nickname" required>
      <button class="btn primary" type="submit">Aloita</button>
    </form>`;
}

export function showNameGate(storage, openSheet) {
  if (!needsName(storage)) return false;
  openSheet(nameGateHtml());
  const form = document.getElementById('name-form');
  const input = document.getElementById('name-input');
  setTimeout(() => input?.focus(), 50);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    renameProfile(storage, activeProfile(storage).id, name);
    location.reload();
  });
  return true;
}
