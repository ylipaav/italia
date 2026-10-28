// Italiankielinen ääntäminen selaimen puhesynteesillä. Kaikki on valinnaista:
// ääni voidaan kytkeä pois, ja seuraava napautus keskeyttää käynnissä olevan lausunnan.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let voice = null;

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  voice = voices.find((v) => v.lang === 'it-IT') ?? voices.find((v) => v.lang?.startsWith('it')) ?? null;
}

if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export const speechSupported = Boolean(synth);

export function speak(text) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  synth.speak(u);
}

export function stopSpeech() {
  synth?.cancel();
}
