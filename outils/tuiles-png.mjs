// Rend un dump binaire en planche de tuiles GBA 8x8, pour inspection visuelle.
//
//   node outils/tuiles-png.mjs travail/titre-vram.bin 4
//
// Le second argument est la profondeur (1, 4 ou 8 bits par pixel). Le rendu est
// en niveaux de gris : l'index de couleur devient une intensité, ce qui montre
// la forme sans dépendre de la palette réellement employée à l'écran.

import fs from 'node:fs';
import path from 'node:path';
import { png } from './png.mjs';

const fichier = process.argv[2];
const bpp = Number(process.argv[3] ?? 4);
const TUILES_PAR_LIGNE = Number(process.argv[4] ?? 32);
const debut = Number(process.argv[5] ?? 0);
const longueur = Number(process.argv[6] ?? 0);
const zoom = Number(process.argv[7] ?? 1);

let donnees = fs.readFileSync(fichier);
if (debut || longueur) donnees = donnees.subarray(debut, longueur ? debut + longueur : undefined);
const octetsParTuile = (8 * 8 * bpp) / 8;
const nbTuiles = Math.floor(donnees.length / octetsParTuile);
const lignes = Math.ceil(nbTuiles / TUILES_PAR_LIGNE);
const largeur = TUILES_PAR_LIGNE * 8;
const hauteur = lignes * 8;
const pixels = Buffer.alloc(largeur * hauteur);

const intensite = (v) => {
  if (bpp === 1) return v ? 255 : 0;
  if (bpp === 4) return v === 0 ? 0 : 60 + Math.round((v * 195) / 15);
  return v;
};

for (let t = 0; t < nbTuiles; t++) {
  const tx = (t % TUILES_PAR_LIGNE) * 8;
  const ty = Math.floor(t / TUILES_PAR_LIGNE) * 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let v;
      if (bpp === 4) {
        const o = donnees[t * 32 + y * 4 + (x >> 1)];
        v = x & 1 ? o >> 4 : o & 0x0f;
      } else if (bpp === 8) {
        v = donnees[t * 64 + y * 8 + x];
      } else {
        v = (donnees[t * 8 + y] >> (7 - x)) & 1;
      }
      pixels[(ty + y) * largeur + tx + x] = intensite(v);
    }
  }
}

let final = pixels;
let lg = largeur;
let ht = hauteur;
if (zoom > 1) {
  lg = largeur * zoom;
  ht = hauteur * zoom;
  final = Buffer.alloc(lg * ht);
  for (let y = 0; y < ht; y++)
    for (let x = 0; x < lg; x++) final[y * lg + x] = pixels[Math.floor(y / zoom) * largeur + Math.floor(x / zoom)];
}

const suffixe = debut || longueur ? `-${debut.toString(16)}` : '';
const sortie = fichier.replace(/\.bin$/, '') + `${suffixe}-${bpp}bpp.png`;
fs.writeFileSync(sortie, png(lg, ht, final));
console.log(`${nbTuiles} tuiles ${bpp}bpp → ${path.basename(sortie)} (${lg}×${ht})`);
