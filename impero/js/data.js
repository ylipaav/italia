// Imperon pelidata: resurssit, rakennukset ja kielioppipuu.

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
  Matkustus: 'gold',
  Tervehdykset: 'gold',
  Ihmiset: 'gold',
};

// yield: resursseja joka vuoron lopussa. pop: lisää asukkaita. gloria: pisteitä.
export const BUILDINGS = [
  { id: 'foro', name: 'Foro', icon: '🏛️', cost: { prod: 10 }, yield: { gold: 1 }, desc: 'Kaupungin sydän. +1 💰 joka vuoro.' },
  { id: 'granaio', name: 'Granaio', icon: '🌾', cost: { prod: 12 }, yield: { food: 1 }, desc: 'Viljavarasto. +1 🌾 joka vuoro.' },
  { id: 'mercato', name: 'Mercato', icon: '🏪', cost: { prod: 8, gold: 15 }, yield: { gold: 2 }, desc: 'Tori. +2 💰 joka vuoro.' },
  { id: 'tempio', name: 'Tempio', icon: '⛪', cost: { prod: 15, gold: 10 }, gloria: 5, desc: 'Jumalten suosio. +5 ⭐.' },
  { id: 'biblioteca', name: 'Biblioteca', icon: '📚', cost: { prod: 20, science: 10 }, yield: { science: 1 }, desc: 'Kirjasto. +1 📜 joka vuoro.' },
  { id: 'acquedotto', name: 'Acquedotto', icon: '🚰', cost: { prod: 25, science: 5 }, pop: 2, requires: ['foro'], desc: 'Puhdasta vettä. +2 👥.' },
  { id: 'terme', name: 'Terme', icon: '🛁', cost: { prod: 30, gold: 15 }, pop: 2, gloria: 5, requires: ['acquedotto'], desc: 'Kylpylä. +2 👥, +5 ⭐.' },
  { id: 'anfiteatro', name: 'Anfiteatro', icon: '🎭', cost: { prod: 40, gold: 20 }, gloria: 10, desc: 'Näytelmiä kansalle. +10 ⭐.' },
  { id: 'colosseo', name: 'Colosseo', icon: '🏟️', cost: { prod: 80, gold: 40 }, gloria: 30, wonder: true, requires: ['anfiteatro'], desc: 'Ihme. +30 ⭐.' },
  { id: 'pantheon', name: 'Pantheon', icon: '🏛', cost: { prod: 60, science: 40 }, gloria: 30, wonder: true, requires: ['tempio', 'biblioteca'], desc: 'Ihme. +30 ⭐.' },
];

// Kielioppipuu: tutkimus maksaa tiedettä ja avaa uusia tehtävätyyppejä tai etuja.
export const TECHS = [
  { id: 'alfabeto', name: "L'alfabeto", icon: '🔤', cost: 8, desc: 'Avaa tehtävät italiasta suomeen.' },
  { id: 'ascolto', name: "L'ascolto", icon: '👂', cost: 15, requires: ['alfabeto'], desc: 'Avaa kuuntelutehtävät: kuule sana ja valitse käännös.' },
  { id: 'articoli', name: 'Gli articoli', icon: '📝', cost: 20, requires: ['alfabeto'], desc: 'Avaa artikkelitehtävät: il, la, lo vai l’?' },
  { id: 'commercio', name: 'Il commercio', icon: '⚖️', cost: 30, requires: ['articoli'], desc: 'Kauppasanat tuottavat tuplasti 💰.' },
  { id: 'agricoltura', name: "L'agricoltura", icon: '🌱', cost: 30, requires: ['ascolto'], desc: 'Ruokasanat tuottavat tuplasti 🌾.' },
];

export const TURNS_PER_DAY = 3;
export const QUESTIONS_PER_TURN = 6;
export const TESSERE_BONUS = 4; // kutakin resurssia, kun päivän Tessere-pöytä on pelattu
