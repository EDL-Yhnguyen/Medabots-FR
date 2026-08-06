// La police n'est pas en clair dans la ROM : on décompresse les blocs LZ77
// (format BIOS Nintendo) et on cherche la police dans le résultat.
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])

// --- Décompression LZ77 façon BIOS GBA ---
// En-tête : 0x10 + taille sur 3 octets. Puis, par groupe de 8 unités, un octet de
// drapeaux : bit à 0 = octet littéral, bit à 1 = référence arrière (longueur+distance).
function delz(src, pos) {
  if (src[pos] !== 0x10) return null
  const taille = src[pos + 1] | (src[pos + 2] << 8) | (src[pos + 3] << 16)
  if (taille < 64 || taille > 0x20000) return null
  const out = Buffer.alloc(taille)
  let i = pos + 4, o = 0
  while (o < taille) {
    if (i >= src.length) return null
    const drapeaux = src[i++]
    for (let b = 0; b < 8 && o < taille; b++) {
      if (drapeaux & (0x80 >> b)) {
        if (i + 1 >= src.length) return null
        const a = src[i++], z = src[i++]
        const lon = (a >> 4) + 3
        const dist = (((a & 0x0f) << 8) | z) + 1
        if (dist > o) return null // référence hors limites : ce n'est pas du LZ77 valide
        for (let k = 0; k < lon && o < taille; k++) { out[o] = out[o - dist]; o++ }
      } else {
        if (i >= src.length) return null
        out[o++] = src[i++]
      }
    }
  }
  return out
}

const popcount = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1 } return n }

// Note une zone : ressemble-t-elle à une police 8x8 en 1 bit par pixel ?
// Discriminant clé face au bruit : une police contient BEAUCOUP d'octets nuls
// (lignes vides) et peu d'encre par ligne.
function noteFonte(buf) {
  if (buf.length < 512) return 0
  let nuls = 0, encreTotale = 0, nonNuls = 0
  const vus = new Set()
  for (const b of buf) {
    vus.add(b)
    if (b === 0) nuls++
    else { nonNuls++; encreTotale += popcount(b) }
  }
  const partNuls = nuls / buf.length
  const encreMoy = nonNuls ? encreTotale / nonNuls : 0
  if (partNuls < 0.15 || partNuls > 0.7) return 0
  if (encreMoy < 1.8 || encreMoy > 5.5) return 0
  if (vus.size < 20) return 0
  return partNuls * (6 - encreMoy)
}

console.log('=== DÉCOMPRESSION DES BLOCS LZ77 ET RECHERCHE DE POLICE ===')
const candidats = []
let decompresses = 0
for (let i = 0; i < rom.length - 4; i += 4) {
  if (rom[i] !== 0x10) continue
  const out = delz(rom, i)
  if (!out) continue
  decompresses++
  const n = noteFonte(out)
  if (n > 0) candidats.push({ pos: i, taille: out.length, note: n, data: out })
}
console.log('Blocs LZ77 valides décompressés : ' + decompresses)
console.log('Dont ressemblant à une police   : ' + candidats.length)

candidats.sort((a, b) => b.note - a.note)
const retenus = candidats.slice(0, 8)
for (const c of retenus) {
  console.log('  0x' + c.pos.toString(16).toUpperCase().padStart(6, '0') +
    '  → ' + String(c.taille).padStart(6) + ' octets décompressés' +
    '  = ' + (c.taille / 8) + ' glyphes 1bpp  (note ' + c.note.toFixed(2) + ')')
}

// --- Planche de contact ---
const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const bloc = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const co = Buffer.concat([Buffer.from(t, 'latin1'), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(co)); return Buffer.concat([l, co, c]) }
const png = (w, h, px) => {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8
  const br = Buffer.alloc(h * (w + 1))
  for (let y = 0; y < h; y++) { br[y * (w + 1)] = 0; px.copy(br, y * (w + 1) + 1, y * w, (y + 1) * w) }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ih), bloc('IDAT', deflateSync(br, { level: 9 })), bloc('IEND', Buffer.alloc(0))])
}

const COLS = 16, ZOOM = 3, MARGE = 8
const hauteurs = retenus.map((c) => Math.ceil(Math.min(c.taille / 8, 128) / COLS) * 8 * ZOOM + MARGE)
const largeur = COLS * 8 * ZOOM
const hauteur = hauteurs.reduce((a, x) => a + x, 0)
const px = Buffer.alloc(largeur * hauteur, 60)
let y0 = 0
for (let iz = 0; iz < retenus.length; iz++) {
  const d = retenus[iz].data
  const nb = Math.min(retenus[iz].taille / 8, 128)
  for (let g = 0; g < nb; g++) {
    const gx = (g % COLS) * 8, gy = ((g / COLS) | 0) * 8
    for (let l = 0; l < 8; l++) {
      const octet = d[g * 8 + l]
      for (let b = 0; b < 8; b++) {
        const on = (octet >> (7 - b)) & 1
        for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
          const x = (gx + b) * ZOOM + zx, y = y0 + (gy + l) * ZOOM + zy
          if (x < largeur && y < hauteur) px[y * largeur + x] = on ? 255 : 0
        }
      }
    }
  }
  y0 += hauteurs[iz]
}
writeFileSync(process.argv[3], png(largeur, hauteur, px))
console.log('\nPlanche : ' + process.argv[3] + ' (' + largeur + '×' + hauteur + ')')
