# Tessere 🇮🇹

Päivittäinen Mahjong-pasianssin tyylinen laattapeli italian sanaston opiskeluun puhelimella.

Etsi pareja: suomenkielinen sana (**FI**, sininen) ja sen italiankielinen vastine (**IT**, vihreä).
Vain vapaita laattoja voi valita. Niiden päällä ei saa olla toista laattaa, ja vasemman tai oikean
sivun pitää olla tyhjä. Oikea pari poistuu, ja alta paljastuu uusia laattoja.

## Ominaisuudet

- **Päivän pöytä:** 17–24 sanaparia. Pöytämuoto (pyramidi, kaksi tornia, neljä pilaria, harjanteet, portaat) ja sanat vaihtuvat joka päivä.
- **Aina ratkaistavissa:** pöytä rakennetaan takaperin poistamalla pareja vapailta paikoilta.
- **Jaksotettu kertaus:** noin 40 % sanoista on kertaukseen erääntyneitä, loput uusia.
  Virheellä tehty sana palaa kertaukseen seuraavana päivänä, virheetön siirtyy yhä pidemmälle
  (1 → 3 → 7 → 14 → 30 → 60 päivää).
- **Väärä pari** näyttää molempien laattojen oikeat käännökset.
- **Ääntäminen** selaimen italiankielisellä puhesynteesillä. Sen saa pois 🔊-napista, ja seuraava
  napautus keskeyttää lausunnan.
- **Päiväputki 🔥**, jaettava tulos ja harjoituspöydät päivän pöydän jälkeen.
- Vihje 💡 ja sekoitus 🔀, kun pareja ei löydy.
- PWA: lisättävissä puhelimen aloitusnäytölle, toimii myös ilman verkkoa.
- Edistyminen tallentuu selaimen `localStorage`en, joten palvelinta ei tarvita.

## Käynnistys

Tiedostot ovat tavallista HTML:ää, CSS:ää ja JavaScript-moduuleja ilman käännösvaihetta.

```sh
npm start        # http://localhost:8080
npm test         # yksikkötestit (Node 20+)
```

Puhelimella kokeiltaessa helpointa on julkaista repositorio **GitHub Pagesissa**
(Settings → Pages → Deploy from branch). Service worker ja kotinäyttöön lisääminen vaativat HTTPS:n.

## Rakenne

| Tiedosto | Sisältö |
|---|---|
| `js/words.js` | Sanasto (noin 120 paria teemoittain) |
| `js/layout.js` | Pöytämuodot: laattojen paikat ja kerrokset (`?layout=Portaat` pakottaa muodon) |
| `js/board.js` | Vapaat laatat, parit ja ratkaistavan pöydän generointi |
| `js/progress.js` | Kertausalgoritmi, päiväputki ja tallennus |
| `js/speech.js` | Ääntäminen |
| `js/main.js` | Käyttöliittymä |

## Jatkoideoita

- Lisää pöytämuotoja (pyramidi, Colosseum) ja teemapöytiä
- Kuva/emoji ↔ italia -laatat, verbien taivutusparit, artikkelipelit (*il / la*)
- Harhautuslaatat ja "väärät ystävät" (*la camera* = huone)
- Muistutusilmoitus illalla, tilastot ja kalenterinäkymä
