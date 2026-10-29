// Imperon pelidata: resurssit, aikakaudet, alueet, rakennukset, ihmeet, kielioppipuu ja tapahtumat.

export const RESOURCES = {
  food: { icon: '🌾', name: 'ruoka' },
  prod: { icon: '🔨', name: 'tuotanto' },
  science: { icon: '📜', name: 'tiede' },
  gold: { icon: '💰', name: 'kulta' },
};

// Sanaston teema → resurssi, jonka oikea vastaus tuottaa.
export const THEME_RESOURCE = {
  Ruoka: 'food',
  Koti: 'prod',
  Verbit: 'prod',
  Adjektiivit: 'prod',
  Numerot: 'science',
  Värit: 'science',
  Aika: 'science',
  Kulttuuri: 'science',
  Matkustus: 'gold',
  Tervehdykset: 'gold',
  Ihmiset: 'gold',
  Fraasit: 'gold',
  Kaupunki: 'gold',
  Vaatteet: 'gold',
  Ravintola: 'food',
  Luonto: 'food',
  Terveys: 'science',
  Työ: 'prod',
  Tunteet: 'prod',
};

// ---------- Aikakaudet ----------
// Siirtymä tapahtuu glorian mukaan. Jokainen avaa rakennuksia ja vaihtaa ulkoasun sävyn.
export const ERAS = [
  { id: 'regno', name: 'Regno', icon: '👑', gloria: 0, desc: 'Rooman kuningaskunta. Kylä Tiberin rannalla.' },
  { id: 'repubblica', name: 'Repubblica', icon: '🏛️', gloria: 60, desc: 'Tasavalta. Senaatti, akveduktit ja ensimmäiset provinssit.' },
  { id: 'impero', name: 'Impero', icon: '🦅', gloria: 160, desc: 'Keisarikunta. Colosseo, Pantheon ja tiet joka suuntaan.' },
  { id: 'rinascimento', name: 'Rinascimento', icon: '🎨', gloria: 320, desc: 'Renessanssi. Taide, tiede ja kaupunkivaltiot. Uusi sanasto: kulttuuri.' },
  { id: 'moderna', name: 'Italia moderna', icon: '🛵', gloria: 600, desc: 'Yhdistynyt Italia. Rautatiet, ooppera ja Vespa.' },
];

