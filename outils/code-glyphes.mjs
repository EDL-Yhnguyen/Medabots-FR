// Le motif « indice → adresse de glyphe ».
//
// Une police se lit toujours de la même façon : on prend un indice, on le
// multiplie par la taille d'un glyphe, on ajoute la base.
//   THUMB :  LSL Ra,Rb,#k        (k = 3 → 8 o/glyphe, 4 → 16, 5 → 32, 6 → 64)
//            ...
//            LDR Rc,=0x08xxxxxx  (base, depuis un pool littéral)
//            ADD Ra,Ra,Rc   /   ADD Ra,Rc,Ra   /   ADD Rd,Ra,Rc
//
// On cherche, dans les seules zones de CODE (0x000000-0x080000, établi par
// outils/code-zones.mjs), toute fenêtre où un LSL #3..#6 et un ADD avec un
// registre chargé depuis un pool ROM se rencontrent. La sortie est l'ensemble
// des bases de tableaux à élément de taille 2^k — la police en fait partie.
//
// Usage : node outils/code-glyphes.mjs <rom.gba> [debCode] [finCode]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const rom = readFileSync(process.argv[2])
const BASE = 0x08000000
const DEB = parseInt(process.argv[3] || '0', 16)
const FIN = parseInt(process.argv[4] || '80000', 16)
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')

const FENETRE = 20 // instructions

// Table des LDR PC-relatifs → valeur ROM chargée, par offset d'instruction
const ldrRom = new Map()
for (let o = DEB; o + 2 <= FIN; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xf800) !== 0x4800) continue
  const pool = ((o + 4) & ~3) + (hw & 0xff) * 4
  if (pool + 4 > rom.length) continue
  const v = rom.readUInt32LE(pool)
  if (v < BASE || v >= BASE + rom.length) continue
  ldrRom.set(o, { rd: (hw >> 8) & 7, cible: v - BASE })
}

// Parcours : pour chaque LSL Ra,Rb,#k (k 3..6), on regarde ±FENETRE
const trouves = new Map() // cible → Set de {instr, k}
for (let o = DEB; o + 2 <= FIN; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xf800) !== 0x0000) continue // LSL Rd,Rs,#n
  const k = (hw >> 6) & 0x1f
  if (k < 3 || k > 6) continue
  const rd = hw & 7
  // cherche un ADD Rd,Rx,Ry (format 1 registre : 0001100 Ry Rx Rd) impliquant rd
  for (let i = -FENETRE; i <= FENETRE; i++) {
    const p = o + i * 2
    if (p < DEB || p + 2 > FIN || i === 0) continue
    const h2 = rom.readUInt16LE(p)
    if ((h2 & 0xfe00) !== 0x1800) continue // ADD Rd,Rs,Rn (registre)
    const ard = h2 & 7, ars = (h2 >> 3) & 7, arn = (h2 >> 6) & 7
    if (ars !== rd && arn !== rd) continue
    const autre = ars === rd ? arn : ars
    // ce registre « autre » a-t-il été chargé d'un pool ROM juste avant ?
    for (let j = 1; j <= FENETRE; j++) {
      const q = p - j * 2
      if (q < DEB) break
      const e = ldrRom.get(q)
      if (!e) continue
      if (e.rd !== autre) continue
      let l = trouves.get(e.cible)
      if (!l) trouves.set(e.cible, (l = []))
      l.push({ lsl: o, add: p, ldr: q, k, rd: ard })
      break
    }
  }
}

const res = [...trouves.entries()].map(([cible, occ]) => ({ cible, occ })).sort((a, b) => a.cible - b.cible)
mkdirSync('travail', { recursive: true })
writeFileSync('travail/code-glyphes.json', JSON.stringify(res, null, 1))

console.log('=== BASES DE TABLEAUX A ELEMENT 2^k, VUES DANS LE CODE ===')
console.log('code analysé : ' + hex(DEB) + '..' + hex(FIN))
console.log(res.length + ' bases distinctes\n')

// Caractérisation graphique de chaque base : une police 1bpp a une signature
// nette — beaucoup d'octets 0x00, peu d'octets 0xFF, et une distribution
// d'encre entre 10 % et 45 %.
const popcount = (x) => { let n = 0; while (x) { n += x & 1; x >>>= 1 } return n }
const profil = (off, n) => {
  let encre = 0, zeros = 0, uns = 0
  for (let i = 0; i < n; i++) { const b = rom[off + i]; if (b === undefined) return null; encre += popcount(b); if (b === 0) zeros++; if (b === 0xff) uns++ }
  return { encre: encre / (n * 8), zeros: zeros / n, uns: uns / n }
}

for (const r of res) {
  const ks = [...new Set(r.occ.map((o) => o.k))].sort()
  const p = profil(r.cible, 1024)
  const apercu = [...rom.subarray(r.cible, r.cible + 16)].map((b) => b.toString(16).padStart(2, '0')).join(' ')
  console.log('  ' + hex(r.cible) + '  k=' + ks.join(',') + '  ×' + r.occ.length +
    (p ? '  encre=' + (p.encre * 100).toFixed(0).padStart(2) + '% zéros=' + (p.zeros * 100).toFixed(0).padStart(2) + '% FF=' + (p.uns * 100).toFixed(0).padStart(2) + '%' : '') +
    '  @' + hex(r.occ[0].ldr) + '  ' + apercu)
}
