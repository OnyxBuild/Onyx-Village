// ===== Petits outils partagés par tout le jeu =====
const VIEW_W = 240, VIEW_H = 160;                     // le jeu est dessiné en 240x160 puis agrandi x4

// crée un canvas invisible sur lequel on peut dessiner
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;                     // pas de flou : on veut des pixels bien nets
  return [c, x];
}

const rect = (x, color, px, py, w, h) => { x.fillStyle = color; x.fillRect(px, py, w, h); };
const random = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;   // hasard répétable
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = (s) => `${s}px "Press Start 2P", "Courier New", monospace`;
