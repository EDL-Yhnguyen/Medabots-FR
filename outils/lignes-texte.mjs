// Reconstitue les lignes de texte rendues en VRAM, séparées par index de couleur.
//
//   node outils/lignes-texte.mjs travail/t3-vram.bin 0x8000 0x25 8 3
//        <dump>                  <base tuiles>  <1re tuile> <tuiles/ligne> <lignes>
//
// Une police à chasse variable écrit ses glyphes dans des tuiles CONSÉCUTIVES :
// la ligne affichée est donc la concaténation horizontale de ces tuiles. On la
// remet à plat pour retrouver les dessins de glyphes tels que le moteur les a
// produits — c'est la vérité de terrain qui manquait aux recherches statiques.
//
// Le rendu se fait index par index : le corps du glyphe et son ombre portée
// n'ont pas la même couleur, et confondre les deux fausserait toute comparaison
// avec la ROM.

import fs from 'node:fs';

const [fichier, baseHex, premiereHex, parLigneStr, lignesStr] = process.argv.slice(2);
const vram = fs.readFileSync(fichier);
const base = parseInt(baseHex, 16);
const premiere = parseInt(premiereHex, 16);
const parLigne = Number(parLigneStr);
const nbLignes = Number(lignesStr);

const largeur = parLigne * 8;

// Un pixel par (ligne, y, x) : la valeur d'index 4bpp.
const grille = [];
for (let l = 0; l < nbLignes; l++) {
  const img = new Uint8Array(largeur * 8);
  for (let t = 0; t < parLigne; t++) {
    const tuile = premiere + l * parLigne + t;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const o = vram[base + tuile * 32 + y * 4 + (x >> 1)] ?? 0;
        img[y * largeur + t * 8 + x] = x & 1 ? o >> 4 : o & 0x0f;
      }
  }
  grille.push(img);
}

const hist = new Array(16).fill(0);
for (const img of grille) for (const v of img) hist[v]++;
console.log('Histogramme des index 4bpp :');
hist.forEach((n, i) => n && console.log(`  index ${String(i).padStart(2)} : ${n}`));

for (let i = 0; i < 16; i++) {
  if (!hist[i] || i === 0) continue;
  const part = hist[i] / (largeur * 8 * nbLignes);
  if (part > 0.9) continue; // le fond
  console.log(`\n=== index ${i} (${(part * 100).toFixed(1)} %) ===`);
  for (const img of grille) {
    for (let y = 0; y < 8; y++) {
      let s = '';
      for (let x = 0; x < largeur; x++) s += img[y * largeur + x] === i ? '#' : '.';
      console.log(s);
    }
    console.log('-'.repeat(largeur));
  }
}

// Sortie machine : un octet par pixel, index brut.
const plat = Buffer.concat(grille.map((g) => Buffer.from(g)));
fs.writeFileSync(fichier.replace(/\.bin$/, '') + '-lignes.bin', plat);
console.log(`\n${nbLignes} ligne(s) de ${largeur}×8 → ${fichier.replace(/\.bin$/, '')}-lignes.bin`);
