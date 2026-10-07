// ===== ONYX VILLAGE - Épisode 5 : le labo OnyxBuild =====
// À l'ouest du village, le labo : un bâtiment moderne avec trois salles reliées par des portes
// (l'accueil et son professeur, la salle des PC, la salle des serveurs). Et on peut parler aux habitants.

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
const GRASS = 0, TALL = 1, PATH = 2, WATER = 3, TREE = 4, FLOWER = 5, BUSH = 6, ROCK = 7, SAND = 8, STONES = 9, HOUSE = 10, DOOR = 11, SIGN = 12, LDOOR = 13, LSIGN = 14;

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
  for (let y = 0; y < ROWS; y++) fill(river(y), y, river(y) + 1, y, WATER);              // la rivière
  fill(river(11) - 3, 11, river(11) - 1, 11, PATH); fill(river(11) + 2, 11, river(11) + 4, 11, PATH);
  map[11][river(11)] = STONES; map[11][river(11) + 1] = STONES;                          // un gué de pierres plates
  const house = [14, 14, 18, 17];                                                         // Épisode 4 : la place de la maison du dev (x1, y1, x2, y2)
  for (let y = 3; y < 21; y++) for (let x = 4; x < 28; x++) {
    if (map[y][x] !== GRASS) continue;
    const meadow = [[8, 12], [19, 7], [24, 11], [6, 18]].some(([mx, my]) => Math.hypot(x - mx, y - my) < 3.2);   // des prairies fleuries
    const f = meadow ? 0.5 : 0.05, roll = r();
    if (roll < f) map[y][x] = FLOWER;
    else if (roll < f + 0.06) map[y][x] = BUSH;
    else if (roll < f + 0.09) map[y][x] = TREE;
    else if (roll < f + 0.1) map[y][x] = ROCK;
  }
  fill(13, 14, 20, 19, GRASS);                                                            // on dégage le terrain...
  fill(...house, HOUSE); map[17][16] = DOOR;                                              // ...la maison et sa porte
  fill(19, 13, 19, 18, PATH); fill(15, 18, 19, 18, PATH);                                 // le sentier qui contourne la maison jusqu'à sa porte
  for (const x of [13, 15, 17, 18]) map[19][x] = FLOWER;                                  // le jardin devant
  map[18][14] = SIGN;                                                                     // le panneau "DEV" à côté de la porte
  map[17][12] = TREE;                                                                     // un arbre derrière lequel il fait bon lire
  fill(9, 8, 9, 9, GRASS);                                                                // Épisode 5 : on dégage la place du labo...
  fill(9, 4, 13, 7, HOUSE); map[7][11] = LDOOR;                                           // ...le labo et sa porte
  fill(11, 8, 13, 8, PATH);                                                               // le sentier qui rejoint celui du village
  map[8][10] = LSIGN;                                                                     // le panneau "LAB" à côté de la porte
})();

