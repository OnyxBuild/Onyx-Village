// ===== La musique 8 bits (aucun fichier audio : tout est généré par le code) =====
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const freq = (n) => 440 * 2 ** ((12 * (+n[n.length - 1] + 1) + NOTE[n[0]] - 69) / 12);

// la mélodie : [note, durée en temps]
const MELODY = [
  ["E5", 1], ["G5", 1], ["C6", 1], ["G5", 1], ["A5", 1], ["F5", 1], ["A5", 2],
  ["G5", 1], ["E5", 1], ["C5", 1], ["E5", 1], ["D5", 3], [null, 1],
  ["E5", 1], ["G5", 1], ["C6", 1], ["E6", 1], ["D6", 1], ["B5", 1], ["G5", 2],
  ["A5", 1], ["F5", 1], ["D5", 1], ["F5", 1], ["C5", 3], [null, 1],
];
const BASS = [
  ["C3", 2], ["G2", 2], ["F3", 2], ["C3", 2], ["C3", 2], ["G2", 2], ["G2", 2], ["B2", 2],
  ["C3", 2], ["G2", 2], ["G2", 2], ["D3", 2], ["D3", 2], ["A2", 2], ["C3", 2], ["G2", 2],
];

const Sound = {
  ctx: null, master: null, muted: false,

  // le navigateur impose un clic ou une touche avant de jouer du son : on démarre donc ici
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.music();
  },

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
  },

  // joue une note : fréquence, durée, forme d'onde, volume, délai
  tone(f, dur, type = "square", vol = 0.06, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  music() {
    const beat = 60 / 128;
    const track = (notes, type, vol) => {
      let i = 0, next = this.ctx.currentTime + 0.1;
      return () => {
        while (next < this.ctx.currentTime + 0.3) {        // on programme les notes un peu à l'avance
          const [n, b] = notes[i];
          if (n) this.tone(freq(n), b * beat * 0.9, type, vol, next - this.ctx.currentTime);
          next += b * beat;
          i = (i + 1) % notes.length;
        }
      };
    };
    const players = [track(MELODY, "square", 0.03), track(BASS, "triangle", 0.09)];
    setInterval(() => players.forEach((p) => p()), 50);
  },

  select() { this.tone(700, 0.06, "square", 0.05); },
};
