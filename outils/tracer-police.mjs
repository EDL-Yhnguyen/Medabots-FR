// Remonte de la VRAM à la ROM : point d'arrêt en écriture sur les tuiles de
// texte, puis lecture des registres au moment où le moteur les compose.
//
//   node outils/tracer-police.mjs <adresse VRAM hex> [longueur] [touches]
//   node outils/tracer-police.mjs 6008140 300 x,x,x
//
// Prérequis : mGBA.exe -g <rom> tourne, une boîte de dialogue est à l'écran.
// Le stub GDB de mGBA accepte Z2 (surveillance en écriture) ; le paquet d'arrêt
// nomme l'adresse touchée, et « g » donne r0-r15 à cet instant. Un registre
// pointant dans 0x08xxxxxx est une adresse de la ROM : c'est ce qu'on cherche.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { Gdb, hex } from './gdb.mjs';

const adresse = parseInt(process.argv[2] ?? '6008140', 16);
const longueur = parseInt(process.argv[3] ?? '200', 16);
const touches = process.argv[4] ?? 'x,x,x,x';
const RACINE = path.resolve(import.meta.dirname, '..');

const g = await new Gdb().connecter();
await g.interrompre();

const pose = await g.envoyer(`Z2,${adresse.toString(16)},${longueur.toString(16)}`);
if (pose !== 'OK') {
  console.log(`Z2 refusé (« ${pose} ») — on retombe sur une surveillance de 4 octets.`);
  const r = await g.envoyer(`Z2,${adresse.toString(16)},4`);
  if (r !== 'OK') {
    console.log(`Z2 non supporté du tout : « ${r} ». Le stub de mGBA ne pose pas de watchpoint.`);
    g.relancer();
    process.exit(2);
  }
}
console.log(`Surveillance en écriture posée sur ${hex(adresse)}+${hex(longueur, 4)}.`);

for (let n = 1; n <= 6; n++) {
  g.relancer();
  // Les touches sont envoyées depuis un processus séparé : le jeu n'avance la
  // boîte de dialogue que sur pression, et le script est bloqué en attente.
  spawn(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', path.join(RACINE, 'outils/fenetre.ps1'),
     '-Action', 'touches', '-Touches', touches, '-Maintien', '100', '-Pause', '300'],
    { stdio: 'ignore', detached: true },
  ).unref();

  const arret = await Promise.race([
    g.enCours,
    new Promise((r) => setTimeout(() => r(null), 15000)),
  ]);
  if (!arret) {
    console.log(`Arrêt ${n} : rien en 15 s.`);
    continue;
  }
  g.enCours = null;

  const r = await g.registres();
  const rom = r.slice(0, 15)
    .map((v, i) => [i, v])
    .filter(([, v]) => v >= 0x08000000 && v < 0x08800000);
  console.log(
    `\nArrêt ${n} : ${arret}\n  pc = ${hex(r[15])}  lr = ${hex(r[14])}  sp = ${hex(r[13])}\n` +
      `  registres pointant dans la ROM : ${rom.map(([i, v]) => `r${i}=${hex(v)}`).join(' ') || '(aucun)'}`,
  );
  console.log('  r0..r12 : ' + r.slice(0, 13).map((v, i) => `r${i}=${hex(v)}`).join(' '));

  // La pile porte souvent le pointeur de police passé en argument.
  try {
    const pile = await g.lire(r[13], 0x80);
    const cand = [];
    for (let i = 0; i + 4 <= pile.length; i += 4) {
      const v = pile.readUInt32LE(i);
      if (v >= 0x08000000 && v < 0x08800000) cand.push(`+${i}:${hex(v)}`);
    }
    console.log('  pile → ROM : ' + (cand.join(' ') || '(rien)'));
  } catch (e) {
    console.log('  pile illisible :', e.message);
  }
}

await g.envoyer(`z2,${adresse.toString(16)},${longueur.toString(16)}`);
g.relancer();
await new Promise((r) => setTimeout(r, 200));
g.fermer();
process.exit(0);
