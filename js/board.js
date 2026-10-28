// Pöydän logiikka: vapaat laatat, parien etsintä ja aina ratkaistavan pöydän generointi.

import { shuffle } from './rng.js';

function overlaps(a, b) {
  return Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
}

// Laatta on vapaa, jos mikään ylempi laatta ei peitä sitä ja sen vasen tai oikea sivu on vapaa.
export function isFree(tile, tiles) {
  let left = false;
  let right = false;
  for (const o of tiles) {
    if (o === tile) continue;
    if (o.z > tile.z && overlaps(o, tile)) return false;
    if (o.z === tile.z && Math.abs(o.y - tile.y) < 2) {
      if (o.x === tile.x - 2) left = true;
      if (o.x === tile.x + 2) right = true;
    }
  }
  return !(left && right);
}

export function isMatch(a, b) {
  return a !== b && a.pairId === b.pairId && a.lang !== b.lang;
}

export function findFreePairs(tiles) {
  const free = tiles.filter((t) => isFree(t, tiles));
  const pairs = [];
  for (let i = 0; i < free.length; i++) {
    for (let j = i + 1; j < free.length; j++) {
      if (isMatch(free[i], free[j])) pairs.push([free[i], free[j]]);
    }
  }
  return pairs;
}

// Rakennetaan pöytä takaperin: valitaan kaksi vapaata paikkaa, annetaan niille pari ja
// poistetaan ne. Tämä poistojärjestys on aina kelvollinen ratkaisu, joten pöytä on ratkaistavissa.
export function generateBoard(positions, words, rand, maxAttempts = 300) {
  if (positions.length !== words.length * 2) {
    throw new Error(`Paikkoja ${positions.length}, sanoja ${words.length}: tarvitaan 2 paikkaa per sana`);
  }
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let remaining = positions.map((p) => ({ ...p }));
    const tiles = [];
    const order = [];
    let ok = true;
    for (const word of shuffle(words, rand)) {
      const free = remaining.filter((p) => isFree(p, remaining));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const [a, b] = shuffle(free, rand);
      const fiFirst = rand() < 0.5;
      const tA = makeTile(a, word, fiFirst ? 'fi' : 'it');
      const tB = makeTile(b, word, fiFirst ? 'it' : 'fi');
      tiles.push(tA, tB);
      order.push([tA.key, tB.key]);
      remaining = remaining.filter((p) => p !== a && p !== b);
    }
    if (ok) return { tiles, order };
  }
  return null;
}

function makeTile(pos, word, lang) {
  return {
    key: `${pos.x},${pos.y},${pos.z}`,
    x: pos.x,
    y: pos.y,
    z: pos.z,
    pairId: word.it,
    lang,
    text: lang === 'fi' ? word.fi : word.it,
    word,
  };
}