// ---------- une police minuscule (3 x 5 pixels) pour les panneaux et les écrans ----------
const FONT3 = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100",
  G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101", L: "100100100100111", M: "101111111101101",
  N: "111101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101", S: "011100010001110", T: "111010010010010",
  U: "101101101101111", V: "101101101101010", X: "101101010101101", Y: "101101010010010", " ": "000000000000000",
};
function pixelText(x, text, px, py, color) {
  [...text].forEach((ch, i) => [...FONT3[ch]].forEach((on, k) => on === "1" && rect(x, color, px + i * 4 + (k % 3), py + Math.floor(k / 3), 1, 1)));
}

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
  } else if (id === SIGN || id === LSIGN) {
    rect(x, "rgba(0,0,0,.2)", px + 3, py + 13, 10, 2); rect(x, "#7a4a22", px + 7, py + 9, 2, 6);            // l'ombre et le poteau
    rect(x, "#5a3414", px, py + 1, 16, 10); rect(x, "#d9a85c", px + 1, py + 2, 14, 8);                      // le panneau de bois
    pixelText(x, id === SIGN ? "DEV" : "LAB", px + 2, py + 3, "#5a3414");
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

// ---------- la maison du dev : toute simple dehors, 80 x 64 pixels ----------
const HOUSE_X = 14 * TILE, HOUSE_Y = 14 * TILE;

function drawHouse(x, hx, hy) {
  const roof = ["#2f3380", "#4348b0", "#6a70e0"];                                         // les bleus-violets d'OnyxBuild
  rect(x, "rgba(0,0,0,.22)", hx + 2, hy + 61, 80, 4);                                     // l'ombre portée
  rect(x, "#f4ecd8", hx, hy + 30, 80, 34); rect(x, "#e3d8bd", hx, hy + 30, 80, 3);       // les murs
  rect(x, "#8f8478", hx, hy + 58, 80, 6);                                                 // le soubassement en pierre
  rect(x, "#8a4a3a", hx + 58, hy - 8, 10, 18); rect(x, "#6a3a2a", hx + 57, hy - 9, 12, 3);   // la cheminée, derrière le toit
  for (let row = 0; row < 30; row++) {                                                    // le toit : un trapèze qui s'élargit vers le bas
    const inset = Math.round((29 - row) * 0.33);
    rect(x, row % 5 === 4 ? roof[0] : roof[1], hx - 2 + inset, hy + 2 + row, 84 - inset * 2, 1);
  }
  rect(x, roof[0], hx - 2, hy + 31, 84, 2);
  for (const wx of [10, 58]) { rect(x, "#ffffff", hx + wx, hy + 40, 13, 13); rect(x, "#8fd0f5", hx + wx + 2, hy + 42, 9, 9); rect(x, "#ffffff", hx + wx + 6, hy + 42, 1, 9); }   // deux fenêtres
  rect(x, "#5a3414", hx + 31, hy + 41, 18, 21); rect(x, "#9a5a2a", hx + 33, hy + 43, 14, 19); rect(x, "#ffd54a", hx + 43, hy + 53, 2, 2);   // la porte
  rect(x, "#bdb3a0", hx + 29, hy + 62, 22, 2);                                            // la marche
}

// ---------- le labo OnyxBuild : un bâtiment moderne, 80 x 64 pixels ----------
const LAB_X = 9 * TILE, LAB_Y = 4 * TILE;

function drawLab(x, hx, hy) {
  const navy = ["#161b45", "#232a6b", "#34408f"];
  rect(x, "rgba(0,0,0,.22)", hx + 2, hy + 61, 80, 4);                                     // l'ombre portée
  rect(x, "#e8ecf8", hx, hy + 22, 80, 42); rect(x, "#cfd6ee", hx, hy + 22, 80, 3);       // les murs blancs
  rect(x, "#8f98c0", hx, hy + 58, 80, 6);                                                 // le soubassement métallique
  rect(x, navy[1], hx - 2, hy + 6, 84, 17); rect(x, navy[2], hx - 2, hy + 6, 84, 2); rect(x, navy[0], hx - 2, hy + 20, 84, 3);   // le toit plat
  rect(x, "#00e5ff", hx - 2, hy + 23, 84, 1);                                             // un liseré néon
  rect(x, navy[1], hx + 14, hy - 2, 52, 9); rect(x, navy[2], hx + 14, hy - 2, 52, 2); rect(x, navy[0], hx + 14, hy + 5, 52, 2);   // le bloc technique du toit
  rect(x, "#aab4ec", hx + 70, hy - 8, 1, 14); rect(x, "#dfe6ff", hx + 66, hy - 10, 9, 1); rect(x, "#aab4ec", hx + 67, hy - 9, 7, 1); rect(x, "#00e5ff", hx + 70, hy - 13, 1, 3);   // la parabole
  disc(x, hx + 40, hy + 34, 8, navy[1]); disc(x, hx + 40, hy + 34, 6, "#f2f3f5"); disc(x, hx + 40, hy + 34, 3, navy[1]);   // le logo OnyxBuild
  for (const wx of [6, 58]) { rect(x, navy[1], hx + wx, hy + 36, 16, 14); rect(x, "#8fe9ff", hx + wx + 2, hy + 38, 12, 10); rect(x, "#d6f6ff", hx + wx + 2, hy + 38, 4, 10); }   // les baies vitrées
  rect(x, navy[1], hx + 30, hy + 44, 20, 18); rect(x, "#8fe9ff", hx + 32, hy + 46, 7, 16); rect(x, "#8fe9ff", hx + 41, hy + 46, 7, 16);   // la porte coulissante
  rect(x, "#d6f6ff", hx + 32, hy + 46, 2, 16); rect(x, "#d6f6ff", hx + 41, hy + 46, 2, 16); rect(x, "#aab0c8", hx + 28, hy + 62, 24, 2);
}

// ---------- l'intérieur de la maison : une pièce de 12 x 9 cases (192 x 144 pixels) ----------
// #  mur    B  lit    D  bureau    T  tour de PC    C  chaise    L  lampe    P  plante    r  tapis    m  paillasson    E  sortie    .  parquet
const ROOM = [
  "############",
  "############",
  "#BB...DDDDT#",
  "#BB....C...#",
  "#.........L#",
  "#...rrrr...#",
  "#...rrrr..P#",
  "#....m.....#",
  "#####E######",
];
const ROOM_SOLID = new Set("#BDTCLP");


function drawRoom(x) {
  rect(x, "#3b3c78", 0, 0, 192, 144);                                                     // le mur du fond : papier peint rayé et plinthe en bois
  for (let i = 0; i < 192; i += 8) rect(x, "#35366e", i, 0, 4, 26);
  rect(x, "#2a2b5a", 0, 26, 192, 3); rect(x, "#8a5a2a", 0, 29, 192, 3);
  for (let y = 32; y < 128; y += 8) {                                                     // le parquet : des lames de 8 pixels
    rect(x, y % 16 ? "#c98f58" : "#bd8250", 16, y, 160, 8); rect(x, "#a06a3c", 16, y + 7, 160, 1);
    for (let jx = 16 + ((y >> 3) * 37) % 32; jx < 176; jx += 32) rect(x, "#a06a3c", jx, y, 1, 7);
  }
  for (const [wx, wy, w, h] of [[0, 32, 16, 112], [176, 32, 16, 112], [0, 128, 192, 16]]) rect(x, "#2a2b5a", wx, wy, w, h);   // les murs des côtés
  rect(x, "rgba(0,0,0,.18)", 16, 32, 160, 4); rect(x, "rgba(0,0,0,.14)", 16, 32, 3, 96); rect(x, "rgba(0,0,0,.14)", 173, 32, 3, 96);
  rect(x, "#5a3414", 78, 126, 20, 18); rect(x, "#9a5a2a", 80, 128, 16, 16); rect(x, "#7a4a22", 88, 128, 1, 16); rect(x, "#ffd54a", 92, 136, 2, 2);   // la porte de sortie
  rect(x, "#c0392b", 82, 116, 12, 8); rect(x, "#e8604f", 83, 117, 10, 2);                // le paillasson

  rect(x, "#2f3380", 64, 64, 64, 48); rect(x, "#4348b0", 66, 66, 60, 44); rect(x, "#6a70e0", 68, 68, 56, 40); rect(x, "#4348b0", 70, 70, 52, 36);   // le tapis indigo
  disc(x, 96, 88, 14, "#6a70e0"); disc(x, 96, 88, 11, "#4348b0"); disc(x, 96, 88, 7, "#f2f3f5"); disc(x, 96, 88, 4, "#4348b0");                     // et le logo OnyxBuild
  for (let i = 66; i < 126; i += 4) { rect(x, "#e3d8bd", i, 62, 1, 2); rect(x, "#e3d8bd", i, 112, 1, 2); }

  rect(x, "#ffffff", 20, 3, 24, 22); rect(x, "#14183f", 22, 5, 20, 18); rect(x, "#1c2260", 22, 14, 20, 9);   // la fenêtre donne sur la nuit
  for (const [sx, sy] of [[25, 8], [30, 12], [39, 16], [27, 18], [34, 20]]) rect(x, "#ffffff", sx, sy, 1, 1);
  disc(x, 36, 10, 4, "#f6f0d0"); disc(x, 38, 9, 4, "#14183f");                            // un croissant de lune
  rect(x, "#ffffff", 32, 5, 1, 18); rect(x, "#ffffff", 22, 14, 20, 1); rect(x, "#d6cdb0", 18, 25, 28, 2);
  rect(x, "#3a3f9c", 17, 2, 5, 24); rect(x, "#4348b0", 17, 2, 2, 24); rect(x, "#3a3f9c", 42, 2, 5, 24); rect(x, "#4348b0", 42, 2, 2, 24);   // les rideaux

  rect(x, "#f4ecd8", 50, 6, 12, 16); rect(x, "#14183f", 51, 7, 10, 14);                  // le poster OnyxBuild
  disc(x, 56, 12, 4, "#6a70e0"); disc(x, 56, 12, 2, "#14183f"); rect(x, "#6a70e0", 52, 18, 8, 1); rect(x, "#6a70e0", 54, 19, 4, 1);

  rect(x, "#5a3414", 66, 2, 28, 27); rect(x, "#3a2210", 68, 4, 24, 23);                  // la bibliothèque
  for (const [sy, h] of [[4, 7], [13, 7], [22, 5]]) {
    rect(x, "#7a4a22", 66, sy + h, 28, 2);
    for (let bx = 68, i = 0; bx < 91; i++) {
      const w = 2 + (i + sy) % 2, bh = h - (i % 3 === 0 ? 1 : 0);
      rect(x, ["#e8445a", "#ffd54a", "#00e5ff", "#8a5cff", "#59cf62", "#ffffff", "#ff8a3d"][(i * 3 + sy) % 7], bx, sy + h - bh, w, bh);
      bx += w;
    }
  }
  rect(x, "#ffd54a", 84, 4, 6, 3); rect(x, "#ffd54a", 86, 7, 2, 2); rect(x, "#b8860b", 84, 9, 6, 2);   // un trophée

  rect(x, "rgba(0,0,0,.25)", 18, 62, 30, 3);                                             // le lit : cadre, oreillers et couverture indigo
  rect(x, "#7a4a22", 16, 32, 32, 32); rect(x, "#5a3414", 16, 32, 32, 5); rect(x, "#5a3414", 16, 60, 32, 4);
  rect(x, "#e8ecf8", 18, 37, 28, 23); rect(x, "#4348b0", 18, 46, 28, 14); rect(x, "#6a70e0", 18, 46, 28, 2);
  for (let i = 52; i < 60; i += 4) rect(x, "#3a3f9c", 18, i, 28, 1);
  for (const px of [20, 33]) { rect(x, "#ffffff", px, 38, 11, 7); rect(x, "#d6dcf0", px, 43, 11, 2); }

  rect(x, "rgba(0,0,0,.22)", 98, 47, 62, 4);                                             // le bureau et son plateau en bois clair
  rect(x, "#8a5a2a", 96, 40, 64, 8); rect(x, "#6a3a1a", 100, 42, 14, 5); rect(x, "#6a3a1a", 143, 42, 14, 5);
  rect(x, "#c08a4a", 96, 32, 64, 8); rect(x, "#d9a86a", 96, 32, 64, 2);
  rect(x, "#ffd54a", 103, 11, 4, 4); rect(x, "#ff7ab6", 103, 16, 4, 4);                  // des post-it sur le mur
  rect(x, "#2a2a3a", 123, 29, 6, 4); rect(x, "#2a2a3a", 118, 32, 16, 2); rect(x, "#15161f", 108, 9, 36, 21);   // l'écran de l'ordinateur (son contenu bouge)
  rect(x, "#dfe3f0", 114, 34, 24, 4); for (let i = 0; i < 7; i++) { rect(x, "#aab0c8", 115 + i * 3, 35, 2, 1); rect(x, "#aab0c8", 116 + i * 3, 37, 2, 1); }   // le clavier
  rect(x, "#dfe3f0", 142, 35, 4, 5); rect(x, "#aab0c8", 143, 35, 2, 1);                  // la souris
  rect(x, "#f2f3f5", 99, 29, 7, 7); rect(x, "#6b3f1d", 100, 30, 5, 2); rect(x, "#f2f3f5", 106, 31, 2, 3); rect(x, "#00e5ff", 101, 33, 3, 1);   // la tasse de café
  rect(x, "#00e5ff", 150, 31, 3, 5); rect(x, "#00e5ff", 155, 31, 3, 5); rect(x, "#aab0c8", 151, 29, 6, 2);   // le casque posé sur le bureau

  rect(x, "rgba(0,0,0,.25)", 161, 47, 15, 3);                                            // la tour du PC : fenêtre, ventilateur et grilles
  rect(x, "#1f2133", 161, 20, 14, 28); rect(x, "#2f3248", 161, 20, 2, 28); rect(x, "#14151f", 163, 24, 10, 14); disc(x, 168, 31, 4, "#2a2c44");
  for (const gy of [41, 43, 45]) rect(x, "#2f3248", 164, gy, 8, 1);

  rect(x, "rgba(0,0,0,.25)", 113, 60, 14, 3);                                            // la chaise de bureau
  rect(x, "#1a1a28", 119, 58, 2, 3); rect(x, "#1a1a28", 113, 61, 14, 2); rect(x, "#3a3f9c", 114, 44, 12, 9); rect(x, "#4348b0", 114, 44, 12, 2); rect(x, "#4348b0", 113, 52, 14, 6);

  rect(x, "rgba(0,0,0,.25)", 162, 76, 12, 3);                                            // la lampe qui éclaire la pièce
  rect(x, "#2a2a3a", 164, 75, 8, 3); rect(x, "#3a3a4a", 167, 55, 2, 21); rect(x, "#ffd98a", 161, 47, 14, 9); rect(x, "#fff3d0", 163, 48, 10, 3);
  x.globalAlpha = 0.12; disc(x, 166, 64, 11, "#ffd98a"); x.globalAlpha = 1;

  rect(x, "rgba(0,0,0,.25)", 162, 109, 12, 3); rect(x, "#8a3f1d", 163, 101, 10, 2); rect(x, "#b0562d", 164, 102, 8, 8);   // la plante
  for (const [lx, ly, rr] of [[168, 94, 4], [163, 98, 3], [173, 98, 3], [168, 99, 3]]) { disc(x, lx, ly, rr, "#2e8b3a"); disc(x, lx - 1, ly - 1, rr - 1, "#59cf62"); }
}

// ce qui bouge dans la pièce : le code à l'écran, la vapeur du café, la tour du PC et les guirlandes
function drawRoomLive(ox, oy) {
  const o = (rx, ry, w, h, c) => rect(vctx, c, ox + rx, oy + ry, w, h);
  o(110, 11, 32, 16, "#14183f");
  const scroll = time >> 4;
  for (let i = 0; i < 7; i++) {
    const rnd = random((scroll + i) * 17 + 3), indent = [0, 3, 3, 6, 0][Math.floor(rnd() * 5)], len = 4 + Math.floor(rnd() * 16);
    o(112 + indent, 12 + i * 2, len, 1, ["#00e5ff", "#ff7ab6", "#ffd54a", "#9cf08a", "#c4b5fd"][Math.floor(rnd() * 5)]);
    if (i === 6 && time % 40 < 20) o(112 + indent + len + 1, 12 + i * 2, 2, 1, "#ffffff");   // le curseur clignote
  }
  for (let k = 0; k < 2; k++) o(102 + Math.round(Math.sin(time / 10 + k * 3)), 28 - (((time >> 1) + k * 8) % 14), 1, 2, "#e8e8f0");   // la vapeur
  const led = ["#00e5ff", "#8a5cff", "#ff7ab6"][(time >> 5) % 3];
  o(162, 22, 1, 24, led); o(166, 31, 5, 1, led); o(168, 29, 1, 5, led);
  for (let wx = 20; wx < 172; wx++) {                                                     // les guirlandes au-dessus des fenêtres
    const wy = 1 + Math.round(1.5 * Math.sin(wx / 10));
    o(wx, wy, 1, 1, "#1a1b3a");
    if (wx % 10 === 0) o(wx, wy + 1, 2, 2, ((time >> 4) + wx / 10) % 7 ? ["#ffd54a", "#ff7ab6", "#00e5ff", "#9cf08a"][(wx / 10) % 4] : "#4a4c92");
  }
}

// ---------- le labo à l'intérieur : trois salles de 14 x 9 cases (224 x 144 pixels) ----------
// #  mur    P  plante    H  table à hologramme    S  canapé    D  bureau    C  chaise    T  table    K  baie de serveurs    M  console    O  noyau IA
// E  sortie    a b h  portes entre les salles    .  sol
const HALL = [
  "##############",
  "##############",
  "#P..........P#",
  "#............#",
  "#.....HH.....#",
  "a.....HH.....b",
  "#............#",
  "#..SS....SS..#",
  "######E#######",
];
const PCROOM = [
  "##############",
  "##############",
  "#DD.DD.DD.DD.#",
  "#CC.CC.CC.CC.#",
  "#............h",
  "#...TTTTTT...#",
  "#............#",
  "#P..........P#",
  "##############",
];
const SERVERS = [
  "##############",
  "##############",
  "#KKK..MM..KKK#",
  "#............#",
  "#.....OO.....#",
  "h.....OO.....#",
  "#............#",
  "#............#",
  "##############",
];

// le décor commun aux salles : mur bleu nuit avec un néon, plinthe, sol en carreaux
function labShell(x, floorA, floorB, wall) {
  rect(x, wall, 0, 0, 224, 144);
  for (let i = 0; i < 224; i += 16) rect(x, "rgba(255,255,255,.05)", i, 0, 1, 26);
  rect(x, "#00e5ff", 0, 22, 224, 1); rect(x, "rgba(0,229,255,.22)", 0, 23, 224, 4);
  rect(x, "#8f98c0", 0, 28, 224, 4);
  for (let ty = 2; ty < 8; ty++) for (let tx = 1; tx < 13; tx++) {
    rect(x, (tx + ty) % 2 ? floorA : floorB, tx * 16, ty * 16, 16, 16);
    rect(x, "rgba(0,0,0,.12)", tx * 16, ty * 16 + 15, 16, 1); rect(x, "rgba(0,0,0,.12)", tx * 16 + 15, ty * 16, 1, 16);
  }
  for (const [wx, wy, w, h] of [[0, 32, 16, 112], [208, 32, 16, 112], [0, 128, 224, 16]]) rect(x, wall, wx, wy, w, h);
  rect(x, "rgba(0,0,0,.2)", 16, 32, 192, 4); rect(x, "rgba(0,0,0,.16)", 16, 32, 3, 96); rect(x, "rgba(0,0,0,.16)", 205, 32, 3, 96);
}

function labDoor(x, tx, ty, side) {                                                        // une porte vitrée dans le mur de gauche ou de droite
  const px = tx * 16, py = ty * 16;
  rect(x, "#0b0c1c", px, py - 2, 16, 20); rect(x, "#00e5ff", px, py - 2, 16, 1); rect(x, "#00e5ff", px, py + 17, 16, 1);
  rect(x, "#8fe9ff", px + (side === "left" ? 0 : 8), py, 8, 16); rect(x, "#d6f6ff", px + (side === "left" ? 0 : 8), py, 2, 16);
}

function plantAt(x, px, py) {                                                              // une plante en pot sur la case (px, py)
  rect(x, "rgba(0,0,0,.25)", px + 2, py + 13, 12, 3); rect(x, "#8a3f1d", px + 3, py + 5, 10, 2); rect(x, "#b0562d", px + 4, py + 6, 8, 8);
  for (const [lx, ly, rr] of [[8, -2, 4], [3, 2, 3], [13, 2, 3], [8, 3, 3]]) { disc(x, px + lx, py + ly, rr, "#2e8b3a"); disc(x, px + lx - 1, py + ly - 1, rr - 1, "#59cf62"); }
}

function drawHall(x) {                                                                     // la salle d'accueil
  labShell(x, "#dfe4f4", "#d0d7ee", "#1b2250");
  labDoor(x, 0, 5, "left"); labDoor(x, 13, 5, "right");
  rect(x, "#232a6b", 94, 126, 20, 18); rect(x, "#8fe9ff", 96, 128, 7, 16); rect(x, "#8fe9ff", 105, 128, 7, 16); rect(x, "#d6f6ff", 96, 128, 2, 16); rect(x, "#d6f6ff", 105, 128, 2, 16);   // la sortie
  rect(x, "#c0392b", 98, 116, 12, 8); rect(x, "#e8604f", 99, 117, 10, 2);
  rect(x, "#0b0c1c", 62, 3, 100, 21); rect(x, "#14183f", 64, 5, 96, 17);                  // le grand écran du mur : logo et nom du labo
  disc(x, 76, 13, 6, "#6a70e0"); disc(x, 76, 13, 4, "#f2f3f5"); disc(x, 76, 13, 2, "#14183f");
  pixelText(x, "ONYXBUILD", 88, 8, "#f2f3f5"); pixelText(x, "LABORATOIRE", 88, 15, "#00e5ff");
  plantAt(x, 16, 32); plantAt(x, 192, 32);
  rect(x, "rgba(0,0,0,.25)", 98, 92, 30, 4);                                              // la table à hologramme
  rect(x, "#2f3a7a", 98, 78, 28, 16); rect(x, "#232a6b", 98, 88, 28, 6); rect(x, "#34408f", 96, 74, 32, 6); rect(x, "#00e5ff", 98, 74, 28, 1);
  for (const sx of [48, 144]) {                                                           // les deux canapés
    rect(x, "rgba(0,0,0,.2)", sx + 2, 126, 30, 3); rect(x, "#34408f", sx, 116, 32, 12); rect(x, "#4348b0", sx + 2, 111, 28, 8); rect(x, "#6a70e0", sx + 2, 111, 28, 2);
    rect(x, "#ffd54a", sx + 4, 113, 6, 6); rect(x, "#ff7ab6", sx + 22, 113, 6, 6);
  }
}

function drawPcRoom(x) {                                                                   // la salle des PC : quatre postes de travail et une table de réunion
  labShell(x, "#dfe4f4", "#d0d7ee", "#1b2250");
  labDoor(x, 13, 4, "right");
  for (let i = 0; i < 4; i++) {
    const dx = 16 + i * 48, [chair, chairLight] = [["#4348b0", "#6a70e0"], ["#12a4b8", "#4fd6e8"], ["#8a5cff", "#b79cff"], ["#c93a52", "#ff7a8e"]][i];
    rect(x, "rgba(0,0,0,.2)", dx + 2, 47, 30, 3); rect(x, "#cfd6ee", dx, 40, 32, 8); rect(x, "#f2f4fb", dx, 32, 32, 8); rect(x, "#ffffff", dx, 32, 32, 1);   // le bureau blanc
    rect(x, "#14151f", dx + 3, 11, 26, 18); rect(x, "#2a2a3a", dx + 14, 29, 4, 3); rect(x, "#2a2a3a", dx + 10, 31, 12, 2);                              // l'écran (son contenu bouge)
    rect(x, "#dfe3f0", dx + 7, 34, 14, 3); rect(x, "#aab0c8", dx + 8, 35, 12, 1); rect(x, "#dfe3f0", dx + 24, 34, 3, 4);                                // clavier et souris
    rect(x, "rgba(0,0,0,.2)", dx + 5, 60, 22, 3); rect(x, "#1a1a28", dx + 15, 57, 2, 4); rect(x, "#1a1a28", dx + 9, 60, 14, 2);                         // la chaise
    rect(x, chair, dx + 8, 50, 16, 8); rect(x, chair, dx + 9, 42, 14, 9); rect(x, chairLight, dx + 9, 42, 14, 2);
  }
  for (const px of [51, 99, 147]) { rect(x, "#f4ecd8", px, 5, 10, 16); rect(x, "#14183f", px + 1, 6, 8, 14); }   // des posters entre les écrans
  disc(x, 56, 12, 3, "#6a70e0"); disc(x, 56, 12, 1, "#14183f"); rect(x, "#59cf62", 103, 12, 2, 6); disc(x, 104, 11, 3, "#59cf62"); pixelText(x, "OB", 150, 11, "#00e5ff");
  disc(x, 200, 14, 8, "#8f98c0"); disc(x, 200, 14, 7, "#f2f3f5");                          // l'horloge
  rect(x, "rgba(0,0,0,.2)", 66, 94, 94, 4); rect(x, "#8f98c0", 66, 90, 92, 5); rect(x, "#f2f4fb", 64, 80, 96, 11); rect(x, "#ffffff", 64, 80, 96, 1);   // la table de réunion
  for (const lx of [72, 104, 136]) { rect(x, "#aab4ec", lx, 74, 16, 10); rect(x, "#8f98c0", lx, 82, 16, 2); disc(x, lx + 8, 78, 2, "#f2f3f5"); }   // trois portables vus de dos
  rect(x, "#f2f3f5", 124, 82, 5, 5); rect(x, "#6b3f1d", 125, 83, 3, 1); rect(x, "#f2f3f5", 92, 83, 5, 5); rect(x, "#6b3f1d", 93, 84, 3, 1);        // des tasses de café
  plantAt(x, 16, 112); plantAt(x, 192, 112);                                              // et deux plantes
}

function drawServers(x) {                                                                  // la salle des serveurs : des baies, une console et le noyau IA
  labShell(x, "#3a4170", "#343a66", "#14183f");
  labDoor(x, 0, 5, "left");
  for (const tx of [1, 2, 3, 10, 11, 12]) {
    const px = tx * 16;
    rect(x, "rgba(0,0,0,.25)", px + 1, 46, 15, 4); rect(x, "#0e0f1a", px, 6, 16, 42); rect(x, "#1c1e30", px + 1, 7, 14, 40);
    for (let u = 0; u < 7; u++) { rect(x, "#2a2d48", px + 2, 9 + u * 5, 12, 4); rect(x, "#14151f", px + 2, 12 + u * 5, 12, 1); rect(x, "#3a3f6a", px + 4, 10 + u * 5, 5, 1); }
  }
  rect(x, "rgba(0,229,255,.3)", 24, 52, 1, 24); rect(x, "rgba(0,229,255,.3)", 24, 76, 70, 1); rect(x, "rgba(0,229,255,.3)", 200, 52, 1, 24); rect(x, "rgba(0,229,255,.3)", 130, 76, 70, 1);   // les câbles au sol
  rect(x, "#0b0c1c", 78, 3, 68, 17); rect(x, "#14183f", 80, 5, 64, 13); pixelText(x, "SERVICES OK", 90, 9, "#59cf62");                           // l'écran d'état
  rect(x, "rgba(0,0,0,.2)", 98, 47, 30, 3); rect(x, "#cfd6ee", 96, 40, 32, 8); rect(x, "#f2f4fb", 96, 32, 32, 8);                                   // la console
  rect(x, "#14151f", 99, 20, 12, 12); rect(x, "#14151f", 113, 20, 12, 12); rect(x, "#2a2a3a", 105, 32, 2, 2); rect(x, "#2a2a3a", 119, 32, 2, 2);
  rect(x, "rgba(0,0,0,.25)", 98, 92, 30, 4);                                              // le noyau IA : un cylindre de verre sur son socle
  rect(x, "#2f3a7a", 98, 86, 28, 8); rect(x, "#34408f", 100, 84, 24, 4); rect(x, "#00e5ff", 100, 84, 24, 1);
  rect(x, "rgba(143,233,255,.22)", 102, 54, 20, 30); rect(x, "rgba(214,246,255,.4)", 102, 54, 3, 30); rect(x, "#aab4ec", 100, 52, 24, 3);
}

// ce qui bouge dans l'accueil : le logo en hologramme au-dessus de la table
function drawHallLive(ox, oy) {
  const turn = Math.abs(Math.cos(time / 25)), cx = ox + 112, cy = oy + 58;
  vctx.globalAlpha = 0.13;
  for (let yy = 0; yy < 16; yy++) rect(vctx, "#00e5ff", cx - 3 - yy, cy + yy, 7 + yy * 2, 1);   // le faisceau
  vctx.globalAlpha = 1;
  for (let a = 0; a < 36; a++) {                                                          // l'anneau tourne comme une pièce de monnaie
    const t = (a / 36) * Math.PI * 2;
    rect(vctx, a % 2 ? "#00e5ff" : "#8fe9ff", Math.round(cx + Math.cos(t) * 9 * turn), Math.round(cy + Math.sin(t) * 9), 1, 1);
  }
  rect(vctx, "#ffffff", cx, cy - 1, 1, 3);
  for (let k = 0; k < 3; k++) rect(vctx, "#8fe9ff", cx - 8 + ((time + k * 23) % 17), cy + 12 - ((time * 0.5 + k * 9) % 14), 1, 1);   // des étincelles
}

// ce qui bouge dans la salle des PC : le contenu des quatre écrans
function drawPcLive(ox, oy) {
  const o = (rx, ry, w, h, c) => rect(vctx, c, ox + rx, oy + ry, w, h);
  for (let i = 0; i < 4; i++) {
    const sx = 16 + i * 48 + 5, sy = 13, rnd = random((time >> 4) * 7 + i);
    o(sx, sy, 22, 14, ["#14183f", "#f4f6ff", "#08140c", "#1b1f3f"][i]);
    if (i === 0) for (let k = 0; k < 6; k++) o(sx + 1 + (rnd() < 0.4 ? 2 : 0), sy + 1 + k * 2, 3 + Math.floor(rnd() * 14), 1, ["#00e5ff", "#ff7ab6", "#ffd54a", "#9cf08a"][Math.floor(rnd() * 4)]);   // du code
    if (i === 1) { o(sx + 1, sy + 1, 20, 2, "#4348b0"); o(sx + 2, sy + 4, 8, 7, "#ff7ab6"); o(sx + 11, sy + 4, 9, 3, "#00e5ff"); o(sx + 11, sy + 8, 9, 3, "#ffd54a"); if (time % 50 < 25) o(sx + 4, sy + 7, 1, 3, "#14183f"); }   // une maquette de site
    if (i === 2) { for (let k = 0; k < 5; k++) o(sx + 1, sy + 1 + k * 2, 2 + Math.floor(rnd() * 12), 1, "#59cf62"); if (time % 40 < 20) o(sx + 1, sy + 11, 3, 1, "#d6ffd9"); }   // un terminal
    if (i === 3) for (let k = 0; k < 6; k++) { const h = 2 + (((time >> 3) + k * 3) % 9); o(sx + 2 + k * 3, sy + 13 - h, 2, h, k % 2 ? "#00e5ff" : "#8a5cff"); }   // un tableau de bord
  }
  const t = time / 60;
  o(200, 14, Math.round(Math.cos(t * 6) * 5) || 1, 1, "#14183f"); o(200, 14 + Math.round(Math.sin(t * 6) * 5), 1, 1, "#e8445a");   // l'aiguille de l'horloge
}

// ce qui bouge dans la salle des serveurs : les voyants, le noyau IA et les graphiques
function drawServersLive(ox, oy) {
  const o = (rx, ry, w, h, c) => rect(vctx, c, ox + rx, oy + ry, w, h);
  [1, 2, 3, 10, 11, 12].forEach((tx, r) => { for (let u = 0; u < 7; u++) o(tx * 16 + 11, 10 + u * 5, 2, 1, ((time >> 3) + u * 3 + r * 5) % 5 ? "#59cf62" : ((time >> 3) % 2 ? "#ffd54a" : "#e8445a")); });
  const pulse = 4 + Math.round(Math.sin(time / 12) * 1.5), hue = ["#8a5cff", "#00e5ff", "#ff7ab6"][(time >> 6) % 3];
  vctx.globalAlpha = 0.25; disc(vctx, ox + 112, oy + 70, pulse + 5, hue); vctx.globalAlpha = 1;                    // le halo du noyau
  disc(vctx, ox + 112, oy + 70, pulse, hue); disc(vctx, ox + 111, oy + 69, Math.max(1, pulse - 2), "#f2f3f5");
  for (let k = 0; k < 4; k++) o(110 + ((k * 7 + (time >> 2)) % 5), 56 + ((time + k * 9) % 26), 1, 1, "#d6f6ff");   // des bulles dans le tube
  for (let k = 0; k < 6; k++) { o(101 + k * 2, 30 - (2 + (((time >> 3) + k * 2) % 8)), 1, 2 + (((time >> 3) + k * 2) % 8), "#00e5ff"); o(115 + k * 2, 30 - (2 + (((time >> 3) + k * 5) % 8)), 1, 2 + (((time >> 3) + k * 5) % 8), "#ff7ab6"); }   // les graphiques de la console
}

// ---------- les lieux où l'on peut entrer ----------
// plan : le dessin en lettres  ·  solid : les lettres infranchissables  ·  links : les portes vers d'autres salles  ·  out : la case devant la porte, dehors
const placeImage = (w, h, draw) => { const [c, x] = canvas(w, h); draw(x); return c; };
const PROF = { hair: "#e8e8f0", skin: "#f0c090", shirt: "#f4f4f8", light: "#8fd0f5", pants: "#3a3f6a", shoe: "#222222", glasses: "#2a2a3a" };
const DEV = { hair: "#7a3b1d", skin: "#e8b08a", shirt: "#8a5cff", light: "#c4b5fd", pants: "#2f3f5f", shoe: "#222222", phones: "#f2f3f5" };
const PLACES = {
  home: { plan: ROOM, solid: new Set("#BDTCLP"), img: placeImage(192, 144, drawRoom), live: drawRoomLive, links: {}, npcs: [], start: [5, 7], out: [16, 18] },
  hall: { title: "LABO ONYXBUILD", plan: HALL, solid: new Set("#PHS"), img: placeImage(224, 144, drawHall), live: drawHallLive, start: [6, 7], out: [11, 8],
    links: { a: { to: "pc", at: [12, 4], dir: "left" }, b: { to: "servers", at: [1, 5], dir: "right" } },
    npcs: [{ x: 4 * TILE, y: 4 * TILE - 2, dir: "right", p: PROF, name: "PROF", lines: ["Bienvenue au labo OnyxBuild !", "Ici, on crée des sites web, des automatisations et des agents IA.", "La salle des PC est à gauche. Les serveurs sont à droite !"] }] },
  pc: { title: "SALLE DES PC", plan: PCROOM, solid: new Set("#DCTP"), img: placeImage(224, 144, drawPcRoom), live: drawPcLive,
    links: { h: { to: "hall", at: [1, 5], dir: "right" } },
    npcs: [{ x: 4.5 * TILE, y: 3 * TILE - 8, dir: "up", p: DEV, name: "DEV", lines: ["Chut... je lance un déploiement.", "Un site de plus en ligne en trois minutes. Un café ?"] }] },
  servers: { title: "SALLE SERVEURS", plan: SERVERS, solid: new Set("#KMO"), img: placeImage(224, 144, drawServers), live: drawServersLive,
    links: { h: { to: "hall", at: [12, 5], dir: "left" } },
    npcs: [{ x: 9 * TILE, y: 4 * TILE - 2, dir: "left", kind: "robot", name: "NOVA", lines: ["BIP BOUP ! Je suis NOVA, l'agent IA du labo.", "Je réponds aux clients pendant que l'équipe dort."] }] },
};
for (const p of Object.values(PLACES)) { p.ox = Math.floor((VIEW_W - p.plan[0].length * TILE) / 2); p.oy = Math.floor((VIEW_H - p.plan.length * TILE) / 2); }   // chaque pièce est centrée à l'écran

function drawRobot(x, px, py) {                                                            // NOVA, l'agent IA : un petit robot qui flotte
  const bob = Math.round(Math.sin(time / 15)), blink = time % 120 < 6;
  rect(x, "rgba(0,0,0,.28)", px + 3, py + 14, 10, 2);
  rect(x, "#232a6b", px + 4, py + 12, 8, 2); rect(x, "#6a70e0", px + 5, py + 13, 6, 1);
  rect(x, "#aab4ec", px + 2, py + 7 + bob, 2, 4); rect(x, "#aab4ec", px + 12, py + 7 + bob, 2, 4);
  rect(x, "#cfd6ee", px + 4, py + 7 + bob, 8, 6); rect(x, "#aab4ec", px + 4, py + 11 + bob, 8, 2); rect(x, "#00e5ff", px + 7, py + 9 + bob, 2, 2);
  rect(x, "#cfd6ee", px + 3, py + 1 + bob, 10, 7); rect(x, "#14183f", px + 4, py + 3 + bob, 8, 4);
  if (blink) { rect(x, "#00e5ff", px + 5, py + 5 + bob, 2, 1); rect(x, "#00e5ff", px + 9, py + 5 + bob, 2, 1); }
  else { rect(x, "#00e5ff", px + 5, py + 4 + bob, 2, 2); rect(x, "#00e5ff", px + 9, py + 4 + bob, 2, 2); }
  rect(x, "#aab4ec", px + 8, py - 1 + bob, 1, 2); rect(x, "#ff7ab6", px + 7, py - 2 + bob, 3, 2);
}

function drawRoomScene() {
  const p = place;
  rect(vctx, "#0a0820", 0, 0, VIEW_W + 1, VIEW_H + 1);
  vctx.drawImage(p.img, p.ox, p.oy);
  p.live(p.ox, p.oy);
  for (const o of [hero, ...p.npcs].sort((a, b) => a.y - b.y)) {                          // celui qui est le plus bas passe devant
    if (o.kind === "robot") drawRobot(vctx, p.ox + o.x, p.oy + o.y);
    else drawPerson(vctx, p.ox + o.x, p.oy + o.y, o.dir, o === hero && hero.moving ? [1, 0, 2, 0][Math.floor(hero.walk) % 4] : 0, o.p);
  }
}

// ---------- on dessine tout le décor une seule fois ----------
const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
const [world, wctx] = canvas(WORLD_W, WORLD_H);
for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(wctx, map[ty][tx], tx, ty);
drawHouse(wctx, HOUSE_X, HOUSE_Y);
drawLab(wctx, LAB_X, LAB_Y);

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
    if (p.glasses) { rect(x, p.glasses, X(9, 3), by + 4, 3, 1); rect(x, p.glasses, X(9, 3), by + 6, 3, 1); rect(x, p.glasses, X(11), by + 5, 1, 1); }
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
    if (p.glasses) for (const gx of [5, 8]) { rect(x, p.glasses, px + gx, by + 4, 3, 1); rect(x, p.glasses, px + gx, by + 6, 3, 1); rect(x, p.glasses, px + gx, by + 5, 1, 1); rect(x, p.glasses, px + gx + 2, by + 5, 1, 1); }   // les lunettes
  } else {                                                                      // de dos : les cheveux couvrent toute la tête
    rect(x, p.hair, px + 4, by + 1, 8, 6);
    rect(x, p.light, px + 6, by + 7, 4, 1);                                     // le bord de la capuche
  }
  if (p.spiky) rect(x, p.hair, px + 5, by, 6, 1);                               // les pointes
  if (p.phones) { rect(x, p.phones, px + 2, by + 3, 2, 4); rect(x, p.phones, px + 12, by + 3, 2, 4); rect(x, p.phones, px + 3, by + 1, 10, 1); }   // le casque
}

