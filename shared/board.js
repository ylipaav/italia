// Tulostaulun asiakas. Asetukset (palvelimen osoite ja ryhmäkoodi) ovat laitekohtaisia,
// pelaajan nimi tulee aktiivisesta profiilista. Lähetys on aina vapaaehtoista ja epäonnistuminen
// hiljaista: peli ei saa kaatua tulostaulun takia.

import { activeProfile } from './store.js';

export const BOARD_KEY = 'italia.board.v1';
// Oletusosoite voidaan asettaa tähän julkaisun jälkeen, jolloin pelaajien ei tarvitse kirjoittaa sitä.
export const DEFAULT_BOARD_URL = 'https://italia-board.marko-1a4.workers.dev';
// Oletusryhmä: kaikki pelaavat samassa ryhmässä, ellei asetuksista vaihda toista koodia.
export const DEFAULT_GROUP = 'MYP';
const DEFAULTS = { url: DEFAULT_BOARD_URL, group: DEFAULT_GROUP, enabled: true };

export function loadBoardConfig(storage) {
  try {
    const c = JSON.parse(storage.getItem(BOARD_KEY) || '{}');
    const merged = { ...DEFAULTS, ...c };
    // Tyhjäksi jätetty kenttä palaa oletukseen.
    if (!merged.url) merged.url = DEFAULT_BOARD_URL;
    if (!merged.group) merged.group = DEFAULT_GROUP;
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveBoardConfig(storage, config) {
  try {
    storage.setItem(BOARD_KEY, JSON.stringify(config));
  } catch {
    // Tallennus estetty.
  }
}

export function boardReady(config) {
  return Boolean(config.enabled && config.url && config.group);
}

const base = (url) => url.replace(/\/+$/, '');

export async function submitScore(storage, game, data) {
  const config = loadBoardConfig(storage);
  if (!boardReady(config)) return false;
  try {
    const res = await fetch(`${base(config.url)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group: config.group, name: activeProfile(storage).name, game, ...data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBoard(storage, game, params = {}) {
  const config = loadBoardConfig(storage);
  if (!config.url || !config.group) return null;
  const q = new URLSearchParams({ group: config.group, game, ...params });
  const res = await fetch(`${base(config.url)}/board?${q}`);
  if (!res.ok) throw new Error(`Palvelin vastasi ${res.status}`);
  return res.json();
}

export async function pingBoard(url) {
  const res = await fetch(`${base(url)}/`);
  const data = await res.json();
  return data?.service === 'italia-board';
}
