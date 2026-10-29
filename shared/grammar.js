// Kielioppiaineisto tehtäviä varten: verbintaivutus, numerot, monikot, prepositiot ja
// adjektiivien taivutus. Käytetään Imperon kielioppipuussa; Tessere voi hyödyntää myöhemmin.

export const PERSONS = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

// Yleisimmät verbit: preesens, futuuri ja partisiippi (passato prossimo apuverbeineen).
export const VERBS = [
  { inf: 'essere', fi: 'olla', pres: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'], fut: ['sarò', 'sarai', 'sarà', 'saremo', 'sarete', 'saranno'], pp: 'stato', aux: 'essere' },
  { inf: 'avere', fi: 'omistaa', pres: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'], fut: ['avrò', 'avrai', 'avrà', 'avremo', 'avrete', 'avranno'], pp: 'avuto', aux: 'avere' },
  { inf: 'andare', fi: 'mennä', pres: ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno'], fut: ['andrò', 'andrai', 'andrà', 'andremo', 'andrete', 'andranno'], pp: 'andato', aux: 'essere' },
  { inf: 'fare', fi: 'tehdä', pres: ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno'], fut: ['farò', 'farai', 'farà', 'faremo', 'farete', 'faranno'], pp: 'fatto', aux: 'avere' },
  { inf: 'mangiare', fi: 'syödä', pres: ['mangio', 'mangi', 'mangia', 'mangiamo', 'mangiate', 'mangiano'], fut: ['mangerò', 'mangerai', 'mangerà', 'mangeremo', 'mangerete', 'mangeranno'], pp: 'mangiato', aux: 'avere' },
  { inf: 'bere', fi: 'juoda', pres: ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono'], fut: ['berrò', 'berrai', 'berrà', 'berremo', 'berrete', 'berranno'], pp: 'bevuto', aux: 'avere' },
  { inf: 'parlare', fi: 'puhua', pres: ['parlo', 'parli', 'parla', 'parliamo', 'parlate', 'parlano'], fut: ['parlerò', 'parlerai', 'parlerà', 'parleremo', 'parlerete', 'parleranno'], pp: 'parlato', aux: 'avere' },
  { inf: 'dormire', fi: 'nukkua', pres: ['dormo', 'dormi', 'dorme', 'dormiamo', 'dormite', 'dormono'], fut: ['dormirò', 'dormirai', 'dormirà', 'dormiremo', 'dormirete', 'dormiranno'], pp: 'dormito', aux: 'avere' },
  { inf: 'volere', fi: 'haluta', pres: ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono'], fut: ['vorrò', 'vorrai', 'vorrà', 'vorremo', 'vorrete', 'vorranno'], pp: 'voluto', aux: 'avere' },
  { inf: 'comprare', fi: 'ostaa', pres: ['compro', 'compri', 'compra', 'compriamo', 'comprate', 'comprano'], fut: ['comprerò', 'comprerai', 'comprerà', 'compreremo', 'comprerete', 'compreranno'], pp: 'comprato', aux: 'avere' },
  { inf: 'venire', fi: 'tulla', pres: ['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono'], fut: ['verrò', 'verrai', 'verrà', 'verremo', 'verrete', 'verranno'], pp: 'venuto', aux: 'essere' },
  { inf: 'vedere', fi: 'nähdä', pres: ['vedo', 'vedi', 'vede', 'vediamo', 'vedete', 'vedono'], fut: ['vedrò', 'vedrai', 'vedrà', 'vedremo', 'vedrete', 'vedranno'], pp: 'visto', aux: 'avere' },
];

// Passato prossimo: apuverbi + partisiippi. Essere-verbeillä partisiippi taipuu (io = mask. yks.).
export function passato(verb, person) {
  const aux = VERBS.find((v) => v.inf === verb.aux).pres[person];
  let pp = verb.pp;
  if (verb.aux === 'essere') {
    const plural = person >= 3;
    pp = plural ? pp.replace(/o$/, 'i') : pp;
  }
  return `${aux} ${pp}`;
}

// Numerot 0–100 italiaksi.
const UNITS = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

export function numberToItalian(n) {
  if (n < 20) return UNITS[n];
  if (n === 100) return 'cento';
  const t = Math.floor(n / 10);
  const u = n % 10;
  let tens = TENS[t];
  if (u === 1 || u === 8) tens = tens.slice(0, -1); // ventuno, ventotto
  if (u === 3) return `${tens}tré`;
  return tens + (u ? UNITS[u] : '');
}

// Monikot artikkeleineen. Käsin valittu lista, jotta epäsäännölliset eivät sotke.
export const PLURALS = [
  ['il treno', 'i treni'], ['la casa', 'le case'], ['il libro', 'i libri'], ['la sedia', 'le sedie'],
  ['il bambino', 'i bambini'], ['la finestra', 'le finestre'], ['il ponte', 'i ponti'], ['la chiave', 'le chiavi'],
  ['lo zucchero', 'gli zuccheri'], ['la mela', 'le mele'], ['il biglietto', 'i biglietti'], ['la stazione', 'le stazioni'],
  ['il letto', 'i letti'], ['la porta', 'le porte'], ['il formaggio', 'i formaggi'], ['la settimana', 'le settimane'],
  ['il caffè', 'i caffè'], ['la città', 'le città'], ["l'amico", 'gli amici'], ["l'uovo", 'le uova'],
  ["l'albergo", 'gli alberghi'], ['il pesce', 'i pesci'], ['la macchina', 'le macchine'], ['il giorno', 'i giorni'],
];

// Prepositiot: lause, suomennos, oikea vastaus ja vaihtoehdot.
export const PREPOSITIONS = [
  { it: 'Vado ___ Roma.', fi: 'Menen Roomaan.', answer: 'a', options: ['a', 'in', 'da', 'con'] },
  { it: 'Vado ___ Italia.', fi: 'Menen Italiaan.', answer: 'in', options: ['a', 'in', 'da', 'per'] },
  { it: 'Vengo ___ Finlandia.', fi: 'Tulen Suomesta.', answer: 'dalla', options: ['dalla', 'alla', 'nella', 'sulla'] },
  { it: 'Il libro è ___ tavolo.', fi: 'Kirja on pöydällä.', answer: 'sul', options: ['sul', 'nel', 'al', 'dal'] },
  { it: 'Un caffè ___ latte, per favore.', fi: 'Maitokahvi, kiitos.', answer: 'con', options: ['con', 'senza', 'per', 'di'] },
  { it: 'Un tè ___ zucchero.', fi: 'Tee ilman sokeria.', answer: 'senza', options: ['senza', 'con', 'di', 'da'] },
  { it: 'Parto ___ Milano domani.', fi: 'Lähden Milanoon huomenna.', answer: 'per', options: ['per', 'a', 'in', 'da'] },
  { it: 'La chiave è ___ borsa.', fi: 'Avain on laukussa.', answer: 'nella', options: ['nella', 'sulla', 'alla', 'dalla'] },
  { it: 'Abito ___ Helsinki.', fi: 'Asun Helsingissä.', answer: 'a', options: ['a', 'in', 'da', 'su'] },
  { it: 'Vado ___ dottore.', fi: 'Menen lääkäriin.', answer: 'dal', options: ['dal', 'al', 'nel', 'sul'] },
  { it: 'Il treno ___ Napoli parte alle otto.', fi: 'Juna Napoliin lähtee kahdeksalta.', answer: 'per', options: ['per', 'da', 'in', 'con'] },
  { it: 'Un bicchiere ___ vino.', fi: 'Lasi viiniä.', answer: 'di', options: ['di', 'da', 'con', 'a'] },
  { it: 'Siamo ___ spiaggia.', fi: 'Olemme rannalla.', answer: 'in', options: ['in', 'a', 'su', 'da'] },
  { it: 'Torno ___ casa alle sei.', fi: 'Palaan kotiin kuudelta.', answer: 'a', options: ['a', 'in', 'da', 'per'] },
];

// Adjektiivin taivutus substantiivin mukaan.
export const AGREEMENTS = [
  { noun: 'la casa', adj: 'bello', answer: 'bella', fi: 'kaunis talo' },
  { noun: 'il treno', adj: 'nuovo', answer: 'nuovo', fi: 'uusi juna' },
  { noun: 'le case', adj: 'bello', answer: 'belle', fi: 'kauniit talot' },
  { noun: 'i libri', adj: 'vecchio', answer: 'vecchi', fi: 'vanhat kirjat' },
  { noun: 'la pizza', adj: 'buono', answer: 'buona', fi: 'hyvä pizza' },
  { noun: 'il caffè', adj: 'caldo', answer: 'caldo', fi: 'kuuma kahvi' },
  { noun: "l'acqua", adj: 'freddo', answer: 'fredda', fi: 'kylmä vesi' },
  { noun: 'le mele', adj: 'rosso', answer: 'rosse', fi: 'punaiset omenat' },
  { noun: 'i bambini', adj: 'piccolo', answer: 'piccoli', fi: 'pienet lapset' },
  { noun: 'la macchina', adj: 'nero', answer: 'nera', fi: 'musta auto' },
  { noun: 'il vino', adj: 'bianco', answer: 'bianco', fi: 'valkoviini' },
  { noun: 'le sedie', adj: 'giallo', answer: 'gialle', fi: 'keltaiset tuolit' },
  { noun: 'la città', adj: 'grande', answer: 'grande', fi: 'suuri kaupunki' },
  { noun: 'i ponti', adj: 'grande', answer: 'grandi', fi: 'suuret sillat' },
];

export function adjectiveForms(adj) {
  if (adj.endsWith('e')) return [adj, adj.replace(/e$/, 'i')];
  const stem = adj.slice(0, -1);
  return [`${stem}o`, `${stem}a`, `${stem}i`, `${stem}e`];
}
