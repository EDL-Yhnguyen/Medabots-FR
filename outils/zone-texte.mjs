// Repère les tuiles qui composent une zone de l'écran, et les rend en grand.
//
//   node outils/zone-texte.mjs travail/t3 <x> <y> <largeur> <hauteur>
//
// Coordonnées en pixels d'écran (240x160). Sert à isoler les tuiles d'une boîte
// de dialogue : ce sont elles qui portent les glyphes réellement dessinés, donc
// la vérité de terrain à confronter à la ROM.

import fs from 'node:fs';
import { png } from './png.mjs';

const base = process.argv[2];
const [x0, y0, l, h] = process.argv.slice(3, 7).map(Number);

const vram = fs.readFileSync(`${base}-vram.bin`);
const io = fs.readFileSync(`${base}-io.bin`);
const dispcnt = io.readUInt16LE(0);

for (let bg = 0; bg < 4; bg++) {
  if (!(dispcnt & (1 << (8 + bg)))) continue;
  const cnt = io.readUInt16LE(0x08 + bg * 2);
  const baseTuiles = ((cnt >> 2) & 3) * 0x4000;
  const baseCarte = ((cnt >> 8) & 0x1f) * 0x800;
  const c256 = !!(cnt & 0x80);
  const dx = io.readUInt16LE(0x10 + bg * 4);
  const dy = io.readUInt16LE(0x12 + bg * 4);

  const vues = new Map();
  for (let y = y0; y < y0 + h; y += 8) {
    const ligne = [];
    for (let x = x0; x < x0 + l; x += 8) {
      const mx = (x + dx) & 0xff;
      const my = (y + dy) & 0xff;
      const e = vram.readUInt16LE(baseCarte + (((my >> 3) * 32 + (mx >> 3)) * 2));
      ligne.push(e & 0x3ff);
      vues.set(e & 0x3ff, true);
    }
    console.log(`BG${bg} y=${y} tuiles: ${ligne.map((t) => t.toString(16).padStart(3, '0')).join(' ')}`);
  }
  const idx = [...vues.keys()].filter((t) => t !== 0).sort((a, b) => a - b);
  if (!idx.length) continue;
  const octets = c256 ? 64 : 32;
  console.log(
    `BG${bg} : ${idx.length} tuiles distinctes, ${c256 ? '8bpp' : '4bpp'}, base ${'0x' + (0x06000000 + baseTuiles).toString(16)}, ` +
      `plage tuiles ${idx[0]}..${idx[idx.length - 1]} → VRAM 0x${(0x06000000 + baseTuiles + idx[0] * octets).toString(16)}`,
  );

  // Planche : une tuile par case, 16 par ligne, zoom 6.
  const PL = 16;
  const zoom = 6;
  const lignes = Math.ceil(idx.length / PL);
  const L = PL * 8 * zoom;
  const H = lignes * 8 * zoom;
  const px = Buffer.alloc(L * H);
  idx.forEach((t, i) => {
    const ox = (i % PL) * 8 * zoom;
    const oy = Math.floor(i / PL) * 8 * zoom;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        let v;
        if (c256) v = vram[baseTuiles + t * 64 + y * 8 + x] ?? 0;
        else {
          const o = vram[baseTuiles + t * 32 + y * 4 + (x >> 1)] ?? 0;
          v = x & 1 ? o >> 4 : o & 0x0f;
        }
        const g = v === 0 ? 0 : 255;
        for (let zy = 0; zy < zoom; zy++)
          for (let zx = 0; zx < zoom; zx++) px[(oy + y * zoom + zy) * L + ox + x * zoom + zx] = g;
      }
  });
  fs.writeFileSync(`${base}-bg${bg}-tuiles.png`, png(L, H, px));
  console.log(`  → ${base}-bg${bg}-tuiles.png`);

  // Les octets bruts de ces tuiles, pour la confrontation à la ROM.
  const brut = Buffer.alloc(idx.length * octets);
  idx.forEach((t, i) => vram.copy(brut, i * octets, baseTuiles + t * octets, baseTuiles + (t + 1) * octets));
  fs.writeFileSync(`${base}-bg${bg}-tuiles.bin`, brut);
}
