// Recherche de la police PAR LE CODE, pas par les données.
//
// Principe : toute routine qui dessine des glyphes finit par écrire dans la VRAM
// (0x06000000-0x06017FFF). Une adresse de VRAM ne s'obtient pas en THUMB par un
// immédiat : elle est chargée depuis un pool littéral par `LDR Rd, [PC, #imm]`.
// Donc :
//   1. on repère tous les mots alignés de la ROM valant une adresse de VRAM ;
//   2. on ne garde que ceux qui sont VRAIMENT chargés par une instruction
//      (THUMB `LDR Rd,[PC,#imm8*4]` ou ARM `LDR Rd,[PC,#imm12]`) ;
//   3. on dumpe le pool littéral entier autour : les pointeurs ROM (0x08xxxxxx)
//      qui y voisinent sont les candidats « adresse de la police ».
//
// Usage : node outils/code-vram.mjs <rom.gba> [> travail/code-vram.txt]

import { readFileSync } from 'node:fs'

const rom = readFileSync(process.argv[2])
const BASE = 0x08000000
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')

const VRAM_DEB = 0x06000000, VRAM_FIN = 0x06018000
const PAL_DEB = 0x05000000, PAL_FIN = 0x05000400
const OAM_DEB = 0x07000000, OAM_FIN = 0x07000400

const estVram = (w) => w >= VRAM_DEB && w < VRAM_FIN
const estRom = (w) => w >= BASE && w < BASE + rom.length
const estIwram = (w) => w >= 0x03000000 && w < 0x03008000
const estEwram = (w) => w >= 0x02000000 && w < 0x02040000
const estIo = (w) => w >= 0x04000000 && w < 0x04000400

// --- Index des chargements PC-relatifs -------------------------------------
// THUMB : 01001 Rd imm8   → 0x4800..0x4FFF ; cible = ((pc+4) & ~3) + imm8*4
// ARM   : E59F d imm12    → cible = pc + 8 + imm12   (LDR Rd,[PC,#imm])
//
// On construit une carte : offset-cible → liste des offsets d'instruction.
const charges = new Map()
const ajoute = (cible, src, mode) => {
  if (cible < 0 || cible + 4 > rom.length) return
  let l = charges.get(cible)
  if (!l) charges.set(cible, (l = []))
  l.push({ src, mode })
}

for (let o = 0; o + 2 <= rom.length; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xf800) === 0x4800) {
    const cible = ((o + 4) & ~3) + (hw & 0xff) * 4
    ajoute(cible, o, 'T')
  }
}
for (let o = 0; o + 4 <= rom.length; o += 4) {
  const w = rom.readUInt32LE(o)
  if ((w & 0x0fff0000) === 0x059f0000 && (w & 0xf0000000) === 0xe0000000) {
    // E59Fd imm12 : LDR Rd,[PC,#+imm12]
    ajoute(o + 8 + (w & 0xfff), o, 'A')
  }
}

// --- Mots de VRAM réellement chargés par du code ---------------------------
const trouves = []
for (let o = 0; o + 4 <= rom.length; o += 4) {
  const w = rom.readUInt32LE(o)
  if (!estVram(w)) continue
  const refs = charges.get(o)
  if (!refs || refs.length === 0) continue
  trouves.push({ off: o, val: w, refs })
}

console.log('=== MOTS DE VRAM CHARGES PAR DU CODE ===')
console.log('total mots VRAM alignés : ' + (() => { let n = 0; for (let o = 0; o + 4 <= rom.length; o += 4) if (estVram(rom.readUInt32LE(o))) n++; return n })())
console.log('dont réellement référencés par un LDR PC-relatif : ' + trouves.length)
console.log('')

// Regroupement en « pools » : mots référencés proches les uns des autres.
const pools = []
for (const t of trouves) {
  const dernier = pools[pools.length - 1]
  if (dernier && t.off - dernier.fin <= 0x100) { dernier.fin = t.off; dernier.membres.push(t) }
  else pools.push({ deb: t.off, fin: t.off, membres: [t] })
}
console.log('regroupés en ' + pools.length + ' zones de code\n')

// --- Pour chaque zone : dumper le pool littéral complet --------------------
// Un pool littéral = suite de mots alignés tous « chargés » par une instruction
// proche. On étend de part et d'autre tant que les mots sont référencés.
const etendPool = (deb, fin) => {
  let d = deb, f = fin
  while (d - 4 >= 0 && charges.has(d - 4)) d -= 4
  while (f + 4 + 4 <= rom.length && charges.has(f + 4)) f += 4
  return [d, f]
}

const classe = (w) => {
  if (estVram(w)) return 'VRAM'
  if (estRom(w)) return 'ROM ' + hex(w - BASE)
  if (estIwram(w)) return 'IWRAM'
  if (estEwram(w)) return 'EWRAM'
  if (estIo(w)) return 'IO'
  if (w >= PAL_DEB && w < PAL_FIN) return 'PALETTE'
  if (w >= OAM_DEB && w < OAM_FIN) return 'OAM'
  return ''
}

const candidatsRom = new Map() // offset ROM pointé → nb d'apparitions dans un pool VRAM

for (const p of pools) {
  const [d, f] = etendPool(p.deb, p.fin)
  console.log('--- zone ' + hex(p.deb) + '  (pool ' + hex(d) + '..' + hex(f + 3) + ', ' + ((f - d) / 4 + 1) + ' mots)')
  for (let o = d; o <= f; o += 4) {
    const w = rom.readUInt32LE(o)
    const c = classe(w)
    const refs = charges.get(o) || []
    const marque = c === 'VRAM' ? ' <<< VRAM' : ''
    console.log('    ' + hex(o) + '  ' + hex(w, 8) + '  ' + (c || '?').padEnd(14) +
      ' refs=' + refs.length + (refs[0] ? ' @' + hex(refs[0].src) + refs[0].mode : '') + marque)
    if (estRom(w)) {
      const t = w - BASE
      candidatsRom.set(t, (candidatsRom.get(t) || 0) + 1)
    }
  }
  console.log('')
}

console.log('=== POINTEURS ROM VOISINANT UNE ADRESSE DE VRAM ===')
const tri = [...candidatsRom.entries()].sort((a, b) => a[0] - b[0])
console.log(tri.length + ' cibles distinctes')
for (const [t, n] of tri) {
  const apercu = [...rom.subarray(t, t + 16)].map((b) => b.toString(16).padStart(2, '0')).join(' ')
  console.log('  ' + hex(t) + ' x' + n + '  ' + apercu)
}