// ---------- Alueet ja kaupungit ----------
// x, y: sijainti kartalla (viewBox 0 0 100 130). theme: tutkimusmatkan tehtävien aihe.
// bonusTheme: tämän aiheen sanat tuottavat +1. income: tuotto joka vuoro. sea: vaatii La navigazione.
export const REGIONS = [
  { id: 'lazio', name: 'Lazio', city: 'Roma', x: 55, y: 64, theme: 'Fraasit', start: true, neighbors: ['toscana', 'umbria', 'campania', 'sardegna'] },
  { id: 'toscana', name: 'Toscana', city: 'Firenze', x: 44, y: 44, theme: 'Adjektiivit', cost: { food: 15, gold: 15 }, income: { science: 1 }, neighbors: ['liguria', 'emilia', 'umbria', 'lazio'], desc: 'Renessanssin kehto. +1 📜 joka vuoro.' },
  { id: 'umbria', name: 'Umbria', city: 'Perugia', x: 57, y: 51, theme: 'Luonto', cost: { food: 12, gold: 10 }, bonusTheme: 'Aika', neighbors: ['toscana', 'emilia', 'lazio'], desc: 'Italian vihreä sydän. Ajan sanat tuottavat +1 📜.' },
  { id: 'campania', name: 'Campania', city: 'Napoli', x: 69, y: 75, theme: 'Ruoka', cost: { food: 15, gold: 12 }, bonusTheme: 'Ruoka', neighbors: ['lazio', 'puglia', 'calabria'], desc: 'Pizzan kotikaupunki. Ruokasanat tuottavat +1 🌾.' },
  { id: 'emilia', name: 'Emilia-Romagna', city: 'Bologna', x: 47, y: 30, theme: 'Työ', cost: { food: 20, gold: 18 }, bonusTheme: 'Verbit', neighbors: ['lombardia', 'veneto', 'liguria', 'toscana', 'umbria'], desc: 'Euroopan vanhin yliopisto. Verbit tuottavat +1 🔨.' },
  { id: 'liguria', name: 'Liguria', city: 'Genova', x: 28, y: 32, theme: 'Matkustus', cost: { food: 18, gold: 20 }, income: { gold: 1 }, neighbors: ['piemonte', 'lombardia', 'emilia', 'toscana'], desc: 'Merenkulkijoiden satama. +1 💰 joka vuoro.' },
  { id: 'puglia', name: 'Puglia', city: 'Bari', x: 88, y: 72, theme: 'Ravintola', cost: { food: 22, gold: 15 }, income: { food: 1 }, neighbors: ['campania', 'calabria'], desc: 'Oliivilehtojen maa. +1 🌾 joka vuoro.' },
  { id: 'lombardia', name: 'Lombardia', city: 'Milano', x: 35, y: 16, theme: 'Vaatteet', cost: { food: 25, gold: 30 }, income: { gold: 2 }, neighbors: ['piemonte', 'veneto', 'emilia', 'liguria'], desc: 'Muodin ja kaupan pääkaupunki. +2 💰 joka vuoro.' },
  { id: 'veneto', name: 'Veneto', city: 'Venezia', x: 56, y: 16, theme: 'Numerot', cost: { food: 25, gold: 30 }, bonusTheme: 'Matkustus', neighbors: ['lombardia', 'emilia'], desc: 'Kauppiaiden tasavalta. Matkustussanat tuottavat +1 💰.' },
  { id: 'piemonte', name: 'Piemonte', city: 'Torino', x: 18, y: 18, theme: 'Koti', cost: { food: 25, gold: 25 }, income: { prod: 1 }, neighbors: ['lombardia', 'liguria'], desc: 'Alppien juurella. +1 🔨 joka vuoro.' },
  { id: 'calabria', name: 'Calabria', city: 'Reggio Calabria', x: 82, y: 98, theme: 'Tunteet', cost: { food: 25, gold: 20 }, bonusTheme: 'Ihmiset', neighbors: ['campania', 'puglia', 'sicilia'], desc: 'Saappaan kärki. Ihmisten sanat tuottavat +1 💰.' },
  { id: 'sicilia', name: 'Sicilia', city: 'Palermo', x: 66, y: 112, theme: 'Kaupunki', cost: { food: 30, gold: 35 }, sea: true, income: { food: 1, gold: 1 }, neighbors: ['calabria'], desc: 'Välimeren risteys. +1 🌾 ja +1 💰 joka vuoro.' },
  { id: 'sardegna', name: 'Sardegna', city: 'Cagliari', x: 22, y: 80, theme: 'Terveys', cost: { food: 30, gold: 30 }, sea: true, income: { prod: 2 }, neighbors: ['lazio'], desc: 'Nuraghien saari. +2 🔨 joka vuoro.' },
];

export const EXPEDITION_QUESTIONS = 6;
export const EXPEDITION_PASS = 4; // oikeita vastauksia, jotta kaupunki perustetaan

