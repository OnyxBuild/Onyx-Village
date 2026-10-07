// ===== ONYX VILLAGE - Épisode 3 : le héros =====
// Après l'écran d'accueil, le ciel laisse place au village. On y découvre notre héros :
// il est dessiné par le code, on le déplace avec les flèches et la caméra le suit.
// Des villageois se promènent aussi : ils sont dessinés avec la même fonction, mais d'autres couleurs.

const display = document.getElementById("display");
const ctx = display.getContext("2d");
const [view, vctx] = canvas(VIEW_W + 1, VIEW_H + 1);                  // une case de marge pour les déplacements fins de la caméra
let time = 0, started = false, titleAlpha = 1, worldAlpha = 0;

// ---------- le ciel : un dégradé en bandes, des étoiles et la lune ----------
const SKY = ["#0a0820", "#0d0b2a", "#120f36", "#18134a", "#201a5c", "#2a2270", "#342a82"];
const r = random(11);
const stars = Array.from({ length: 70 }, () => ({ x: (r() * VIEW_W) | 0, y: (r() * 120) | 0, phase: r() * 6, big: r() < 0.2 }));
let shooting = null;                                                   // l'étoile filante du moment

function disc(x, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y++) for (let px = -radius; px <= radius; px++) if (Math.hypot(px, y) <= radius) rect(x, color, cx + px, cy + y, 1, 1);
}

function drawSky() {
  SKY.forEach((color, i) => rect(vctx, color, 0, Math.round(i * VIEW_H / SKY.length), VIEW_W + 1, Math.ceil(VIEW_H / SKY.length) + 1));

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

// ---------- Épisode 2 : la carte du village, 32 x 24 cases de 16 pixels ----------
const TILE = 16, COLS = 32, ROWS = 24;
const GRASS = 0, TALL = 1, PATH = 2, WATER = 3, TREE = 4, FLOWER = 5, BUSH = 6, ROCK = 7, SAND = 8, STONES = 9;

const map = Array.from({ length: ROWS }, () => Array(COLS).fill(GRASS));
const fill = (x1, y1, x2, y2, v) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) map[y][x] = v; };
const river = (y) => Math.round(15 + 5 * Math.sin(y / 3.4));                              // la rivière serpente du nord au sud

(function buildMap() {
  const r = random(21);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (x < 2 || y < 2 || x >= 30 || y >= 22) map[y][x] = TREE;                          // forêt autour
    else if ((x < 4 || y < 4 || x >= 28 || y >= 20) && r() < 0.35) map[y][x] = TREE;
  }
  fill(4, 5, 9, 9, TALL); fill(24, 4, 27, 8, TALL);                                      // herbes hautes
  fill(21, 13, 28, 19, SAND); fill(22, 14, 27, 18, WATER);                               // l'étang et sa plage
  for (const [x, y] of [[21, 13], [28, 13], [21, 19], [28, 19]]) map[y][x] = GRASS;      // coins arrondis
  for (const [x, y] of [[22, 14], [27, 14], [22, 18], [27, 18]]) map[y][x] = SAND;
  for (let y = 3; y < 22; y++) fill(river(y) - 5, y, river(y) - 4, y, PATH);             // un sentier le long de chaque rive
  for (let y = 9; y < 13; y++) fill(river(y) + 5, y, river(y) + 6, y, PATH);
  fill(17, 13, 20, 13, PATH);
  for (let y = 0; y < ROWS; y++) fill(river(y), y, river(y) + 1, y, WATER);              // la rivière
  fill(river(11) - 3, 11, river(11) - 1, 11, PATH); fill(river(11) + 2, 11, river(11) + 4, 11, PATH);
  map[11][river(11)] = STONES; map[11][river(11) + 1] = STONES;                          // un gué de pierres plates
  for (let y = 3; y < 21; y++) for (let x = 4; x < 28; x++) {
    if (map[y][x] !== GRASS) continue;
    const meadow = [[8, 12], [19, 7], [24, 11], [6, 18]].some(([mx, my]) => Math.hypot(x - mx, y - my) < 3.2);   // des prairies fleuries
    const f = meadow ? 0.5 : 0.05, roll = r();
    if (roll < f) map[y][x] = FLOWER;
    else if (roll < f + 0.06) map[y][x] = BUSH;
    else if (roll < f + 0.09) map[y][x] = TREE;
    else if (roll < f + 0.1) map[y][x] = ROCK;
  }
})();

