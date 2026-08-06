// Écriture PNG minimale (niveaux de gris 8 bits), sans dépendance.
import { deflateSync } from 'node:zlib';

const tableCrc = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = tableCrc[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const bloc = (type, donnees) => {
  const taille = Buffer.alloc(4);
  taille.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, 'latin1'), donnees]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(corps));
  return Buffer.concat([taille, corps, c]);
};

export function png(largeur, hauteur, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 0; // niveaux de gris
  const brut = Buffer.alloc(hauteur * (largeur + 1));
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur + 1)] = 0;
    pixels.copy(brut, y * (largeur + 1) + 1, y * largeur, (y + 1) * largeur);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ]);
}