// ---------- Rakennukset ja ihmeet ----------
// era: aikaisin aikakausi. yield: tuotto joka vuoro. pop: asukkaita. gloria: pisteitä.
// requires: rakennuksia tai tutkimuksia. cities: vaadittu kaupunkien määrä (Roma mukaan lukien).
// Ihmeillä (wonder) on lisäksi mastery: montako aiheen sanaa pitää olla hallussa, ja fact.
export const BUILDINGS = [
  // Regno
  { id: 'foro', era: 'regno', name: 'Foro', icon: '🏛️', cost: { prod: 10 }, yield: { gold: 1 }, desc: 'Kaupungin sydän. +1 💰 joka vuoro.' },
  { id: 'granaio', era: 'regno', name: 'Granaio', icon: '🌾', cost: { prod: 12 }, yield: { food: 1 }, desc: 'Viljavarasto. +1 🌾 joka vuoro.' },
  { id: 'mercato', era: 'regno', name: 'Mercato', icon: '🏪', cost: { prod: 8, gold: 15 }, yield: { gold: 2 }, desc: 'Tori. +2 💰 joka vuoro.' },
  { id: 'tempio', era: 'regno', name: 'Tempio', icon: '⛪', cost: { prod: 15, gold: 10 }, gloria: 5, desc: 'Jumalten suosio. +5 ⭐.' },
  { id: 'mura', era: 'regno', name: 'Mura', icon: '🧱', cost: { prod: 18 }, yield: { prod: 1 }, gloria: 3, desc: 'Kaupunginmuuri. +1 🔨 joka vuoro, +3 ⭐.' },
  // Repubblica
  { id: 'biblioteca', era: 'repubblica', name: 'Biblioteca', icon: '📚', cost: { prod: 20, science: 10 }, yield: { science: 1 }, desc: 'Kirjasto. +1 📜 joka vuoro.' },
  { id: 'acquedotto', era: 'repubblica', name: 'Acquedotto', icon: '🚰', cost: { prod: 25, science: 5 }, pop: 2, requires: ['foro'], desc: 'Puhdasta vettä. +2 👥.' },
  { id: 'terme', era: 'repubblica', name: 'Terme', icon: '🛁', cost: { prod: 30, gold: 15 }, pop: 2, gloria: 5, requires: ['acquedotto'], desc: 'Kylpylä. +2 👥, +5 ⭐.' },
  { id: 'porto', era: 'repubblica', name: 'Porto', icon: '⚓', cost: { prod: 30, gold: 10 }, yield: { gold: 2 }, cities: 2, desc: 'Satama. +2 💰 joka vuoro. Vaatii toisen kaupungin.' },
  { id: 'anfiteatro', era: 'repubblica', name: 'Anfiteatro', icon: '🎭', cost: { prod: 40, gold: 20 }, gloria: 10, desc: 'Näytelmiä kansalle. +10 ⭐.' },
  // Impero
  { id: 'basilica', era: 'impero', name: 'Basilica', icon: '🏦', cost: { prod: 40, science: 20 }, yield: { science: 2 }, desc: 'Oikeuden ja kaupan halli. +2 📜 joka vuoro.' },
  { id: 'circo', era: 'impero', name: 'Circo Massimo', icon: '🏇', cost: { prod: 50, gold: 20 }, gloria: 15, desc: 'Vaunukilpailut. +15 ⭐.' },
  { id: 'colosseo', era: 'impero', name: 'Colosseo', icon: '🏟️', cost: { prod: 80, gold: 40 }, gloria: 30, wonder: true, requires: ['anfiteatro'], mastery: { theme: 'Ihmiset', count: 3 }, desc: 'Ihme. +30 ⭐.', fact: 'Colosseo valmistui vuonna 80 jaa. ja veti 50 000 katsojaa. Nimi tulee viereisestä Neron jättipatsaasta, Colossuksesta.' },
  { id: 'pantheon', era: 'impero', name: 'Pantheon', icon: '🏛', cost: { prod: 60, science: 40 }, gloria: 30, yield: { science: 1 }, wonder: true, requires: ['tempio', 'biblioteca'], mastery: { theme: 'Aika', count: 4 }, desc: 'Ihme. +30 ⭐, +1 📜 joka vuoro.', fact: 'Pantheonin betonikupoli on yhä maailman suurin raudoittamaton kupoli. Sen huipulla on avoin aukko, oculus, josta sade putoaa lattialle.' },
  { id: 'via_appia', era: 'impero', name: 'Via Appia', icon: '🛣️', cost: { prod: 70, gold: 30 }, gloria: 20, wonder: true, cities: 2, mastery: { theme: 'Matkustus', count: 5 }, desc: 'Ihme. +20 ⭐ ja +1 💰 joka kaupungista joka vuoro.', perCity: { gold: 1 }, fact: '"Kaikki tiet vievät Roomaan." Via Appia (312 eaa.) oli ensimmäinen suuri roomalaistie, ja osia sen kivetyksestä on käytössä yhä.' },
  // Rinascimento
  { id: 'universita', era: 'rinascimento', name: 'Università', icon: '🎓', cost: { prod: 50, science: 40 }, yield: { science: 3 }, requires: ['biblioteca'], desc: 'Yliopisto. +3 📜 joka vuoro.' },
  { id: 'bottega', era: 'rinascimento', name: 'Bottega', icon: '🎨', cost: { prod: 30, gold: 30 }, yield: { gold: 2, science: 1 }, desc: 'Taiteilijan työpaja. +2 💰 ja +1 📜 joka vuoro.' },
  { id: 'teatro', era: 'rinascimento', name: 'Teatro', icon: '🎟️', cost: { prod: 45, gold: 30 }, gloria: 15, desc: 'Teatteri. +15 ⭐.' },
  { id: 'duomo', era: 'rinascimento', name: 'Duomo di Firenze', icon: '⛩️', cost: { prod: 90, gold: 40 }, gloria: 35, yield: { science: 2 }, wonder: true, cityIn: 'toscana', mastery: { theme: 'Koti', count: 4 }, desc: 'Ihme. +35 ⭐, +2 📜 joka vuoro. Vaatii Firenzen.', fact: 'Brunelleschi rakensi Firenzen tuomiokirkon kupolin 1420–1436 ilman tukitelineitä. Se on yhä maailman suurin tiilikupoli.' },
  { id: 'divina', era: 'rinascimento', name: 'Divina Commedia', icon: '📖', cost: { prod: 40, science: 80 }, gloria: 40, wonder: true, mastery: { theme: 'Kulttuuri', count: 5 }, desc: 'Ihme. +40 ⭐ ja kulttuurisanat tuottavat +1 📜.', bonusTheme: 'Kulttuuri', fact: 'Danten Jumalainen näytelmä (n. 1320) kirjoitettiin latinan sijaan toscanan murteella, josta tuli italian kirjakielen perusta.' },
  // Italia moderna
  { id: 'ferrovia', era: 'moderna', name: 'Ferrovia', icon: '🚂', cost: { prod: 80, gold: 40 }, yield: { prod: 3, gold: 2 }, cities: 3, desc: 'Rautatie. +3 🔨 ja +2 💰 joka vuoro. Vaatii kolme kaupunkia.' },
  { id: 'caffe', era: 'moderna', name: 'Caffè storico', icon: '☕', cost: { prod: 40, gold: 30 }, yield: { gold: 2, science: 1 }, desc: 'Kahvila. +2 💰 ja +1 📜 joka vuoro.' },
  { id: 'opera', era: 'moderna', name: 'Teatro dell’Opera', icon: '🎼', cost: { prod: 70, gold: 50, science: 20 }, gloria: 25, requires: ['teatro'], desc: 'Oopperatalo. +25 ⭐.' },
  { id: 'vespa', era: 'moderna', name: 'Vespa', icon: '🛵', cost: { prod: 100, gold: 60 }, gloria: 50, yield: { gold: 3 }, wonder: true, mastery: { theme: 'Matkustus', count: 10 }, desc: 'Ihme. +50 ⭐, +3 💰 joka vuoro.', fact: 'Vespa ("ampiainen") esiteltiin 1946 Pontederassa. Piaggio teki sotakoneita, ja skootteri suunniteltiin niin, että hameessakin voi ajaa.' },
];

