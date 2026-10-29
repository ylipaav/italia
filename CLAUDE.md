# Italia – ohjeet kehitykseen

## Pelaajien tiedot säilyvät aina

Pelaajien tallennukset (tilastot, putket, historia, Rooma, sanojen kertaustila, profiilit,
tulostaulun asetukset) ovat selaimen `localStorage`ssa, eikä niitä saa koskaan menettää
päivityksessä.

- Älä vaihda tallennusavaimia (`tessere.v1`, `impero.v1`, `italia.words.v1`, `italia.profiles.v1`,
  `italia.board.v1`). Jos rakenne muuttuu, tee **migraatio** `loadState`-funktiossa, joka täydentää
  puuttuvat kentät oletuksilla (ks. `impero/js/game.js` ja `tessere/js/progress.js`).
- Uusi kenttä saa aina oletusarvon; vanhaa kenttää ei poisteta eikä tulkita uudelleen.
- Sanan tunniste on sen italiankielinen muoto (`it`). Älä muuta olemassa olevien sanojen `it`-arvoa:
  se katkaisisi sanan kertaushistorian. Virheellinen sana korjataan lisäämällä uusi ja jättämällä
  vanha pois sanastosta vain, jos kertaustila siirretään uudelle tunnisteelle.
- Jokaiselle tallennusrakenteen muutokselle kirjoitetaan testi, joka lataa vanhan muodon
  (ks. "vanha tallennus täydentyy uusilla kentillä" `tests/impero.test.js`).
- Service workerin välimuistin nimi nostetaan jokaisessa julkaisussa, jotta vanhat tiedostot eivät
  sekoitu uusiin; tämä ei koske `localStorage`a.

## Muuta

- Ei käännösvaihetta: tavallista HTML:ää, CSS:ää ja ES-moduuleja. `npm test` ajaa testit (Node 20+).
- Versio nostetaan `*/js/version.js`-tiedostossa ja `*/sw.js`-välimuistin nimessä samalla kertaa.
- Kieli käyttöliittymässä ja kommenteissa on suomi; italiankieliset termit kursiivilla.
