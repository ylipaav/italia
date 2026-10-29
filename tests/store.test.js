import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadProfiles, profileStorage, addProfile, switchProfile, renameProfile, deleteProfile,
  exportProfile, importProfile, parseExport, describeExport, DEFAULT_PROFILE,
} from '../shared/store.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    keys: () => [...m.keys()],
  };
}

test('oletusprofiili käyttää alkuperäisiä avaimia, muut saavat päätteen', () => {
  const s = fakeStorage();
  s.setItem('tessere.v1', '{"streak":5}');
  assert.equal(loadProfiles(s).active, DEFAULT_PROFILE);
  assert.equal(profileStorage(s).getItem('tessere.v1'), '{"streak":5}', 'vanha tallennus näkyy');

  const id = addProfile(s, 'Anna');
  assert.equal(loadProfiles(s).active, id);
  const anna = profileStorage(s);
  assert.equal(anna.getItem('tessere.v1'), null, 'uusi profiili alkaa tyhjästä');
  anna.setItem('tessere.v1', '{"streak":1}');
  assert.ok(s.keys().includes(`tessere.v1@${id}`));

  switchProfile(s, DEFAULT_PROFILE);
  assert.equal(profileStorage(s).getItem('tessere.v1'), '{"streak":5}');
  renameProfile(s, id, 'Anna M.');
  assert.equal(loadProfiles(s).list.find((x) => x.id === id).name, 'Anna M.');
});

test('profiilin poisto siivoaa sen tiedot eikä poista viimeistä', () => {
  const s = fakeStorage();
  assert.equal(deleteProfile(s, DEFAULT_PROFILE), false);
  const id = addProfile(s, 'Testi');
  profileStorage(s).setItem('impero.v1', '{"pop":3}');
  assert.equal(deleteProfile(s, id), true);
  assert.equal(s.keys().some((k) => k.endsWith(`@${id}`)), false);
  assert.equal(loadProfiles(s).active, DEFAULT_PROFILE);
});

test('vie ja tuo säilyttävät tiedot, myös ääkköset', () => {
  const s = fakeStorage();
  s.setItem('italia.words.v1', JSON.stringify({ 'il caffè': { box: 3, due: '2026-11-01', seen: 2 } }));
  s.setItem('tessere.v1', JSON.stringify({ streak: 4, history: { '2026-10-28': { seconds: 90 } }, note: 'hyvää yötä' }));
  s.setItem('impero.v1', JSON.stringify({ pop: 4, buildings: ['foro', 'tempio'] }));
  const code = exportProfile(s, DEFAULT_PROFILE);
  assert.ok(code.startsWith('ITALIA1.'));
  assert.match(code, /^[A-Za-z0-9+/=.]+$/, 'koodi on pelkkää base64:ää');

  const d = describeExport(parseExport(code));
  assert.deepEqual([d.words, d.tessereDays, d.imperoPop, d.imperoBuildings], [1, 1, 4, 2]);

  const t = fakeStorage();
  const id = addProfile(t, 'Tuotu');
  importProfile(t, id, `  ${code}\n`);
  assert.deepEqual(JSON.parse(profileStorage(t).getItem('tessere.v1')), JSON.parse(s.getItem('tessere.v1')));
  assert.deepEqual(JSON.parse(profileStorage(t).getItem('impero.v1')), { pop: 4, buildings: ['foro', 'tempio'] });
});

test('virheellinen koodi hylätään selkeällä viestillä', () => {
  assert.throws(() => parseExport('hello'), /ei ole Italia-varmuuskopio/);
  assert.throws(() => parseExport('ITALIA1.!!!'), /vioittunut/);
  assert.throws(() => parseExport('ITALIA1.' + btoa('{"v":1,"data":{"evil":1}}')), /Tuntematon sisältö/);
});

test('nimi kysytään, kunnes pelaaja on antanut sen', async () => {
  const { needsName } = await import('../shared/store.js');
  const s = fakeStorage();
  assert.equal(needsName(s), true, 'uusi laite');
  s.setItem('italia.profiles.v1', JSON.stringify({ active: 'default', list: [{ id: 'default', name: 'Pelaaja' }] }));
  assert.equal(needsName(s), true, 'vanha tallennus ilman nimeä');
  renameProfile(s, 'default', 'Marko');
  assert.equal(needsName(s), false);
  const id = addProfile(s, '');
  assert.equal(needsName(s), false, 'automaattinen nimi "Pelaaja 2" ei ole "Pelaaja"');
  switchProfile(s, id);
  addProfile(s, 'Anna');
  assert.equal(needsName(s), false);
});
