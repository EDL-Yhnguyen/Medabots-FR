// Vérifie que le stub GDB de mGBA implémente réellement Z2 (surveillance en
// écriture). Un « OK » à la pose ne prouve rien : il faut voir un arrêt.
// On surveille toute la VRAM, qui est écrite en permanence par le jeu.

import { Gdb, hex } from './gdb.mjs';

const g = await new Gdb().connecter();
await g.interrompre();

for (const [nom, cmd] of [
  ['Z2 VRAM entière', 'Z2,6000000,18000'],
  ['Z2 4 octets', 'Z2,6000000,4'],
  ['Z4 accès', 'Z4,6000000,4'],
  ['Z0 point d’arrêt logiciel', 'Z0,3001c00,2'],
]) {
  const r = await g.envoyer(cmd);
  console.log(`${nom.padEnd(28)} → ${r === '' ? '(vide = non supporté)' : r}`);
  if (r === 'OK') {
    g.relancer();
    const arret = await Promise.race([g.enCours, new Promise((k) => setTimeout(() => k(null), 6000))]);
    if (arret) {
      g.enCours = null;
      const reg = await g.registres();
      console.log(`   ✅ DÉCLENCHÉ : ${arret}  pc=${hex(reg[15])} lr=${hex(reg[14])}`);
      console.log('   r0..r12 : ' + reg.slice(0, 13).map((v, i) => `r${i}=${hex(v)}`).join(' '));
    } else {
      console.log('   ❌ aucun arrêt en 6 s');
      await g.interrompre();
    }
    await g.envoyer(cmd.replace(/^Z/, 'z'));
  }
}

g.relancer();
await new Promise((r) => setTimeout(r, 200));
g.fermer();
process.exit(0);
