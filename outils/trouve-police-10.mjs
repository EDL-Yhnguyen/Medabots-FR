// Sixième tentative sur la police — la première informée par l'état de l'art.
//
// Les cinq précédentes testaient des glyphes de 8, 16, 32 ou 64 octets. Le
// désassemblage de Medarot Navi (Normmatt) montre que le moteur Imagineer de
// cette génération emploie une police **1 bpp de 8×10 pixels, soit 10 octets par
// glyphe**, avec une table de largeurs séparée d'un octet par glyphe.
//
// Autrement dit : mes sondes ne pouvaient pas trouver, elles cherchaient une
// taille qui n'existe pas ici.
//
// Ce script fait deux choses :
//   1. cherche la TABLE D'EXPANSION 1bpp→4bpp — 16 entrées de 16 bits, où chaque
//      bit du quartet d'index devient un quartet 0xF. Motif court et très
//      reconnaissable ; le code qui la lit mène à la routine de rendu, donc à la
//      police ;
//   2. rejoue les sondes de table avec des glyphes de 9 à 12 octets.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])
const pc = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1 } return n }

/* ---------------------------------------- 1. table d'expansion 1bpp→4bpp ---- */

// Pour un index i de 4 bits, la table rend 16 bits dont les quatre quartets
// valent 0xF ou 0x0 selon les bits de i. Deux ordres de bits sont possibles.
function attendu(i, inverse) {
  let v = 0
  for (let b = 0; b < 4; b++) {
    const bit = inverse ? (i >> (3 - b)) & 1 : (i >> b) & 1
    if (bit) v |= 0xf << (b * 4)
  }
  return v
}

console.log('=== TABLE D’EXPANSION 1bpp → 4bpp (32 octets) ===')
const tables = []
for (const inverse of [false, true]) {
  const modele = Buffer.alloc(32)
  for (let i = 0; i < 16; i++) modele.writeUInt16LE(attendu(i, inverse), i * 2)
  let pos = 0
  for (;;) {
    const trouve = rom.indexOf(modele, pos)
    if (trouve < 0) break
    tables.push({ adresse: trouve, inverse })
    pos = trouve + 1
  }
}
if (tables.length === 0) {
  console.log('  aucune — le moteur n’emploie pas ce schéma, ou pas dans cet ordre d’octets')
} else {
  for (const t of tables) {
    console.log('  0x' + t.adresse.toString(16).toUpperCase().padStart(6, '0') +
      '  (bits ' + (t.inverse ? 'poids fort d’abord' : 'poids faible d’abord') + ')')
  }
}

/* ------------------------------------------- 2. sondes, glyphes de 9 à 12 --- */

// Mêmes sondes que la troisième tentative, mais avec la bonne taille de glyphe.
// 0x00 = espace (vide), 0x01–0x1A = A–Z, 0x40 = point (peu de pixels, en bas).
function sonde(buf, base, taille) {
  if (base + 0x41 * taille > buf.length) return null
  for (let o = 0; o < taille; o++) if (buf[base + o] !== 0) return null
  const encres = []
  for (let g = 1; g <= 26; g++) {
    let t = 0
    for (let l = 0; l < taille; l++) t += pc(buf[base + g * taille + l])
    if (t < 6 || t > 45) return null
    encres.push(t)
  }
  let ptTotal = 0, ptHaut = 0
  for (let l = 0; l < taille; l++) {
    const n = pc(buf[base + 0x40 * taille + l])
    ptTotal += n
    if (l < taille - 4) ptHaut += n
  }
  if (ptTotal < 1 || ptTotal > 10 || ptHaut !== 0) return null
  const I = encres[8], M = encres[12], W = encres[22]
  if (!(I < M && I < W)) return null
  return { I, M, W, pt: ptTotal }
}

console.log('\n=== SONDES DE TABLE, GLYPHES DE 9 À 12 OCTETS ===')
const trouves = []
for (const taille of [9, 10, 11, 12]) {
  for (let base = 0; base + 0x41 * taille < rom.length; base += 2) {
    const r = sonde(rom, base, taille)
    if (r) trouves.push({ base, taille, ...r })
  }
}
console.log('Correspondances : ' + trouves.length + '\n')
for (const t of trouves.slice(0, 25)) {
  console.log('  0x' + t.base.toString(16).toUpperCase().padStart(6, '0') +
    '  ' + t.taille + ' o/glyphe  point=' + t.pt + 'px  I=' + t.I + ' M=' + t.M + ' W=' + t.W)
}

/* ------------------------------------------------------ planche de contact --- */

if (trouves.length) {
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const co = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(co)); return Buffer.concat([l, co, c]) }
  const png = (w, h, px) => {
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8
    const br = Buffer.alloc(h * (w + 1))
    for (let y = 0; y < h; y++) { br[y * (w + 1)] = 0; px.copy(br, y * (w + 1) + 1, y * w, (y + 1) * w) }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(br, { level: 9 })), ch('IEND', Buffer.alloc(0))])
  }
  const montres = trouves.slice(0, 6)
  const COLS = 16, ZOOM = 4, NBG = 80
  const larg = COLS * 8 * ZOOM
  const hauts = montres.map((t) => (NBG / COLS) * t.taille * ZOOM + 12)
  const haut = hauts.reduce((a, x) => a + x, 0)
  const px = Buffer.alloc(larg * haut, 60)
  let y0 = 0
  for (let i = 0; i < montres.length; i++) {
    const { base, taille } = montres[i]
    for (let g = 0; g < NBG; g++) {
      const gx = (g % COLS) * 8, gy = ((g / COLS) | 0) * taille
      for (let l = 0; l < taille; l++) {
        const o = rom[base + g * taille + l] ?? 0
        for (let b = 0; b < 8; b++) {
          const on = (o >> (7 - b)) & 1
          for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
            const x = (gx + b) * ZOOM + zx, y = y0 + (gy + l) * ZOOM + zy
            if (x < larg && y < haut) px[y * larg + x] = on ? 255 : 0
          }
        }
      }
    }
    y0 += hauts[i]
  }
  writeFileSync(process.argv[3], png(larg, haut, px))
  console.log('\nPlanche : ' + process.argv[3])
  console.log('Zones : ' + montres.map((t) => '0x' + t.base.toString(16).toUpperCase() + ' (' + t.taille + 'o)').join(', '))
}
