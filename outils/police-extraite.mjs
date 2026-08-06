// La police, localisée PAR LE CODE (voir docs/format.md § 4).
//
// Etabli par désassemblage du moteur de texte (0x040000-0x041200) :
//   0x0400F0  LDRB r2,[r0,#0]        ; r2 = octet du texte, tel quel
//   0x040106  LSL  r1,r2,#1          ; ×2 → table de largeurs
//   0x040150  LSL  r0,r2,#6          ; ×64 → dessin du glyphe
//   0x040152  LDR  r1,=0x084BFC64    ; base police 0
//   0x04015A  BL   0x07CCC4          ; SWI 0x0B CpuSet, r2=32 demi-mots = 64 o
//
// Donc : 4bpp, 8×16 pixels, 64 octets par glyphe, INDEXE PAR LA VALEUR DE TABLE.
// Le glyphe est ensuite décalé de largeur×4 bits et OR-é dans une tuile
// (0x0401AC-0x0401C4) : c'est la chasse variable.
//
// Usage : node outils/police-extraite.mjs <rom.gba> [travail/police.png]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const rom = readFileSync(process.argv[2])
const SORTIE = process.argv[3] || 'travail/police.png'

export const POLICES = [
  { nom: 'police 0 (dialogues)', dessins: 0x4bfc64, largeurs: 0x3b4e08 },
  { nom: 'police 1 (variante)', dessins: 0x4c59a4, largeurs: 0x3b5008 },
]
export const LARG = 8, HAUT = 16, OCTETS = 64, NGLYPHES = 0x4f

// --- PNG minimal, palette de gris (repris de outils/police.mjs) -------------
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
const png = (larg, haut, px) => {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(larg, 0); ihdr.writeUInt32BE(haut, 4)
  ihdr[8] = 8; ihdr[9] = 0
  const brut = Buffer.alloc(haut * (larg + 1))
  for (let y = 0; y < haut; y++) { brut[y * (larg + 1)] = 0; px.copy(brut, y * (larg + 1) + 1, y * larg, (y + 1) * larg) }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut, { level: 9 })), bloc('IEND', Buffer.alloc(0)),
  ])
}

// --- Lecture d'un glyphe : 4bpp GBA, quartet bas = pixel de gauche ----------
export const glyphe = (base, i) => {
  const p = new Uint8Array(LARG * HAUT)
  for (let y = 0; y < HAUT; y++) {
    for (let x = 0; x < LARG; x++) {
      const o = base + i * OCTETS + y * 4 + (x >> 1)
      p[y * LARG + x] = (x & 1) ? (rom[o] >> 4) & 15 : rom[o] & 15
    }
  }
  return p
}

// --- Table de caractères pour l'étiquetage ---------------------------------
const NOM = { 0: 'esp' }
for (let i = 1; i <= 26; i++) NOM[i] = String.fromCharCode(64 + i)
for (let i = 0x1b; i <= 0x34; i++) NOM[i] = String.fromCharCode(97 + i - 0x1b)
for (let i = 0x35; i <= 0x3e; i++) NOM[i] = String.fromCharCode(48 + i - 0x35)
Object.assign(NOM, { 0x3f: '...', 0x40: '.', 0x41: ',', 0x42: "'", 0x43: '-', 0x44: '/', 0x45: ':', 0x46: '?', 0x47: '!', 0x48: '"', 0x49: '(', 0x4a: ')' })

// --- Rendu texte (vérification immédiate, sans ouvrir d'image) -------------
if (process.argv.includes('--ascii')) {
  const pol = POLICES[0]
  for (const c of [0x01, 0x09, 0x0d, 0x17, 0x28, 0x40, 0x41, 0x2c]) {
    const g = glyphe(pol.dessins, c)
    console.log('\n' + (NOM[c] || '?') + '  (0x' + c.toString(16) + ')  largeur=' + rom[pol.largeurs + c * 2] + ' classe=' + rom[pol.largeurs + c * 2 + 1])
    for (let y = 0; y < HAUT; y++) {
      let l = '  '
      for (let x = 0; x < LARG; x++) l += ' .:-=+*#%@$&XW'[Math.min(13, g[y * LARG + x])] || '?'
      console.log(l)
    }
  }
  process.exit(0)
}

// --- Planche de contact PNG ------------------------------------------------
const COLS = 16, ZOOM = 4, MARGE = 2
const cellW = (LARG + MARGE) * ZOOM, cellH = (HAUT + MARGE) * ZOOM
const lignes = Math.ceil(NGLYPHES / COLS)
const largeur = COLS * cellW
const hauteurPol = lignes * cellH + 8
const hauteur = hauteurPol * POLICES.length
const px = Buffer.alloc(largeur * hauteur, 60)

for (let ip = 0; ip < POLICES.length; ip++) {
  const pol = POLICES[ip]
  for (let i = 0; i < NGLYPHES; i++) {
    const g = glyphe(pol.dessins, i)
    const cx = (i % COLS) * cellW, cy = ip * hauteurPol + ((i / COLS) | 0) * cellH
    for (let y = 0; y < HAUT; y++) for (let x = 0; x < LARG; x++) {
      const v = g[y * LARG + x] === 0 ? 0 : 90 + g[y * LARG + x] * 11
      for (let zy = 0; zy < ZOOM; zy++) for (let zx = 0; zx < ZOOM; zx++) {
        const px_ = cx + x * ZOOM + zx, py = cy + y * ZOOM + zy
        if (px_ < largeur && py < hauteur) px[py * largeur + px_] = v
      }
    }
    // trait vertical à la largeur déclarée : vérifie la table de chasse
    const w = rom[pol.largeurs + i * 2]
    if (w > 0 && w <= LARG) for (let y = 0; y < HAUT * ZOOM; y++) {
      const px_ = cx + w * ZOOM, py = cy + y
      if (px_ < largeur && py < hauteur) px[py * largeur + px_] = 200
    }
  }
}
mkdirSync('travail', { recursive: true })
writeFileSync(SORTIE, png(largeur, hauteur, px))
console.log('Planche : ' + SORTIE + '  (' + largeur + '×' + hauteur + ')')
console.log('Haut : ' + POLICES[0].nom + ' — bas : ' + POLICES[1].nom)
console.log('Le trait clair marque la largeur déclarée dans la table de chasse.')
