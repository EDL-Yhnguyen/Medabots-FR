// Qui charge tel mot du pool ? Et à quelle fonction cela appartient-il ?
//
// Usage :
//   node outils/code-refs.mjs <rom> pool <offsetHex>   → les LDR qui lisent ce pool
//   node outils/code-refs.mjs <rom> fonc <offsetHex>   → début de fonction contenant l'offset
//   node outils/code-refs.mjs <rom> appels <offsetHex> → les BL qui appellent cette adresse
//   node outils/code-refs.mjs <rom> ptr <valeurHex>    → les LDR Rd,=valeur (adresse ROM)

import { readFileSync } from 'node:fs'
const rom = readFileSync(process.argv[2])
const mode = process.argv[3]
const arg = parseInt(process.argv[4], 16)
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')
const BASE = 0x08000000

if (mode === 'pool' || mode === 'ptr') {
  const pools = new Set()
  if (mode === 'ptr') {
    for (let o = 0; o + 4 <= rom.length; o += 4) if (rom.readUInt32LE(o) === (arg >= BASE ? arg : arg + BASE) >>> 0) pools.add(o)
  } else pools.add(arg)
  for (const p of pools) {
    for (let o = Math.max(0, p - 1100); o < p; o += 2) {
      const hw = rom.readUInt16LE(o)
      if ((hw & 0xf800) !== 0x4800) continue
      if (((o + 4) & ~3) + (hw & 0xff) * 4 === p) console.log('LDR r' + ((hw >> 8) & 7) + ' @' + hex(o) + '   (pool ' + hex(p) + ' = ' + hex(rom.readUInt32LE(p), 8) + ')')
    }
  }
}

if (mode === 'fonc') {
  // remonte jusqu'au PUSH {..,lr} le plus proche non précédé d'un flux
  for (let o = arg; o > arg - 0x800 && o >= 0; o -= 2) {
    const hw = rom.readUInt16LE(o)
    if ((hw & 0xff00) === 0xb500) { console.log('début probable : ' + hex(o)); break }
  }
}

if (mode === 'appels') {
  const cible = arg
  for (let o = 0; o + 4 <= rom.length; o += 2) {
    const h1 = rom.readUInt16LE(o), h2 = rom.readUInt16LE(o + 2)
    if ((h1 & 0xf800) !== 0xf000 || (h2 & 0xf800) !== 0xf800) continue
    let hi = h1 & 0x7ff; if (hi & 0x400) hi -= 0x800
    if (o + 4 + (hi << 12) + ((h2 & 0x7ff) << 1) === cible) console.log('BL @' + hex(o))
  }
}