// ---------- se déplacer ----------
const DOORS = { [DOOR]: "home", [LDOOR]: "hall" };                                              // quelle pièce s'ouvre derrière chaque porte
const SOLID = new Set([TREE, WATER, BUSH, ROCK, HOUSE, DOOR, SIGN, LDOOR, LSIGN]);                              // on ne passe pas à travers
const MOVES = { ArrowUp: [0, -1, "up"], KeyW: [0, -1, "up"], ArrowDown: [0, 1, "down"], KeyS: [0, 1, "down"],
                ArrowLeft: [-1, 0, "left"], KeyA: [-1, 0, "left"], ArrowRight: [1, 0, "right"], KeyD: [1, 0, "right"] };   // KeyW/A/S/D = ZQSD sur un clavier français
const keys = [];                                                                // les touches enfoncées : la dernière pressée décide
const hero = { x: 13 * TILE, y: 11 * TILE - 2, dir: "down", walk: 0, moving: false };

const people = [hero];                                                          // le héros et les villageois : personne ne traverse personne
let place = null;                                                               // où est le héros : null = dehors, sinon une pièce de PLACES
const crowd = () => (place ? [hero, ...place.npcs] : people);

// une case est-elle solide ? Dehors : la carte du village. Dedans : le plan de la pièce.
function solidAt(tx, ty) {
  if (place) { const c = place.plan[ty]?.[tx]; return c === undefined || place.solid.has(c); }
  const id = map[ty]?.[tx];
  return id === undefined || SOLID.has(id);
}

