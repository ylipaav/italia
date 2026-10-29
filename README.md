# Italia 🇮🇹 – pelejä italian opiskeluun

Kaksi puhelimella pelattavaa PWA-peliä, jotka jakavat saman sanaston ja saman kertaustilan:
yhdessä pelissä opittu sana kertautuu toisessa.

| Kansio | Peli |
|---|---|
| `impero/` | **Impero** – rakenna Rooma vuoro vuorolta. Oikeat vastaukset tuottavat 🌾 🔨 📜 💰. |
| `tessere/` | **Tessere** – päivän Mahjong-pöytä suomi–italia-sanapareilla. |
| `shared/` | Sanasto kuvakkeineen, jaksotettu kertaus (`srs.js`), satunnaisluvut ja ääntäminen. |
| `index.html` + `launcher.js` | Aloitussivu: pelivalinta, tulostaulu, pelaajaprofiilit ja varmuuskopiot. |
| `server/` | Tulostaulun Cloudflare Worker (valinnainen), ks. `server/README.md`. |

```sh
npm start        # http://localhost:8080
npm test         # yksikkötestit (Node 20+)
```

Julkaisu: GitHub Pages (Settings → Pages → Deploy from branch) toimii sellaisenaan, koska
käännösvaihetta ei ole. Service workerit ja kotinäyttöön lisääminen vaativat HTTPS:n.

## Tallennus, pelaajat ja varmuuskopiot

Kaikki tiedot ovat pelaajan selaimen `localStorage`ssa; palvelinta ei ole.

- **Pelaajat:** samalla puhelimella voi olla useita pelaajia (aloitussivu → Pelaajat). Kullakin
  on oma Rooma, oma putki ja oma sanojen kertaustila. Oletuspelaaja käyttää alkuperäisiä
  avaimia (`impero.v1`, `tessere.v1`, `italia.words.v1`), muut saavat päätteen `@<id>`.
- **Varmuuskopio:** *Vie* tekee `ITALIA1.`-alkuisen koodin (base64-JSON), joka sisältää pelaajan
  kaikki tallennukset. *Tuo* korvaa valitun pelaajan tallennukset koodilla. Näin edistyminen
  siirtyy toiselle laitteelle tai palautuu selaimen tyhjennyksen jälkeen.
- Toteutus: `shared/store.js` (testattu `tests/store.test.js`).

## Tulostaulu (valinnainen) 🏆

Eri puhelimilla pelaavien tulokset saa yhteiselle tulostaululle pienellä Cloudflare Workerilla
(`server/`). Pelaajat antavat saman ryhmäkoodin, ja aloitussivu näyttää päivän Tessere-ajat ja
Imperon tilanteen. Lähetys on pois päältä, kunnes pelaaja kytkee sen itse. Ilman palvelinta
pelit toimivat täysin kuten ennen.

## Impero 🏛️

Civilization-henkinen rakentelupeli, jossa italian osaaminen on kaupungin tuotantovoima.

- **3 vuoroa päivässä**, kussakin kuusi tehtävää: suomi → italia, kuvake → italia ja tutkimusten
  myötä italia → suomi, kuuntelu ja artikkelit (*il, la, lo, l'*).
- **Resurssit** sanan aiheen mukaan: ruokasanat 🌾, kodin ja tekemisen sanat 🔨, numerot, värit ja
  aika 📜, matkustus ja ihmiset 💰. Vuoron sanat hajautetaan niin, että kaikkia kertyy.
- **Rakennukset** (Foro, Granaio, Mercato, Tempio, Biblioteca, Acquedotto, Terme, Anfiteatro ja
  ihmeet Colosseo ja Pantheon) tuottavat joka vuoro, kasvattavat väestöä 👥 tai tuovat gloriaa ⭐.
- **Kielioppipuu** 📜: L'alfabeto → L'ascolto / Gli articoli → Il commercio / L'agricoltura.
- **Väestö** kasvaa ruoasta, ja isompi kaupunki tuottaa enemmän joka vastauksesta.
- **Tessere-bonus** 🀄: päivän Tessere-pöytä antaa kerran päivässä +4 kaikkiin resursseihin.
- Tiedostot: `impero/js/data.js` (rakennukset, tutkimukset), `game.js` (logiikka, testattu),
  `main.js` (käyttöliittymä).

## Tessere 🀄

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
- **Kuvakkeet 🍕:** noin 80 sanalla on kuvake, joka voi korvata suomenkielisen sanan laatalla.
  Yläpalkin nappi vaihtaa tilaa: teksti (Aa), osa kuvakkeina (🍕Aa) tai kaikki kuvakkeina (🍕).
- **Väärä pari** näyttää molempien laattojen oikeat käännökset.
- **Ääntäminen** selaimen italiankielisellä puhesynteesillä. Sen saa pois 🔊-napista, ja seuraava
  napautus keskeyttää lausunnan.
- **Päiväputki 🔥** ja harjoituspöydät päivän pöydän jälkeen.
- **Tilastot 📊:** kalenteri pelatuista päivistä, keskiaika, paras aika, virheettömien osuus ja
  sanaston tila (hallussa / kertauksessa / oppimatta).
- **Jaettava tulos** Wordle-tyyliin: pöydän numero, aika, virheet ja emojiruudukko parien
  ratkaisujärjestyksestä (🟩 suoraan, 🟨 vihjeellä, 🟥 virheen kautta).
- Vihje 💡 ja sekoitus 🔀, kun pareja ei löydy.
- PWA: lisättävissä puhelimen aloitusnäytölle, toimii myös ilman verkkoa.
- Edistyminen tallentuu selaimen `localStorage`en, joten palvelinta ei tarvita.

### Tesseren rakenne

| Tiedosto | Sisältö |
|---|---|
| `shared/words.js` | Sanasto (noin 120 paria teemoittain, valinnainen kuvake) |
| `tessere/js/layout.js` | Pöytämuodot: laattojen paikat ja kerrokset (`?layout=Portaat` pakottaa muodon) |
| `tessere/js/board.js` | Vapaat laatat, parit ja ratkaistavan pöydän generointi |
| `tessere/js/progress.js` | Päiväputki, historia ja tallennus (kertaus: `shared/srs.js`) |
| `tessere/js/stats.js` | Tilastot, kalenteri ja jakoteksti |
| `shared/speech.js` | Ääntäminen |
| `tessere/js/main.js` | Käyttöliittymä |

## Jatkoideoita

- Impero: Italian kartta ja uudet kaupungit, tapahtumat, verbien taivutus kielioppipuuhun

- Lisää pöytämuotoja (pyramidi, Colosseum) ja teemapöytiä
- Verbien taivutusparit, artikkelipelit (*il / la*)
- Harhautuslaatat ja "väärät ystävät" (*la camera* = huone)
- Muistutusilmoitus illalla (vaatii push-palvelimen tai kalenterimuistutuksen)
