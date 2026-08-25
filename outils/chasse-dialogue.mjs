// Amène le jeu jusqu'à un écran de texte, sans intervention.
//
//   node outils/chasse-dialogue.mjs [tours]
//
// Détection : une police à chasse variable compose son texte dans une suite de
// tuiles CONSÉCUTIVES de la VRAM (0x25, 0x26, 0x27…). Une carte de fond qui
// contient une telle suite affiche du texte fraîchement rendu — c'est une
// signature bien plus fiable qu'un coup d'œil sur une capture.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Gdb, hex } from './gdb.mjs';

const RACINE = path.resolve(import.meta.dirname, '..');
const TRAVAIL = path.join(RACINE, 'travail');
const tours = Number(process.argv[2] ?? 20);

function touches(liste, maintien = 100, pause = 250) {
  spawnSync('powershell', [
    '-ExecutionPolicy', 'Bypass', '-File', path.join(RACINE, 'outils/fenetre.ps1'),
    '-Action', 'touches', '-Touches', liste, '-Maintien', String(maintien), '-Pause', String(pause),
  ], { stdio: 'ignore' });
}

// Cherche dans les cartes de fond la plus longue suite de tuiles consécutives.
function suites(vram, io) {
  const dispcnt = io.readUInt16LE(0);
  const trouvailles = [];
  for (let bg = 0; bg < 4; bg++) {
    if (!(dispcnt & (1 << (8 + bg)))) continue;
    const cnt = io.readUInt16LE(0x08 + bg * 2);
    if (cnt & 0x80) continue; // 8bpp : ce n'est pas une couche de texte ici
    const carte = ((cnt >> 8) & 0x1f) * 0x800;
    const tuiles = ((cnt >> 2) & 3) * 0x4000;
    let meilleure = { longueur: 0 };
    for (let l = 0; l < 32; l++) {
      let debut = null;
      let n = 0;
      for (let c = 0; c < 32; c++) {
        const t = vram.readUInt16LE(carte + (l * 32 + c) * 2) & 0x3ff;
        if (debut !== null && t === (vram.readUInt16LE(carte + (l * 32 + c - 1) * 2) & 0x3ff) + 1 && t !== 0) {
          n++;
        } else {
          debut = t;
          n = 1;
        }
        if (n > meilleure.longueur) meilleure = { longueur: n, ligne: l, colonne: c - n + 1, premiere: t - n + 1, bg, tuiles };
      }
    }
    if (meilleure.longueur >= 6) {
      // Une suite de tuiles vides ne prouve rien : la boîte peut être ouverte
      // sans texte dedans. On exige une quantité d'encre de texte.
      let encre = 0;
      let total = 0;
      for (let t = meilleure.premiere; t < meilleure.premiere + meilleure.longueur; t++) {
        for (let o = 0; o < 32; o++) {
          const v = vram[meilleure.tuiles + t * 32 + o] ?? 0;
          if (v & 0x0f) encre++;
          if (v & 0xf0) encre++;
          total += 2;
        }
      }
      meilleure.encre = encre / total;
      trouvailles.push(meilleure);
    }
  }
  return trouvailles;
}

const g = await new Gdb().connecter();
const ZONES = { vram: [0x06000000, 0x18000], io: [0x04000000, 0x60], palette: [0x05000000, 0x400] };

for (let tour = 1; tour <= tours; tour++) {
  g.relancer();
  touches('x,ENTER,x,x', 100, 250);
  await g.interrompre();

  const dumps = {};
  for (const [cle, [a, t]] of Object.entries(ZONES)) dumps[cle] = await g.lire(a, t);

  const s = suites(dumps.vram, dumps.io);
  const dispcnt = dumps.io.readUInt16LE(0);
  console.log(
    `tour ${String(tour).padStart(2)} — DISPCNT ${hex(dispcnt, 4)} — ` +
      (s.length
        ? s.map((m) => `BG${m.bg} suite de ${m.longueur} tuiles depuis ${hex(m.premiere, 3)} (l${m.ligne} c${m.colonne}, encre ${(m.encre * 100).toFixed(0)} %)`).join(' | ')
        : 'aucune suite'),
  );

  if (s.some((m) => m.longueur >= 8 && m.encre > 0.08 && m.encre < 0.5)) {
    for (const [cle, d] of Object.entries(dumps)) fs.writeFileSync(path.join(TRAVAIL, `texte-${cle}.bin`), d);
    for (const [cle, [a, t]] of [['ewram', [0x02000000, 0x40000]], ['iwram', [0x03000000, 0x8000]]]) {
      fs.writeFileSync(path.join(TRAVAIL, `texte-${cle}.bin`), await g.lire(a, t));
    }
    console.log('\n✅ Écran de texte capturé → travail/texte-*.bin');
    console.log(JSON.stringify(s, null, 2));
    break;
  }
}

g.relancer();
await new Promise((r) => setTimeout(r, 200));
g.fermer();
process.exit(0);