// ---------- Kielioppipuu ----------
// unlock: tehtävätyyppi, jonka tutkimus avaa. Muut vaikutukset tarkistetaan game.js:ssä tunnisteella.
export const TECHS = [
  { id: 'alfabeto', name: "L'alfabeto", icon: '🔤', cost: 8, unlock: 'it2fi', desc: 'Avaa tehtävät italiasta suomeen.' },
  { id: 'numeri', name: 'I numeri', icon: '🔢', cost: 12, requires: ['alfabeto'], unlock: 'number', desc: 'Avaa numerotehtävät 1–20: lue luku italiaksi.' },
  { id: 'ascolto', name: "L'ascolto", icon: '👂', cost: 15, requires: ['alfabeto'], unlock: 'listen', desc: 'Avaa kuuntelutehtävät: kuule sana ja valitse käännös.' },
  { id: 'articoli', name: 'Gli articoli', icon: '📝', cost: 20, requires: ['alfabeto'], unlock: 'article', desc: 'Avaa artikkelitehtävät: il, la, lo vai l’?' },
  { id: 'plurali', name: 'I plurali', icon: '👥', cost: 25, requires: ['articoli'], unlock: 'plural', desc: 'Avaa monikkotehtävät: il treno → i treni.' },
  { id: 'presente', name: 'Il presente', icon: '🗣️', cost: 30, requires: ['alfabeto'], unlock: 'conj', desc: 'Avaa verbintaivutuksen: io vado, tu vai…' },
  { id: 'commercio', name: 'Il commercio', icon: '⚖️', cost: 30, requires: ['articoli'], desc: 'Kauppasanat tuottavat tuplasti 💰.' },
  { id: 'agricoltura', name: "L'agricoltura", icon: '🌱', cost: 30, requires: ['ascolto'], desc: 'Ruokasanat tuottavat tuplasti 🌾.' },
  { id: 'esplorazione', name: "L'esplorazione", icon: '🧭', cost: 30, requires: ['numeri'], desc: 'Tutkimusmatkat maksavat 30 % vähemmän.' },
  { id: 'navigazione', name: 'La navigazione', icon: '⛵', cost: 35, requires: ['numeri'], desc: 'Meren yli: Sicilia ja Sardegna avautuvat.' },
  { id: 'numeri_grandi', name: 'I numeri grandi', icon: '💶', cost: 40, requires: ['numeri', 'ascolto'], unlock: 'price', desc: 'Avaa hinnat ja kellonajat 1–100: kuule luku, valitse oikea.' },
  { id: 'passato', name: 'Il passato prossimo', icon: '⏪', cost: 45, requires: ['presente'], unlock: 'past', desc: 'Avaa menneen ajan: ho mangiato, sono andato.' },
  { id: 'preposizioni', name: 'Le preposizioni', icon: '📍', cost: 45, requires: ['presente'], unlock: 'prep', desc: 'Avaa prepositiot: vado a Roma, in Italia.' },
  { id: 'aggettivi', name: 'Gli aggettivi', icon: '🎯', cost: 45, requires: ['plurali'], unlock: 'agree', desc: 'Avaa adjektiivien taivutuksen: la casa bella.' },
  { id: 'ingegneria', name: "L'ingegneria", icon: '📐', cost: 50, requires: ['plurali'], desc: 'Rakennukset maksavat 20 % vähemmän.' },
  { id: 'cultura', name: 'La cultura', icon: '🎭', cost: 60, requires: ['passato'], desc: 'Kulttuurisanat tulevat tehtäviin heti ja tuottavat tuplasti 📜.' },
  { id: 'futuro', name: 'Il futuro', icon: '⏩', cost: 70, requires: ['passato'], unlock: 'future', desc: 'Avaa futuurin: domani andrò a Roma.' },
  { id: 'stampa', name: 'La stampa', icon: '🖨️', cost: 70, requires: ['cultura'], desc: 'Kirjapaino. +2 📜 joka vuoro.' },
];

