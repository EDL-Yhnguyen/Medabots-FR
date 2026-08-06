// Localisation de la police de caractères et rendu en PNG pour inspection visuelle.
// Une police 1bpp GBA = 8 octets par glyphe (8x8, 1 bit par pixel).
import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])

// --- Écriture PNG minimale (niveaux de gris 8 bits) ---
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const bloc = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const corps = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(corps))
  return Buffer.concat([len, corps, c])
}
const png = (larg, haut, pixels) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(larg, 0); ihdr.writeUInt32BE(haut, 4)
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const brut = Buffer.alloc(haut * (larg + 1))
  for (let y = 0; y < haut; y++) {
    brut[y * (larg + 1)] = 0
    pixels.copy(brut, y * (larg + 1) + 1, y * larg, (y + 1) * larg)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut, { level: 9 })), bloc('IEND', Buffer.alloc(0)),
  ])
}

const popcount = (x) => { let n = 0; while (x) { n += x & 1; x >>= 1 } return n }

// --- Recherche : une fenêtre de 64 glyphes qui "ressemble" à une police ---
// Un glyphe de lettre a de l'encre, mais pas trop, et laisse du blanc.
console.log('=== CANDIDATS POLICE 1bpp (8 octets / glyphe) ===')
const scores = []
const parFenetre = 64, tailleFenetre = parFenetre * 8
for (let d = 0; d + tailleFenetre < rom.length; d += 8) {
  let bons = 0
  for (let g = 0; g < parFenetre; g++) {
    let encre = 0, videsHaut = 0
    for (let o = 0; o < 8; o++) {
      const b = rom[d + g * 8 + o]
      encre += popcount(b)
      if (o === 0 && b === 0) videsHaut++
    }
    // Une lettre 8x8 : entre 6 et 34 pixels allumés, et une ligne haute vide.
    if (encre >= 6 && encre <= 34 && videsHaut === 1) bons++
  }
  if (bons >= parFenetre * 0.85) scores.push([d, bons])
}
// On fusionne les fenêtres qui se chevauchent pour ne garder qu'un début par zone.
const zones = []
for (const [d, n] of scores) {
  const dernier = zones[zones.length - 1]
  if (dernier && d - dernier.deb < tailleFenetre) { dernier.fin = d + tailleFenetre; if (n > dernier.n) dernier.n = n }
  else zones.push({ deb: d, fin: d + tailleFenetre, n })
}
zones.sort((a, b) => (b.fin - b.deb) - (a.fin - a.deb))
const retenus = zones.slice(0, 8)
for (const z of retenus) {
  console.log('  0x' + z.deb.toString(16).toUpperCase().padStart(6, '0') + ' → 0x' + z.fin.toString(16).toUpperCase().padStart(6, '0') +
    '   (' + ((z.fin - z.deb) / 8) + ' glyphes)')
}

// --- Rendu : planche de contact des zones retenues ---
// 16 glyphes par ligne, 8 lignes par zone, agrandi 3x, zones empilées.
const COLS = 16, LIGNES = 8, ZOOM = 3
const largeur = COLS * 8 * ZOOM
const hauteurZone = LIGNES * 8 * ZOOM + 6
const hauteur = hauteurZone * retenus.length
const px = Buffer.alloc(largeur * hauteur, 40) // fond gris foncé

for (let iz = 0; iz < retenus.length; iz++) {
  const base = retenus[iz].deb
  const yZone = iz * hauteurZone
  for (let g = 0; g < COLS * LIGNES; g++) {
    const gx = (g % COLS) * 8, gy = ((g / COLS) | 0) * 8
    for (let l = 0; l < 8; l++) {
      const octet = rom[base + g * 8 + l]
      if (octet === undefined) continue
      for (let b = 0; b < 8; b++) {
        // bit de poids fort = pixel de gauche
        const allume = (octet >> (7 - b)) & 1
        for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
          const x = (gx + b) * ZOOM + zx
          const y = yZone + (gy + l) * ZOOM + zy
          if (x < largeur && y < hauteur) px[y * largeur + x] = allume ? 255 : 0
        }
      }
    }
  }
}
writeFileSync(process.argv[3], png(largeur, hauteur, px))
console.log('\nPlanche écrite : ' + process.argv[3] + '  (' + largeur + '×' + hauteur + ')')
console.log('Ordre des zones, de haut en bas : ' + retenus.map((z) => '0x' + z.deb.toString(16).toUpperCase()).join(', '))
