// ===== ONYX VILLAGE - Épisode 1 : le menu d'accueil =====
// Un ciel étoilé dessiné par le code, avec le titre du jeu par-dessus.

const display = document.getElementById("display");
const ctx = display.getContext("2d");
const [view, vctx] = canvas(VIEW_W, VIEW_H);
let time = 0, started = false;

// ---------- le ciel : un dégradé en bandes, des étoiles et la lune ----------
const SKY = ["#0a0820", "#0d0b2a", "#120f36", "#18134a", "#201a5c", "#2a2270", "#342a82"];
const r = random(11);
const stars = Array.from({ length: 70 }, () => ({ x: (r() * VIEW_W) | 0, y: (r() * 120) | 0, phase: r() * 6, big: r() < 0.2 }));
let shooting = null;                                                   // l'étoile filante du moment

function disc(x, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y++) for (let px = -radius; px <= radius; px++) if (Math.hypot(px, y) <= radius) rect(x, color, cx + px, cy + y, 1, 1);
}

function update() {
  time++;
  if (!shooting && time % 300 === 120) shooting = { x: 30 + r() * 90, y: 8 + r() * 30, life: 40 };
  else if (shooting) { shooting.x += 3; shooting.y += 1.4; if (--shooting.life <= 0) shooting = null; }
}

function drawScene() {
  SKY.forEach((color, i) => rect(vctx, color, 0, Math.round(i * VIEW_H / SKY.length), VIEW_W, Math.ceil(VIEW_H / SKY.length) + 1));

  for (const s of stars) {                                              // les étoiles scintillent chacune à leur rythme
    if (Math.sin(time / 20 + s.phase) < -0.3) continue;
    rect(vctx, s.big ? "#ffffff" : "#b8b4e8", s.x, s.y, 1, 1);
    if (s.big) { rect(vctx, "#b8b4e8", s.x - 1, s.y, 3, 1); rect(vctx, "#b8b4e8", s.x, s.y - 1, 1, 3); }
  }

  vctx.globalAlpha = 0.07; disc(vctx, 192, 34, 28, "#f4eecb"); disc(vctx, 192, 34, 21, "#f4eecb"); vctx.globalAlpha = 1;   // le halo
  disc(vctx, 192, 34, 15, "#d8d0a0"); disc(vctx, 191, 33, 14, "#f6f0d0");                                                  // la lune
  for (const [cx, cy, size] of [[186, 28, 4], [196, 38, 5], [190, 42, 3], [198, 27, 2]]) disc(vctx, cx, cy, size / 2 | 0, "#e2dba8");   // ses cratères

  if (shooting) for (let k = 0; k < 9; k++) rect(vctx, `rgba(255,255,255,${1 - k / 9})`, Math.round(shooting.x - k * 3), Math.round(shooting.y - k * 1.4), 2, 1);
}

// ---------- le menu ----------
function drawTitle() {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.font = FONT(78); ctx.fillStyle = "#101030"; ctx.fillText("ONYX", 486, 206);
  ctx.fillStyle = "#ffffff"; ctx.fillText("ONYX", 480, 200);
  ctx.font = FONT(58); ctx.fillStyle = "#101030"; ctx.fillText("VILLAGE", 486, 296);
  ctx.fillStyle = "#ffd54a"; ctx.fillText("VILLAGE", 480, 290);

  const blink = ((time / 30) | 0) % 2 === 0;                            // clignote deux fois par seconde
  ctx.font = FONT(22); ctx.fillStyle = "#ffffff";
  if (blink) ctx.fillText(started ? "LA SUITE BIENTOT..." : "APPUIE SUR ENTREE", 480, 430);

  ctx.font = FONT(12); ctx.fillStyle = "#b8b4e8"; ctx.fillText("une aventure par ONYXBUILD", 480, 560);
  ctx.textAlign = "left";
}

function draw() {
  drawScene();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(view, 0, 0, 960, 640);                                  // on agrandit x4
  drawTitle();
}

// ---------- clavier ----------
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "KeyM") return Sound.toggle();
  if (["Enter", "Space"].includes(e.code) && !started) {
    e.preventDefault();
    started = true;
    Sound.init();                                                       // la musique démarre ici
    Sound.select();
  }
});

// ---------- boucle du jeu : 60 images par seconde ----------
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(frame);
}
// on attend la police pixel (1,5 s maximum) avant de démarrer
Promise.race([document.fonts.load('22px "Press Start 2P"'), new Promise((ok) => setTimeout(ok, 1500))])
  .catch(() => {})
  .finally(() => requestAnimationFrame(frame));