// ---------- les tuiles ----------
function grassTile(seed) {
  const [c, x] = canvas(16, 16), r = random(seed);
  rect(x, "#6cc058", 0, 0, 16, 16);
  for (let i = 0; i < 16; i++) rect(x, "#5aab49", (r() * 15) | 0, (r() * 14) | 0, 1, 2);
  for (let i = 0; i < 7; i++) rect(x, "#86d46e", (r() * 14) | 0, (r() * 15) | 0, 2, 1);
  return c;
}
const GRASS_TILES = [11, 22, 33].map(grassTile);

function drawTile(x, id, tx, ty) {
  const px = tx * TILE, py = ty * TILE, r = random(tx * 31 + ty * 17);
  x.drawImage(GRASS_TILES[(tx * 7 + ty * 13) % 3], px, py);                 // toutes les cases ont de l'herbe dessous

  if (id === PATH || id === SAND) {
    rect(x, id === PATH ? "#e6cd8c" : "#f0e0a8", px, py, 16, 16);
    for (let i = 0; i < 12; i++) rect(x, id === PATH ? "#d4b66e" : "#e0cd90", px + ((r() * 15) | 0), py + ((r() * 15) | 0), 2, 1);
  } else if (id === WATER || id === STONES) {
    rect(x, "#3f8ae8", px, py, 16, 16);
    for (const [row, off] of [[2, 0], [7, 6], [12, 3]]) { rect(x, "#8cc4ff", px + off, py + row, 5, 1); rect(x, "#2f6fd0", px + ((off + 7) % 15), py + row + 2, 3, 1); }
    if (id === STONES) for (const [sx, sy, w] of [[2, 3, 6], [8, 9, 6]]) {          // deux pierres plates pour traverser
      rect(x, "rgba(0,0,0,.25)", px + sx, py + sy + 5, w + 1, 2);
      rect(x, "#8c8fa3", px + sx, py + sy, w, 5); rect(x, "#b4b7c9", px + sx, py + sy, w, 2); rect(x, "#6c6f84", px + sx, py + sy + 4, w, 1);
    }
  } else if (id === TALL) {
    for (const [cx, cy] of [[4, 4], [12, 4], [4, 12], [12, 12], [8, 8]]) {
      rect(x, "#2c8a38", px + cx - 3, py + cy + 1, 7, 3);
      rect(x, "#3fae4a", px + cx - 2, py + cy - 2, 1, 4); rect(x, "#59cf62", px + cx, py + cy - 3, 1, 5); rect(x, "#3fae4a", px + cx + 2, py + cy - 2, 1, 4);
    }
  } else if (id === FLOWER) {
    for (const [fx, fy, col] of [[3, 4, "#ff5a7a"], [10, 3, "#ffe14a"], [7, 10, "#ffffff"], [13, 11, "#ff5a7a"]]) {
      rect(x, "#3a9a3a", px + fx, py + fy + 2, 1, 3);
      rect(x, col, px + fx - 1, py + fy, 3, 1); rect(x, col, px + fx, py + fy - 1, 1, 3); rect(x, "#ffd54a", px + fx, py + fy, 1, 1);
    }
  } else if (id === BUSH) {
    rect(x, "rgba(0,0,0,.2)", px + 2, py + 12, 12, 3);
    for (let yy = 4; yy < 14; yy++) for (let xx = 1; xx < 15; xx++) {
      const d = Math.hypot((xx - 7.5) / 7, (yy - 9) / 5);
      if (d <= 1) rect(x, d > 0.85 ? "#1f6b2c" : (xx + yy < 14 ? "#4cc15a" : "#2f9a3e"), px + xx, py + yy, 1, 1);
    }
    for (const [bx, by] of [[4, 8], [9, 6], [11, 10], [6, 11]]) rect(x, "#e8445a", px + bx, py + by, 2, 2);   // des baies rouges
  } else if (id === ROCK) {
    rect(x, "rgba(0,0,0,.2)", px + 3, py + 12, 10, 3);
    rect(x, "#8c8fa3", px + 3, py + 7, 10, 6); rect(x, "#a9acc0", px + 4, py + 6, 7, 3); rect(x, "#6c6f84", px + 3, py + 11, 10, 2); rect(x, "#c9ccdc", px + 5, py + 7, 3, 1);
  } else if (id === TREE) {
    rect(x, "rgba(0,0,0,.22)", px + 2, py + 12, 12, 3);
    rect(x, "#6b3f1d", px + 6, py + 11, 4, 5);
    for (let yy = 0; yy < 14; yy++) for (let xx = 0; xx < 16; xx++) {
      const d = Math.hypot(xx - 7.5, yy - 6.5);
      if (d <= 7.4) rect(x, d > 6.3 ? "#1b5e20" : (xx + yy < 10 && d < 5 ? "#6fcf6a" : (xx + yy < 14 ? "#3fa44a" : "#2e8b3a")), px + xx, py + yy, 1, 1);
    }
  }

  // un liseré foncé là où le chemin, le sable ou l'eau touchent l'herbe
  const at = (dx, dy) => map[ty + dy]?.[tx + dx];
  const grassy = (n) => [GRASS, TALL, FLOWER, BUSH, ROCK].includes(n);
  const edge = id === PATH ? ["#c9ab63", grassy] : id === WATER ? ["#b4deff", (n) => n !== WATER && n !== STONES] : id === SAND ? ["#d8c58a", (n) => grassy(n) || n === TREE] : null;
  if (edge) {
    if (edge[1](at(0, -1))) rect(x, edge[0], px, py, 16, 1);
    if (edge[1](at(0, 1))) rect(x, edge[0], px, py + 15, 16, 1);
    if (edge[1](at(-1, 0))) rect(x, edge[0], px, py, 1, 16);
    if (edge[1](at(1, 0))) rect(x, edge[0], px + 15, py, 1, 16);
  }
}

