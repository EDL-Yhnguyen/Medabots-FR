// Recompose l'écran GBA (240x160) à partir des dumps VRAM / palette / registres.
//
//   node outils/ecran.mjs travail/titre
//
// L'environnement n'autorise pas la capture d'écran du système : on reconstruit
// donc l'image nous-mêmes, ce qui a l'avantage d'être reproductible et de dire
// exactement quelle tuile vient d'où.
//
// Ne gère que le mode 0 (calques de tuiles), qui est celui des écrans de texte.

import fs from 'node:fs';
import { png } from './png.mjs';

const base = process.argv[2];
const vram = fs.readFileSync(`${base}-vram.bin`);
const pal = fs.readFileSync(`${base}-palette.bin`);
const io = fs.readFileSync(`${base}-io.bin`);

const dispcnt = io.readUInt16LE(0);
const mode = dispcnt & 7;
if (mode !== 0) console.warn(`Attention : mode ${mode}, seul le mode 0 est rendu correctement.`);

const L = 240;
const H = 160;
// Rendu en niveaux de gris : on convertit le RGB555 en luminance.
const gris = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const c = pal.readUInt16LE(i * 2);
  const r = (c & 31) << 3;
  const v = ((c >> 5) & 31) << 3;
  const b = ((c >> 10) & 31) << 3;
  gris[i] = Math.round(0.299 * r + 0.587 * v + 0.114 * b);
}

const pixels = Buffer.alloc(L * H);
const rendu = Buffer.alloc(L * H).fill(0); // priorité déjà écrite

// On dessine du calque de plus faible priorité vers le plus fort.
const calques = [];
for (let bg = 0; bg < 4; bg++) {
  if (!(dispcnt & (1 << (8 + bg)))) continue;
  const cnt = io.readUInt16LE(0x08 + bg * 2);
  calques.push({
    bg,
    priorite: cnt & 3,
    tuiles: ((cnt >> 2) & 3) * 0x4000,
    carte: ((cnt >> 8) & 0x1f) * 0x800,
    couleurs256: !!(cnt & 0x80),
    taille: (cnt >> 14) & 3,
    dx: io.readUInt16LE(0x10 + bg * 4),
    dy: io.readUInt16LE(0x12 + bg * 4),
  });
}
calques.sort((a, b) => b.priorite - a.priorite);

for (const c of calques) {
  const largeurCarte = c.taille & 1 ? 512 : 256;
  const hauteurCarte = c.taille & 2 ? 512 : 256;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      const mx = (x + c.dx) % largeurCarte;
      const my = (y + c.dy) % hauteurCarte;
      // Chaque écran de 256x256 fait 0x800 octets, rangés en Z.
      const ecran = (mx >= 256 ? 1 : 0) + (my >= 256 ? (largeurCarte > 256 ? 2 : 1) : 0);
      const tx = (mx % 256) >> 3;
      const ty = (my % 256) >> 3;
      const adresseCarte = c.carte + ecran * 0x800 + (ty * 32 + tx) * 2;
      if (adresseCarte + 1 >= vram.length) continue;
      const entree = vram.readUInt16LE(adresseCarte);
      const tuile = entree & 0x3ff;
      const miroirX = entree & 0x400;
      const miroirY = entree & 0x800;
      const palette = (entree >> 12) & 0x0f;
      let px = mx & 7;
      let py = my & 7;
      if (miroirX) px = 7 - px;
      if (miroirY) py = 7 - py;
      let index;
      if (c.couleurs256) {
        index = vram[c.tuiles + tuile * 64 + py * 8 + px] ?? 0;
      } else {
        const o = vram[c.tuiles + tuile * 32 + py * 4 + (px >> 1)] ?? 0;
        const v = px & 1 ? o >> 4 : o & 0x0f;
        index = v === 0 ? 0 : palette * 16 + v;
      }
      if (index === 0) continue; // transparent
      pixels[y * L + x] = gris[index];
      rendu[y * L + x] = 1;
    }
  }
}

const zoom = 3;
const gr = Buffer.alloc(L * zoom * H * zoom);
for (let y = 0; y < H * zoom; y++)
  for (let x = 0; x < L * zoom; x++)
    gr[y * L * zoom + x] = pixels[Math.floor(y / zoom) * L + Math.floor(x / zoom)];

fs.writeFileSync(`${base}-ecran.png`, png(L * zoom, H * zoom, gr));
console.log(
  `mode ${mode}, calques ${calques.map((c) => `BG${c.bg}(p${c.priorite},dx${c.dx},dy${c.dy})`).join(' ')} → ${base}-ecran.png`,
);
