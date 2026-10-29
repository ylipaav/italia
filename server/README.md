# Tulostaulupalvelin (Cloudflare Worker)

Pieni Worker, joka tallentaa pelaajien tulokset KV-varastoon ryhmäkoodin alle. Ei kirjautumista.
Ilmainen taso riittää: tulostaulu tekee muutaman pyynnön pelaajaa kohti päivässä.

## Julkaisu web-käyttöliittymästä (ei vaadi asennuksia)

1. Cloudflare Dashboard → **Storage & Databases → KV** → *Create a namespace*, nimeksi `italia-board`.
2. **Workers & Pages → Create → Create Worker**, nimeksi `italia-board`, *Deploy*.
3. Workerin sivulla *Edit code*: korvaa koodi tiedoston `worker.js` sisällöllä ja *Deploy*.
4. Workerin **Settings → Bindings → Add → KV namespace**: Variable name `SCORES`, valitse `italia-board`. *Deploy*.
5. Osoite on muotoa `https://italia-board.<tilisi>.workers.dev`. Tarkista: osoitteen avaaminen
   selaimessa näyttää `{"ok":true,"service":"italia-board"}`.

## Julkaisu komentoriviltä (vaihtoehto)

```sh
cd server
npx wrangler login
npx wrangler kv namespace create SCORES     # kopioi id tiedostoon wrangler.toml
npx wrangler deploy
```

## Käyttöönotto peleissä

Aloitussivu → **Tulostaulu → Asetukset**: palvelimen osoite, yhteinen ryhmäkoodi ja ruksi
"Lähetä tulokseni". Sama osoite ja koodi jokaiseen puhelimeen. Jos haluat, että osoitetta ei
tarvitse kirjoittaa, aseta se vakioon `DEFAULT_BOARD_URL` tiedostossa `shared/board.js`.

## Rajapinta

| Pyyntö | Sisältö |
|---|---|
| `POST /submit` | `{ group, name, game: "tessere", date, seconds, mistakes, hints, pairs, layout }` tai `{ group, name, game: "impero", gloria, pop, buildings, techs, turns }` |
| `GET /board?group=…&game=tessere&date=YYYY-MM-DD` | päivän Tessere-tulokset ajan mukaan |
| `GET /board?group=…&game=impero` | Imperon tilanne pelaajittain glorian mukaan |

Ryhmäkoodi tallennetaan hajautettuna, Tesseren tuloksista säilyy päivän paras, Imperosta
tuorein tilanne. Tiedot vanhenevat 120 päivässä. Testit: `tests/worker.test.js`.