// ---------- on dessine tout le décor une seule fois ----------
const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
const [world, wctx] = canvas(WORLD_W, WORLD_H);
for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(wctx, map[ty][tx], tx, ty);

// ---------- Épisode 3 : le héros ----------
// Un personnage de 16 x 16 pixels, dessiné rectangle par rectangle : casque audio, cheveux en pointes, sweat et jean.
// Pour changer de personnage, il suffit de changer les couleurs (la palette p).
const HERO = { hair: "#2a1f2d", skin: "#f2c29b", shirt: "#2d2d3f", light: "#8a5cff", pants: "#3b5b92", shoe: "#f4f4f4", phones: "#00e5ff", spiky: true };

// dir : "down" | "up" | "left" | "right" ; step : 0 = immobile, 1 et 2 = une jambe levée
function drawPerson(x, px, py, dir, step, p = HERO) {
  const side = dir === "left" || dir === "right", bob = step ? 1 : 0, by = py - bob;
  const X = (dx, w = 1) => px + (dir === "left" ? 16 - dx - w : dx);          // pour regarder à gauche, on retourne le dessin
  rect(x, "rgba(0,0,0,.28)", px + 3, py + 14, 10, 2);                          // l'ombre sous les pieds

  if (side) {                                                                   // ----- de profil
    const stride = step === 1 ? 1 : step === 2 ? -1 : 0;
    for (const [lx, up] of [[6 - stride, stride > 0], [7 + stride, stride < 0]]) {
      rect(x, p.pants, X(lx, 3), py + 11, 3, up ? 1 : 2); rect(x, p.shoe, X(lx, 3), py + (up ? 12 : 13), 3, 2);
    }
    rect(x, p.shirt, X(5, 6), by + 7, 6, 4 + bob);
    rect(x, p.shirt, X(7 - stride, 2), by + 7, 2, 3); rect(x, p.skin, X(7 - stride, 2), by + 10, 2, 1);   // le bras balance
    rect(x, p.skin, X(4, 8), by + 3, 8, 4);
    rect(x, p.hair, X(4, 8), by + 1, 8, 3); rect(x, p.hair, X(4, 3), by + 3, 3, 3);
    if (p.spiky) rect(x, p.hair, X(5, 6), by, 6, 1);
    if (p.phones) { rect(x, p.phones, X(6, 2), by + 3, 2, 4); rect(x, p.phones, X(4, 8), by + 1, 8, 1); }
    rect(x, "#222222", X(10), by + 5, 1, 1);
    return;
  }

  for (const [i, lx] of [5, 8].entries()) {                                     // ----- de face ou de dos : les deux jambes
    const up = step === i + 1 ? 1 : 0;                                          // la jambe qui avance se lève d'un pixel
    rect(x, p.pants, px + lx, py + 11, 3, 2 - up); rect(x, p.shoe, px + lx, py + 13 - up, 3, 2);
  }
  rect(x, p.shirt, px + 4, by + 7, 8, 4 + bob);                                 // le sweat et ses manches
  rect(x, p.shirt, px + 3, by + 7, 1, 3); rect(x, p.shirt, px + 12, by + 7, 1, 3);
  rect(x, p.skin, px + 3, by + 10, 1, 1); rect(x, p.skin, px + 12, by + 10, 1, 1);
  if (dir === "down") {
    rect(x, p.light, px + 7, by + 7, 2, 4 + bob);                               // la fermeture éclair
    rect(x, p.skin, px + 4, by + 3, 8, 4);
    rect(x, p.hair, px + 4, by + 1, 8, 3);
    rect(x, "#222222", px + 6, by + 5, 1, 1); rect(x, "#222222", px + 9, by + 5, 1, 1);
  } else {                                                                      // de dos : les cheveux couvrent toute la tête
    rect(x, p.hair, px + 4, by + 1, 8, 6);
    rect(x, p.light, px + 6, by + 7, 4, 1);                                     // le bord de la capuche
  }
  if (p.spiky) rect(x, p.hair, px + 5, by, 6, 1);                               // les pointes
  if (p.phones) { rect(x, p.phones, px + 2, by + 3, 2, 4); rect(x, p.phones, px + 12, by + 3, 2, 4); rect(x, p.phones, px + 3, by + 1, 10, 1); }   // le casque
}

