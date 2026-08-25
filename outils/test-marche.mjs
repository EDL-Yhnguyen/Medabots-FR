// Contrôle que l'émulateur avance bien entre deux « c ». Sans cette preuve,
// un point d'arrêt qui ne se déclenche pas ne prouverait rien du tout.

import { Gdb, hex } from './gdb.mjs';

const g = await new Gdb().connecter();
await g.interrompre();
const a = await g.lire(0x06000000, 0x4000);
const pc1 = (await g.registres())[15];

g.relancer();
await new Promise((r) => setTimeout(r, 3000));
await g.interrompre();
const b = await g.lire(0x06000000, 0x4000);
const pc2 = (await g.registres())[15];

let differents = 0;
for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) differents++;
console.log(`pc avant ${hex(pc1)} → après ${hex(pc2)}`);
console.log(`VRAM : ${differents} octets changés sur ${a.length} en 3 s`);
console.log(differents > 0 ? '✅ l’émulateur tourne bien' : '❌ l’émulateur est à l’arrêt');

g.relancer();
await new Promise((r) => setTimeout(r, 200));
g.fermer();
process.exit(0);