// les pieds de who (8 x 6 pixels) ne doivent toucher ni case solide, ni autre personnage
function blocked(who, x, y) {
  if (crowd().some((o) => o !== who && Math.abs(o.x - x) < 10 && Math.abs(o.y - y) < 7)) return true;
  return [[4, 10], [11, 10], [4, 15], [11, 15]].some(([fx, fy]) => solidAt(Math.floor((x + fx) / TILE), Math.floor((y + fy) / TILE)));
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
  if (talk.open) { hero.moving = false; return; }                               // pendant une conversation, on ne bouge pas
  const [dx, dy, dir] = MOVES[keys[keys.length - 1]] || [];
  hero.moving = false;
  if (!dir) return;
  hero.dir = dir;
  if (step(hero, dx, dy)) { hero.moving = true; hero.walk += 0.12; }            // walk fait alterner les jambes
  else if (dir === "up" && !place) {                                            // contre une porte : on entre
    const door = DOORS[map[Math.floor((hero.y + 9) / TILE)]?.[Math.floor((hero.x + 8) / TILE)]];
    if (door) goTo(door);
  }
}

// ---------- entrer et sortir : un fondu au noir, puis on change de décor ----------
const fade = { a: 0, dir: 0, then: null };
const banner = { t: 999, text: "" };
const showBanner = (text) => { banner.text = text; banner.t = 0; };