// ---------- se déplacer ----------
const SOLID = new Set([TREE, WATER, BUSH, ROCK]);                               // on ne passe pas à travers
const MOVES = { ArrowUp: [0, -1, "up"], KeyW: [0, -1, "up"], ArrowDown: [0, 1, "down"], KeyS: [0, 1, "down"],
                ArrowLeft: [-1, 0, "left"], KeyA: [-1, 0, "left"], ArrowRight: [1, 0, "right"], KeyD: [1, 0, "right"] };   // KeyW/A/S/D = ZQSD sur un clavier français
const keys = [];                                                                // les touches enfoncées : la dernière pressée décide
const hero = { x: 13 * TILE, y: 11 * TILE - 2, dir: "down", walk: 0, moving: false };

const people = [hero];                                                          // le héros et les villageois : personne ne traverse personne

// les pieds de who (8 x 6 pixels) ne doivent toucher ni case solide, ni autre personnage
function blocked(who, x, y) {
  if (people.some((o) => o !== who && Math.abs(o.x - x) < 10 && Math.abs(o.y - y) < 7)) return true;
  return [[4, 10], [11, 10], [4, 15], [11, 15]].some(([fx, fy]) => {
    const tile = map[Math.floor((y + fy) / TILE)]?.[Math.floor((x + fx) / TILE)];
    return tile === undefined || SOLID.has(tile);
  });
}

// avance d'un pixel ; contre un coin d'arbre ou de rocher, on glisse pour le contourner
function step(who, dx, dy) {
  if (!blocked(who, who.x + dx, who.y + dy)) { who.x += dx; who.y += dy; return true; }
  for (let n = 1; n <= 4; n++) for (const s of [-1, 1]) {
    if (blocked(who, who.x + dx + (dy ? s * n : 0), who.y + dy + (dx ? s * n : 0))) continue;
    who.x += dy ? s : 0; who.y += dx ? s : 0;
    return true;
  }
  return false;
}

function moveHero() {                                                           // appelée 60 fois par seconde : 1 pixel par appel
  const [dx, dy, dir] = MOVES[keys[keys.length - 1]] || [];
  hero.moving = false;
  if (!dir) return;
  hero.dir = dir;
  if (step(hero, dx, dy)) { hero.moving = true; hero.walk += 0.12; }            // walk fait alterner les jambes
}

