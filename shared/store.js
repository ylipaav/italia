// Pelaajaprofiilit ja varmuuskopiot. Kaikki tiedot ovat selaimen localStoragessa.
//
// Profiilit: oletusprofiili käyttää alkuperäisiä avaimia (vanhat tallennukset toimivat),
// muut profiilit saavat avaimeen päätteen "@<id>". Pelit käyttävät profileStorage()-käärettä,
// joka tekee avainten muunnoksen, joten pelikoodi ei tiedä profiileista mitään.

export const PROFILES_KEY = 'italia.profiles.v1';
export const DATA_KEYS = ['italia.words.v1', 'tessere.v1', 'impero.v1'];
export const DEFAULT_PROFILE = 'default';
const EXPORT_PREFIX = 'ITALIA1.';

function read(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Tallennus estetty: jatketaan ilman.
  }
}

export function loadProfiles(storage) {
  const p = read(storage, PROFILES_KEY, null);
  if (p?.list?.length && p.list.some((x) => x.id === p.active)) return p;
  return { active: DEFAULT_PROFILE, list: [{ id: DEFAULT_PROFILE, name: 'Pelaaja' }] };
}

export function saveProfiles(storage, profiles) {
  write(storage, PROFILES_KEY, profiles);
}

export function profileKey(key, profileId) {
  return profileId === DEFAULT_PROFILE ? key : `${key}@${profileId}`;
}

// localStorage-kääre, joka ohjaa avaimet aktiiviselle profiilille.
export function profileStorage(storage) {
  const { active } = loadProfiles(storage);
  return {
    getItem: (k) => storage.getItem(profileKey(k, active)),
    setItem: (k, v) => storage.setItem(profileKey(k, active), v),
    removeItem: (k) => storage.removeItem(profileKey(k, active)),
  };
}

export function activeProfile(storage) {
  const p = loadProfiles(storage);
  return p.list.find((x) => x.id === p.active);
}

export function addProfile(storage, name) {
  const p = loadProfiles(storage);
  const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  p.list.push({ id, name: name.trim() || `Pelaaja ${p.list.length + 1}` });
  p.active = id;
  saveProfiles(storage, p);
  return id;
}

export function renameProfile(storage, id, name) {
  const p = loadProfiles(storage);
  const x = p.list.find((y) => y.id === id);
  if (x && name.trim()) x.name = name.trim();
  saveProfiles(storage, p);
}

export function switchProfile(storage, id) {
  const p = loadProfiles(storage);
  if (!p.list.some((x) => x.id === id)) return false;
  p.active = id;
  saveProfiles(storage, p);
  return true;
}

// Poistaa profiilin ja sen tallennukset. Viimeistä profiilia ei voi poistaa.
export function deleteProfile(storage, id) {
  const p = loadProfiles(storage);
  if (p.list.length <= 1 || !p.list.some((x) => x.id === id)) return false;
  for (const k of DATA_KEYS) storage.removeItem(profileKey(k, id));
  p.list = p.list.filter((x) => x.id !== id);
  if (p.active === id) p.active = p.list[0].id;
  saveProfiles(storage, p);
  return true;
}

// ---------- Vie / tuo ----------

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function exportProfile(storage, profileId) {
  const { list } = loadProfiles(storage);
  const data = { v: 1, name: list.find((x) => x.id === profileId)?.name ?? 'Pelaaja', exported: new Date().toISOString(), data: {} };
  for (const k of DATA_KEYS) {
    const raw = storage.getItem(profileKey(k, profileId));
    if (raw) data.data[k] = JSON.parse(raw);
  }
  return EXPORT_PREFIX + toBase64(JSON.stringify(data));
}

export function parseExport(text) {
  const t = text.trim();
  if (!t.startsWith(EXPORT_PREFIX)) throw new Error('Koodi ei ole Italia-varmuuskopio.');
  let data;
  try {
    data = JSON.parse(fromBase64(t.slice(EXPORT_PREFIX.length)));
  } catch {
    throw new Error('Koodi on vioittunut tai katkennut.');
  }
  if (data?.v !== 1 || typeof data.data !== 'object') throw new Error('Tuntematon varmuuskopion versio.');
  const unknown = Object.keys(data.data).filter((k) => !DATA_KEYS.includes(k));
  if (unknown.length) throw new Error(`Tuntematon sisältö: ${unknown.join(', ')}`);
  return data;
}

// Korvaa profiilin tallennukset varmuuskopiolla.
export function importProfile(storage, profileId, text) {
  const data = parseExport(text);
  for (const k of DATA_KEYS) {
    const key = profileKey(k, profileId);
    if (data.data[k]) storage.setItem(key, JSON.stringify(data.data[k]));
    else storage.removeItem(key);
  }
  return data;
}

// Lyhyt kuvaus varmuuskopion sisällöstä näytettäväksi ennen tuontia.
export function describeExport(data) {
  const words = Object.keys(data.data['italia.words.v1'] ?? {}).length;
  const tessere = Object.keys(data.data['tessere.v1']?.history ?? {}).length;
  const impero = data.data['impero.v1'];
  return {
    name: data.name,
    exported: data.exported,
    words,
    tessereDays: tessere,
    imperoPop: impero?.pop ?? 0,
    imperoBuildings: impero?.buildings?.length ?? 0,
  };
}
