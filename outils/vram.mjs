// Vide la VRAM (et la palette, et l'OAM) d'une partie en cours dans mGBA.
//
// Prérequis : mgba-sdl.exe -g <rom.gba> tourne déjà. On s'y attache par le stub
// GDB, on interrompt le processeur, on lit, on relance.
//
//   node outils/vram.mjs [nom]
//
// Sorties dans travail/ : <nom>-vram.bin, <nom>-palette.bin, <nom>-oam.bin,
// <nom>-registres.txt

import fs from 'node:fs';
import path from 'node:path';
import { Gdb, hex } from './gdb.mjs';

const RACINE = path.resolve(import.meta.dirname, '..');
const TRAVAIL = path.join(RACINE, 'travail');

const ZONES = {
  vram: [0x06000000, 0x18000], // 96 Kio
  palette: [0x05000000, 0x400], // 1 Kio
  oam: [0x07000000, 0x400], // 1 Kio
  io: [0x04000000, 0x60], // registres d'affichage
};

// La police peut avoir été décompressée en RAM au démarrage : on la ramasse
// aussi, sinon on chercherait dans la ROM une donnée qui n'y est qu'empaquetée.
if (process.argv.includes('--ram')) {
  ZONES.ewram = [0x02000000, 0x40000]; // 256 Kio
  ZONES.iwram = [0x03000000, 0x8000]; // 32 Kio
}

const nom = process.argv[2] || 'ecran';
const secondes = Number(process.argv[3] ?? 0);

const g = await new Gdb().connecter();
console.log('Stub GDB joint.');

if (secondes > 0) {
  // mGBA lancé avec -g démarre le processeur à l'arrêt, pc = 0 : sans « c »,
  // la ROM n'a même pas booté et la VRAM est vide.
  g.relancer();
  console.log(`Émulation lancée, ${secondes} s…`);
  await new Promise((r) => setTimeout(r, secondes * 1000));
}
const arret = await g.interrompre();
console.log('Interruption :', arret || '(pas de réponse)');

fs.mkdirSync(TRAVAIL, { recursive: true });

for (const [cle, [adresse, taille]] of Object.entries(ZONES)) {
  const donnees = await g.lire(adresse, taille);
  const fichier = path.join(TRAVAIL, `${nom}-${cle}.bin`);
  fs.writeFileSync(fichier, donnees);
  const remplis = donnees.filter((o) => o !== 0).length;
  console.log(
    `${cle.padEnd(8)} ${hex(adresse)} ${String(taille).padStart(6)} o  →  ${path.relative(RACINE, fichier)}  (${((100 * remplis) / taille).toFixed(1)} % non nul)`,
  );
}

const r = await g.registres();
const lignes = r.slice(0, 16).map((v, i) => `r${i} = ${hex(v)}`);
lignes.push(`cpsr = ${hex(r[16] ?? 0)}`);
fs.writeFileSync(path.join(TRAVAIL, `${nom}-registres.txt`), lignes.join('\n') + '\n');
console.log('pc =', hex(r[15]));

// DISPCNT dit quel mode et quels calques sont actifs : indispensable pour lire
// la VRAM correctement.
const io = fs.readFileSync(path.join(TRAVAIL, `${nom}-io.bin`));
const dispcnt = io.readUInt16LE(0);
console.log(
  `DISPCNT = ${hex(dispcnt, 4)} — mode ${dispcnt & 7}, calques actifs :`,
  ['BG0', 'BG1', 'BG2', 'BG3', 'OBJ'].filter((_, i) => dispcnt & (1 << (8 + i))).join(' ') || '(aucun)',
);
for (let bg = 0; bg < 4; bg++) {
  const c = io.readUInt16LE(0x08 + bg * 2);
  console.log(
    `  BG${bg}CNT = ${hex(c, 4)} — tuiles @ ${hex(0x06000000 + ((c >> 2) & 3) * 0x4000)}, ` +
      `carte @ ${hex(0x06000000 + ((c >> 8) & 0x1f) * 0x800)}, ${c & 0x80 ? '8bpp' : '4bpp'}`,
  );
}

g.relancer(); // on relance le jeu sans attendre la réponse d'arrêt, qui n'arriverait jamais
await new Promise((r) => setTimeout(r, 200));
g.fermer();
console.log('Émulateur relancé.');
process.exit(0);