// ---------- les villageois : ils flânent autour de leur case, à demi-vitesse ----------
const VILLAGERS = [
  { tx: 9, ty: 11, p: { hair: "#4a9a3a", skin: "#f0c090", shirt: "#e0a030", light: "#ffd27a", pants: "#5a4a3a", shoe: "#222222" } },                       // le jardinier
  { tx: 18, ty: 7, p: { hair: "#7a3b1d", skin: "#e8b08a", shirt: "#c0392b", light: "#ff8a7a", pants: "#2f3f5f", shoe: "#3a2a1a" } },                       // la boulangère
  { tx: 24, ty: 11, p: { hair: "#e8d9a0", skin: "#f6d2b0", shirt: "#2a8f7a", light: "#8ae8d0", pants: "#4a4a5a", shoe: "#f4f4f4", phones: "#ff5a7a" } },     // le jeune au casque rose
];
for (const [i, v] of VILLAGERS.entries()) {
  Object.assign(v, { x: v.tx * TILE, y: v.ty * TILE - 2, hx: v.tx * TILE, hy: v.ty * TILE - 2, dir: "down", walk: 0, moving: false, timer: 20 + i * 25, go: null, rnd: random(100 + i) });
  people.push(v);
}

function moveVillager(v) {
  if (--v.timer <= 0) {                                                         // toutes les 1 à 2 secondes, une nouvelle idée
    const far = Math.abs(v.x - v.hx) + Math.abs(v.y - v.hy) > 48;
    const dirs = [[0, 1, "down"], [0, -1, "up"], [-1, 0, "left"], [1, 0, "right"], null];
    const back = Math.abs(v.hx - v.x) > Math.abs(v.hy - v.y) ? (v.hx < v.x ? dirs[2] : dirs[3]) : (v.hy < v.y ? dirs[1] : dirs[0]);   // trop loin : retour à la maison
    v.go = far ? back : dirs[Math.floor(v.rnd() * dirs.length)];
    v.timer = 40 + Math.floor(v.rnd() * 70);
  }
  v.moving = false;
  if (!v.go || time % 2) return;                                                // un pixel toutes les deux images
  v.dir = v.go[2];
  if (step(v, v.go[0], v.go[1])) { v.moving = true; v.walk += 0.2; } else v.go = null;
}

const cam = { x: clamp(hero.x + 8 - VIEW_W / 2, 0, WORLD_W - VIEW_W), y: clamp(hero.y + 8 - VIEW_H / 2, 0, WORLD_H - VIEW_H) };

function updateCamera() {                                                       // la caméra suit le héros en douceur, sans sortir de la carte
  const tx = clamp(hero.x + 8 - VIEW_W / 2, 0, WORLD_W - VIEW_W), ty = clamp(hero.y + 8 - VIEW_H / 2, 0, WORLD_H - VIEW_H);
  cam.x = Math.round((cam.x + (tx - cam.x) * 0.12) * 4) / 4;                    // arrondie au quart de pixel : le mouvement reste fluide
  cam.y = Math.round((cam.y + (ty - cam.y) * 0.12) * 4) / 4;
}

// ---------- ce qui bouge : des papillons ----------
const butterflies = Array.from({ length: 6 }, (_, i) => ({ x: 120 + i * 55, y: 110 + (i % 3) * 70, a: i * 2, color: ["#ff8fc0", "#ffe14a", "#8fd0ff", "#ffffff"][i % 4] }));

function update() {
  time++;
  if (!shooting && time % 300 === 120) shooting = { x: 30 + r() * 90, y: 8 + r() * 30, life: 40 };
  else if (shooting) { shooting.x += 3; shooting.y += 1.4; if (--shooting.life <= 0) shooting = null; }

  for (const b of butterflies) { b.a += 0.03; b.x += Math.cos(b.a * 1.3) * 0.7; b.y += Math.sin(b.a * 1.9) * 0.5; }
  if (!started) return;
  titleAlpha = Math.max(0, titleAlpha - 1 / 40);                          // le titre s'efface...
  worldAlpha = Math.min(1, worldAlpha + 1 / 80);                          // ...et le décor apparaît
  moveHero(); VILLAGERS.forEach(moveVillager); updateCamera();
}

