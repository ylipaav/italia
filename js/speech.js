// Italiankielinen ääntäminen selaimen puhesynteesillä. Kaikki on valinnaista:
// ääni voidaan kytkeä pois, ja seuraava napautus keskeyttää käynnissä olevan lausunnan.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let voice = null;
// Chrome vaientuu, jos lausuttava olio ehtii roskienkeruuseen kesken puheen: pidetään viite.
let current = null;

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
  if (!voice) pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'it-IT';
  if (voice) u.voice = voice;
  u.rate = 0.9;
  current = u;
  // iOS pudottaa lausunnan, jos speak() tulee heti cancel():n perään: annetaan pieni tauko.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => current === u && synth.speak(u), 60);
  } else {
    synth.speak(u);
  }
}

export function stopSpeech() {
  current = null;
  if (synth?.speaking || synth?.pending) synth.cancel();
}
