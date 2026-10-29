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
(`server/`). Kaikki ovat oletuksena ryhmässä `MYP` ja lähetys on päällä; aloitussivu näyttää päivän Tessere-ajat ja
Imperon tilanteen. Ryhmäkoodin voi vaihtaa ja lähetyksen kytkeä pois asetuksista. Ilman palvelinta
pelit toimivat täysin kuten ennen.

## Impero 🏛️

Civilization-henkinen rakentelupeli, jossa italian osaaminen on valtakunnan tuotantovoima.
Ei sotaa eikä vastustajia: rakentelu, tutkimus ja laajentuminen riittävät.

- **3 vuoroa päivässä**, kussakin kuusi tehtävää. Vuorojen loputtua voi ostaa kullalla enintään 3 lisävuoroa (10, 20, 30 💰). Noin joka kolmas vuoro alkaa **tapahtumalla**,
  johon vastataan italiaksi (*Compro / Rifiuto*); suomennos ja seuraus näkyvät valinnan jälkeen.
- **Resurssit** sanan aiheen mukaan: ruoka 🌾, koti ja tekeminen 🔨, numerot, värit, aika ja
  kulttuuri 📜, matkustus ja ihmiset 💰. Vuoron sanat hajautetaan niin, että kaikkia kertyy.
- **Kartta** 🗺️: Italia 13 alueena, aluksi sumun peitossa. Tutkimusmatka naapurialueelle maksaa
  🌾 ja 💰, vie vuoron ja sisältää kuusi tehtävää alueen aiheesta; 4/6 oikein perustaa kaupungin.
  Kaupungit tuottavat (Firenze 📜, Milano 💰…) tai vahvistavat aiheen sanoja (Napoli: ruoka).
  Sicilia ja Sardegna vaativat tutkimuksen *La navigazione*.
- **Aikakaudet**: Regno → Repubblica (⭐ 60) → Impero (160) → Rinascimento (320) → Italia moderna
  (600). Jokainen vaihtaa värisävyn ja avaa rakennuksia; renessanssi tuo kulttuurisanaston.
- **Rakennukset** (24): Forosta ja Granaiosta Universitàan ja Ferroviaan. **Ihmeet** ✨ (Colosseo,
  Pantheon, Via Appia, Duomo di Firenze, Divina Commedia, Vespa) vaativat resurssien lisäksi,
  että aiheen sanoja on hallussa, ja kertovat valmistuessaan lyhyen kulttuuritiedon.
- **Kielioppipuu** 📜 (18 tutkimusta): L'alfabeto, I numeri, L'ascolto, Gli articoli, I plurali,
  Il presente, Il passato prossimo, Il futuro, Le preposizioni, Gli aggettivi, I numeri grandi
  (hinnat ja kellonajat) sekä edut (Il commercio, L'agricoltura, L'esplorazione, La navigazione,
  L'ingegneria, La cultura, La stampa). Avatut tehtävätyypit tulevat vuoroihin ja tuottavat 📜.
- **Väestö** kasvaa ruoasta, ja isompi valtakunta tuottaa enemmän joka vastauksesta.
- **Tessere-bonus** 🀄: päivän Tessere-pöytä antaa kerran päivässä +4 kaikkiin resursseihin.
- Tiedostot: `impero/js/data.js` (alueet, aikakaudet, rakennukset, tutkimukset, tapahtumat),
  `game.js` (logiikka, testattu), `main.js` (käyttöliittymä), `shared/grammar.js` (verbit,
  numerot, monikot, prepositiot, adjektiivit).

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

- Impero: lisää alueita ja tapahtumia, kaupunkikohtaiset rakennukset, tasapainotus pelikokemuksen mukaan
- Lisää pöytämuotoja (pyramidi, Colosseum) ja teemapöytiä
- Verbien taivutusparit, artikkelipelit (*il / la*)
- Harhautuslaatat ja "väärät ystävät" (*la camera* = huone)
- Muistutusilmoitus illalla (vaatii push-palvelimen tai kalenterimuistutuksen)