// ---------- Tapahtumat ----------
// Vuoron alussa noin joka kolmannella vuorolla. Teksti italiaksi, valinnat italiaksi; suomennos ja
// seuraus näytetään vasta valinnan jälkeen. months: vain näinä kuukausina. needs: ehto.
export const EVENTS = [
  { id: 'mercante', text: 'Un mercante di Genova offre spezie a buon prezzo.', fi: 'Genovalainen kauppias tarjoaa mausteita edulliseen hintaan.',
    options: [{ it: 'Compro', fi: 'Ostan', effect: { gold: -8, prod: 12 } }, { it: 'Rifiuto', fi: 'Kieltäydyn', effect: {} }] },
  { id: 'pellegrini', text: 'Arrivano pellegrini stanchi e affamati.', fi: 'Väsyneitä ja nälkäisiä pyhiinvaeltajia saapuu.',
    options: [{ it: 'Li accogliamo', fi: 'Otamme heidät vastaan', effect: { food: -5, gold: 6, gloria: 2 } }, { it: 'Chiudiamo le porte', fi: 'Suljemme portit', effect: { prod: 3 } }] },
  { id: 'nave', text: 'Una nave porta libri da Alessandria.', fi: 'Laiva tuo kirjoja Aleksandriasta.',
    options: [{ it: 'Li compriamo', fi: 'Ostamme ne', effect: { gold: -10, science: 12 } }, { it: 'Non ci servono', fi: 'Emme tarvitse niitä', effect: {} }] },
  { id: 'pioggia', text: 'Piove tutto il giorno.', fi: 'Sataa koko päivän.',
    options: [{ it: 'Restiamo a casa a leggere', fi: 'Jäämme kotiin lukemaan', effect: { science: 4 } }, { it: 'Lavoriamo nei campi', fi: 'Työskentelemme pelloilla', effect: { food: 4 } }] },
  { id: 'studente', text: 'Uno studente di Bologna cerca alloggio.', fi: 'Bolognalainen opiskelija etsii majapaikkaa.',
    options: [{ it: 'Lo ospitiamo', fi: 'Majoitamme hänet', effect: { food: -4, science: 8 } }, { it: 'Mi dispiace, no', fi: 'Valitettavasti ei', effect: {} }] },
  { id: 'festa', text: 'Il popolo chiede una festa.', fi: 'Kansa vaatii juhlaa.',
    options: [{ it: 'Facciamo festa!', fi: 'Juhlitaan!', effect: { food: -6, gold: -4, gloria: 4 } }, { it: 'Prima il lavoro', fi: 'Työ ensin', effect: { prod: 5 } }] },
  { id: 'vendemmia', text: 'È tempo di vendemmia: l’uva è matura.', fi: 'On viininkorjuun aika: rypäleet ovat kypsiä.', months: [9, 10],
    options: [{ it: 'Facciamo il vino', fi: 'Teemme viiniä', effect: { gold: 10 } }, { it: 'Conserviamo l’uva', fi: 'Säilömme rypäleet', effect: { food: 10 } }] },
  { id: 'carnevale', text: 'È Carnevale! Maschere e coriandoli in piazza.', fi: 'On karnevaali! Naamioita ja konfettia torilla.', months: [2],
    options: [{ it: 'Partecipiamo', fi: 'Osallistumme', effect: { gold: -5, gloria: 5 } }, { it: 'Restiamo a casa', fi: 'Jäämme kotiin', effect: { prod: 3 } }] },
  { id: 'ferragosto', text: 'Ferragosto: fa caldo e tutti vanno al mare.', fi: 'Ferragosto: on kuuma ja kaikki menevät merelle.', months: [8],
    options: [{ it: 'Andiamo al mare', fi: 'Menemme merelle', effect: { food: -3, gloria: 3 } }, { it: 'Lavoriamo', fi: 'Teemme töitä', effect: { prod: 6 } }] },
  { id: 'natale', text: 'È Natale. Le strade sono piene di luci.', fi: 'On joulu. Kadut ovat täynnä valoja.', months: [12],
    options: [{ it: 'Compriamo regali', fi: 'Ostamme lahjoja', effect: { gold: -8, gloria: 5 } }, { it: 'Risparmiamo', fi: 'Säästämme', effect: { gold: 6 } }] },
  { id: 'vesuvio', text: 'Il Vesuvio fuma. Napoli ha paura.', fi: 'Vesuvius savuaa. Napoli pelkää.', needs: { city: 'campania' },
    options: [{ it: 'Aiutiamo Napoli', fi: 'Autamme Napolia', effect: { prod: -10, gloria: 6 } }, { it: 'Aspettiamo', fi: 'Odotamme', effect: { food: -5 } }] },
  { id: 'artista', text: 'Un giovane artista chiede una commissione.', fi: 'Nuori taiteilija pyytää tilaustyötä.', needs: { era: 'rinascimento' },
    options: [{ it: 'Dipingi per noi', fi: 'Maalaa meille', effect: { gold: -15, gloria: 10 } }, { it: 'Torna più tardi', fi: 'Tule myöhemmin uudelleen', effect: {} }] },
  { id: 'treno', text: 'Il primo treno arriva in città!', fi: 'Ensimmäinen juna saapuu kaupunkiin!', needs: { era: 'moderna' },
    options: [{ it: 'Che meraviglia!', fi: 'Miten ihmeellistä!', effect: { gloria: 4, gold: 4 } }, { it: 'Troppo rumore', fi: 'Liikaa melua', effect: { prod: 4 } }] },
];

export const EVENT_CHANCE = 0.35;
export const TURNS_PER_DAY = 3;
export const EXTRA_TURNS_PER_DAY = 3; // kullalla ostettavia lisävuoroja päivässä
export const EXTRA_TURN_COST = 10; // ensimmäinen lisävuoro; seuraavat 20, 30
export const QUESTIONS_PER_TURN = 6;
export const TESSERE_BONUS = 4; // kutakin resurssia, kun päivän Tessere-pöytä on pelattu