function goTo(name, at, dir) {                                                  // name : une pièce de PLACES, ou null pour ressortir
  fade.dir = 1;
  fade.then = () => {
    const from = place;
    place = name ? PLACES[name] : null;
    if (place) {
      const [tx, ty] = at || place.start;                                       // on arrive sur le paillasson, ou à côté de la porte qu'on vient de passer
      Object.assign(hero, { x: tx * TILE, y: ty * TILE - 2, dir: dir || "up" });
      if (place.title) showBanner(place.title);
    } else {
      const [tx, ty] = from.out;                                                // on ressort devant la porte
      Object.assign(hero, { x: tx * TILE, y: ty * TILE - 2, dir: "down" });
      cam.x = clamp(hero.x + 8 - VIEW_W / 2, 0, WORLD_W - VIEW_W); cam.y = clamp(hero.y + 8 - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    }
  };
}

// ---------- le nom d'un bâtiment s'affiche quand on arrive près de lui ----------
const ZONES = [{ name: "MAISON DU DEV", x1: 13, y1: 13, x2: 20, y2: 19 }, { name: "LABO ONYXBUILD", x1: 8, y1: 3, x2: 15, y2: 9 }];
let inZone = null;
function checkZone() {
  const tx = Math.floor((hero.x + 8) / TILE), ty = Math.floor((hero.y + 12) / TILE);
  const zone = place ? inZone : ZONES.find((z) => tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2) || null;
  if (zone && zone !== inZone) showBanner(zone.name);
  inZone = zone;
  banner.t++;
}

// ---------- parler : Entrée devant quelqu'un ouvre la conversation ----------
const talk = { open: false, npc: null, i: 0, chars: 0 };
function interact() {
  if (talk.open) {
    if (talk.chars < talk.npc.lines[talk.i].length) talk.chars = talk.npc.lines[talk.i].length;   // un appui de plus : le texte s'affiche d'un coup
    else if (++talk.i >= talk.npc.lines.length) talk.open = false;
    else talk.chars = 0;
    return;
  }
  const fx = hero.x + (hero.dir === "left" ? -14 : hero.dir === "right" ? 14 : 0), fy = hero.y + (hero.dir === "up" ? -14 : hero.dir === "down" ? 14 : 0);
  const npc = crowd().find((o) => o !== hero && o.lines && Math.abs(o.x - fx) < 14 && Math.abs(o.y - fy) < 14);   // celui qu'on a juste en face
  if (!npc) return;
  Object.assign(talk, { open: true, npc, i: 0, chars: 0 });
  npc.dir = { up: "down", down: "up", left: "right", right: "left" }[hero.dir];   // il se tourne vers le héros
}

// ---------- les villageois : ils flânent autour de leur case, à demi-vitesse ----------
const VILLAGERS = [
  { tx: 9, ty: 11, p: { hair: "#4a9a3a", skin: "#f0c090", shirt: "#e0a030", light: "#ffd27a", pants: "#5a4a3a", shoe: "#222222" }, name: "JARDINIER", lines: ["Les fleurs poussent mieux depuis que le labo est ouvert."] },                       // le jardinier
  { tx: 18, ty: 7, p: { hair: "#7a3b1d", skin: "#e8b08a", shirt: "#c0392b", light: "#ff8a7a", pants: "#2f3f5f", shoe: "#3a2a1a" }, name: "BOULANGERE", lines: ["Mon pain sort du four à six heures. Passe goûter !"] },                       // la boulangère
  { tx: 24, ty: 11, p: { hair: "#e8d9a0", skin: "#f6d2b0", shirt: "#2a8f7a", light: "#8ae8d0", pants: "#4a4a5a", shoe: "#f4f4f4", phones: "#ff5a7a" }, name: "JEUNE", lines: ["Le labo OnyxBuild ? Ils font des sites web, des automatisations et des agents IA.", "Va voir, la porte est à gauche du village !"] },     // le jeune au casque rose
];
for (const [i, v] of VILLAGERS.entries()) {
  Object.assign(v, { x: v.tx * TILE, y: v.ty * TILE - 2, hx: v.tx * TILE, hy: v.ty * TILE - 2, dir: "down", walk: 0, moving: false, timer: 20 + i * 25, go: null, rnd: random(100 + i) });
  people.push(v);
}

function moveVillager(v) {
  if (talk.open && talk.npc === v) { v.moving = false; return; }                // il ne bouge pas pendant qu'on lui parle
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
let smoke = [];                                                                // la fumée de la cheminée
const butterflies = Array.from({ length: 6 }, (_, i) => ({ x: 120 + i * 55, y: 110 + (i % 3) * 70, a: i * 2, color: ["#ff8fc0", "#ffe14a", "#8fd0ff", "#ffffff"][i % 4] }));

function update() {
  time++;
  if (!shooting && time % 300 === 120) shooting = { x: 30 + r() * 90, y: 8 + r() * 30, life: 40 };
  else if (shooting) { shooting.x += 3; shooting.y += 1.4; if (--shooting.life <= 0) shooting = null; }

  if (time % 14 === 0) smoke.push({ x: HOUSE_X + 62, y: HOUSE_Y - 10, life: 90 });
  for (const p of smoke) { p.x += 0.15; p.y -= 0.4; p.life--; }
  smoke = smoke.filter((p) => p.life > 0);
  for (const b of butterflies) { b.a += 0.03; b.x += Math.cos(b.a * 1.3) * 0.7; b.y += Math.sin(b.a * 1.9) * 0.5; }
  if (!started) return;
  titleAlpha = Math.max(0, titleAlpha - 1 / 40);                          // le titre s'efface...
  worldAlpha = Math.min(1, worldAlpha + 1 / 80);                          // ...et le décor apparaît
  if (fade.dir) {                                                         // pendant le fondu, le héros attend
    fade.a = clamp(fade.a + fade.dir * 0.08, 0, 1);
    if (fade.a === 1 && fade.dir === 1) { fade.then(); fade.dir = -1; }
    else if (fade.a === 0) fade.dir = 0;
  } else moveHero();
  if (talk.open) talk.chars += 0.8;                                       // le texte s'écrit lettre après lettre
  if (!fade.dir && place) {                                               // une case spéciale sous les pieds : la sortie ou une porte vers une autre salle
    const c = place.plan[Math.floor((hero.y + 12) / TILE)]?.[Math.floor((hero.x + 8) / TILE)], link = place.links?.[c];
    if (c === "E") goTo(null);
    else if (link) goTo(link.to, link.at, link.dir);
  }
  VILLAGERS.forEach(moveVillager);
  if (!place) updateCamera();
  checkZone();
}

function drawWorld() {
  if (place) return drawRoomScene();
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
    for (const [bx, by, top] of [[HOUSE_X, HOUSE_Y, 10], [LAB_X, LAB_Y, 16]]) {      // derrière un bâtiment : le toit et la cheminée passent devant lui
      if (o.y + 15 >= by + 8 || o.x + 11 <= bx || o.x + 4 >= bx + 80) continue;
      const x0 = Math.max(bx - 2, o.x), x1 = Math.min(bx + 82, o.x + 16), y0 = Math.max(by - top, o.y), y1 = Math.min(by + 64, o.y + 16);
      if (x1 > x0 && y1 > y0) vctx.drawImage(world, x0, y0, x1 - x0, y1 - y0, x0 - cx, y0 - cy, x1 - x0, y1 - y0);
    }
  }
  const base = vctx.globalAlpha;                                          // la fumée de la cheminée
  for (const p of smoke) {
    vctx.globalAlpha = base * (p.life / 90) * 0.55;
    const size = 2 + (1 - p.life / 90) * 4;
    rect(vctx, "#e8e8f0", Math.round(p.x - cx), Math.round(p.y - cy), size, size);
  }
  vctx.globalAlpha = base;
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
  const fx = started && !place ? cam.x - Math.floor(cam.x) : 0, fy = started && !place ? cam.y - Math.floor(cam.y) : 0;
  ctx.drawImage(view, -fx * 4, -fy * 4, (VIEW_W + 1) * 4, (VIEW_H + 1) * 4);   // on agrandit x4, décalé de la partie fine du mouvement
  drawTitle(); drawBanner(); drawDialog(); drawFade();
}

// le panneau de bois qui annonce le nom de la maison : il glisse depuis le haut, reste deux secondes, puis remonte
const BANNER_FRAMES = 200;
function drawBanner() {
  if (banner.t > BANNER_FRAMES) return;
  const y = -80 + 112 * Math.min(1, banner.t / 18, (BANNER_FRAMES - banner.t) / 18);
  ctx.fillStyle = "#3a2210"; ctx.fillRect(250, y, 460, 70);
  ctx.fillStyle = "#7a4a22"; ctx.fillRect(256, y + 6, 448, 58);
  ctx.fillStyle = "#d9a85c"; ctx.fillRect(262, y + 12, 436, 46);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = FONT(24);
  ctx.fillStyle = "#fff3d0"; ctx.fillText(banner.text, 482, y + 37);
  ctx.fillStyle = "#3a2210"; ctx.fillText(banner.text, 480, y + 35);
  ctx.textAlign = "left";
}

// la boîte de dialogue : le nom de celui qui parle, et son texte qui s'écrit lettre après lettre
function drawDialog() {
  if (!talk.open) return;
  const text = talk.npc.lines[talk.i];
  ctx.fillStyle = "#0b0c1c"; ctx.fillRect(36, 452, 888, 172); ctx.fillStyle = "#6a70e0"; ctx.fillRect(36, 452, 888, 4); ctx.fillRect(36, 620, 888, 4);
  ctx.fillStyle = "#4348b0"; ctx.fillRect(56, 428, 24 + talk.npc.name.length * 18, 40);
  ctx.textBaseline = "middle"; ctx.font = FONT(16); ctx.fillStyle = "#ffffff"; ctx.fillText(talk.npc.name, 68, 449);
  ctx.font = FONT(18);
  const rows = []; let row = "";
  for (const word of text.split(" ")) {                                         // on coupe en lignes sur le texte entier : rien ne bouge pendant qu'il s'écrit
    if (row && ctx.measureText(row + " " + word).width > 830) { rows.push(row); row = word; } else row = row ? row + " " + word : word;
  }
  rows.push(row);
  let left = Math.floor(talk.chars);
  rows.forEach((r, i) => { ctx.fillStyle = "#ffffff"; ctx.fillText(r.slice(0, Math.max(0, left)), 64, 500 + i * 38); left -= r.length + 1; });
  if (talk.chars >= text.length && time % 40 < 24) { ctx.fillStyle = "#00e5ff"; ctx.fillRect(884, 588, 16, 12); }   // ▼ : appuie sur Entrée
}

function drawFade() {
  if (fade.a <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${fade.a})`; ctx.fillRect(0, 0, 960, 640);
}

// ---------- clavier ----------
addEventListener("keydown", (e) => {
  if (MOVES[e.code]) { e.preventDefault(); if (!keys.includes(e.code)) keys.push(e.code); }   // les flèches ne font pas défiler la page
  if (e.repeat) return;
  if (e.code === "KeyM") return Sound.toggle();
  if (["Enter", "Space"].includes(e.code)) {
    e.preventDefault();
    if (!started) { started = true; Sound.init(); Sound.select(); }     // la musique démarre ici
    else if (!fade.dir) interact();                                     // ensuite, Entrée sert à parler à celui qui est en face
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