function drawWorld() {
  const cx = Math.floor(cam.x), cy = Math.floor(cam.y);
  vctx.drawImage(world, -cx, -cy);

  for (let ty = Math.floor(cy / TILE); ty <= (cy + VIEW_H) / TILE; ty++) for (let tx = Math.floor(cx / TILE); tx <= (cx + VIEW_W) / TILE; tx++) {
    if (map[ty]?.[tx] !== WATER) continue;                                // l'eau scintille
    if (((time >> 4) + tx * 3 + ty * 5) % 4 === 0) rect(vctx, "#d6ecff", tx * TILE + 3 + ((time >> 3) % 6) - cx, ty * TILE + 4 + ((tx + ty) % 3) * 4 - cy, 4, 1);
  }

  for (const o of [...people].sort((a, b) => a.y - b.y)) {                // celui qui est le plus bas passe devant
    drawPerson(vctx, o.x - cx, o.y - cy, o.dir, o.moving ? [1, 0, 2, 0][Math.floor(o.walk) % 4] : 0, o.p);
    for (let ty = Math.floor((o.y + 9) / TILE); ty <= Math.floor((o.y + 15) / TILE); ty++) for (let tx = Math.floor(o.x / TILE); tx <= Math.floor((o.x + 15) / TILE); tx++) {
      if (map[ty]?.[tx] !== TALL) continue;                               // l'herbe haute cache les pieds
      const x0 = Math.max(tx * TILE, o.x), x1 = Math.min(tx * TILE + TILE, o.x + 16), y0 = Math.max(ty * TILE, o.y + 9), y1 = Math.min(ty * TILE + TILE, o.y + 16);
      if (x1 > x0 && y1 > y0) vctx.drawImage(world, x0, y0, x1 - x0, y1 - y0, x0 - cx, y0 - cy, x1 - x0, y1 - y0);
    }
  }
  for (const b of butterflies) {
    const wing = Math.sin(time * 0.4 + b.a * 9) > 0 ? 3 : 1, bx = Math.round(b.x - cx), by = Math.round(b.y - cy);
    rect(vctx, b.color, bx - wing, by, wing, 2); rect(vctx, b.color, bx + 1, by, wing, 2); rect(vctx, "#333333", bx, by, 1, 2);
  }
}

function drawScene() {
  if (worldAlpha < 1) drawSky();
  if (!started) return;
  vctx.globalAlpha = worldAlpha; drawWorld(); vctx.globalAlpha = 1;
}

// ---------- le menu ----------
function drawTitle() {
  if (titleAlpha <= 0) return;
  ctx.globalAlpha = titleAlpha;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  ctx.font = FONT(78); ctx.fillStyle = "#101030"; ctx.fillText("ONYX", 486, 206);
  ctx.fillStyle = "#ffffff"; ctx.fillText("ONYX", 480, 200);
  ctx.font = FONT(58); ctx.fillStyle = "#101030"; ctx.fillText("VILLAGE", 486, 296);
  ctx.fillStyle = "#ffd54a"; ctx.fillText("VILLAGE", 480, 290);

  const blink = ((time / 30) | 0) % 2 === 0;                            // clignote deux fois par seconde
  ctx.font = FONT(22); ctx.fillStyle = "#ffffff";
  if (blink && !started) ctx.fillText("APPUIE SUR ENTREE", 480, 430);

  ctx.font = FONT(12); ctx.fillStyle = "#b8b4e8"; ctx.fillText("une aventure par ONYXBUILD", 480, 560);
  ctx.textAlign = "left"; ctx.globalAlpha = 1;
}

function draw() {
  drawScene();
  ctx.imageSmoothingEnabled = false;
  const fx = started ? cam.x - Math.floor(cam.x) : 0, fy = started ? cam.y - Math.floor(cam.y) : 0;
  ctx.drawImage(view, -fx * 4, -fy * 4, (VIEW_W + 1) * 4, (VIEW_H + 1) * 4);   // on agrandit x4, décalé de la partie fine du mouvement
  drawTitle();
}

// ---------- clavier ----------
addEventListener("keydown", (e) => {
  if (MOVES[e.code]) { e.preventDefault(); if (!keys.includes(e.code)) keys.push(e.code); }   // les flèches ne font pas défiler la page
  if (e.repeat) return;
  if (e.code === "KeyM") return Sound.toggle();
  if (["Enter", "Space"].includes(e.code) && !started) {
    e.preventDefault();
    started = true;
    Sound.init();                                                       // la musique démarre ici
    Sound.select();
  }
});
addEventListener("keyup", (e) => { const i = keys.indexOf(e.code); if (i >= 0) keys.splice(i, 1); });
addEventListener("blur", () => { keys.length = 0; });                  // si on quitte la fenêtre, le héros s'arrête

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
