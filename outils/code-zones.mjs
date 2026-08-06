// Où est le CODE dans les 8 Mio ? Sans le savoir, toute recherche de motif
// d'instructions se noie dans les données qui disassemblent « par hasard ».
//
// Marqueur retenu : un prologue de fonction THUMB `PUSH {..., lr}` (0xB5xx)
// suivi, dans les 0x400 octets, d'un `POP {..., pc}` (0xBDxx). C'est une
// signature que les données produisent rarement en série.
//
// Usage : node outils/code-zones.mjs <rom.gba>

import { readFileSync } from 'node:fs'
const rom = readFileSync(process.argv[2])
const hex = (n, l = 6) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(l, '0')

const BLOC = 0x1000
const n = Math.ceil(rom.length / BLOC)
const scores = new Uint16Array(n)
for (let o = 0; o + 2 <= rom.length; o += 2) {
  const hw = rom.readUInt16LE(o)
  if ((hw & 0xff00) === 0xb500 || (hw & 0xff00) === 0xbd00) scores[(o / BLOC) | 0]++
}
// zones : blocs consécutifs avec au moins 4 prologues/épilogues par 4 Kio
const zones = []
for (let i = 0; i < n; i++) {
  if (scores[i] >= 4) {
    const d = zones[zones.length - 1]
    if (d && i - d.fin <= 2) d.fin = i
    else zones.push({ deb: i, fin: i })
  }
}
let total = 0
console.log('=== ZONES DE CODE THUMB PROBABLE (prologues/épilogues par 4 Kio) ===')
for (const z of zones) {
  const taille = (z.fin - z.deb + 1) * BLOC
  if (taille < 0x4000) continue
  let s = 0; for (let i = z.deb; i <= z.fin; i++) s += scores[i]
  total += taille
  console.log('  ' + hex(z.deb * BLOC) + ' .. ' + hex((z.fin + 1) * BLOC) + '   ' + (taille / 1024).toFixed(0).padStart(5) + ' Kio   ' +
    s + ' marqueurs (' + (s / (taille / BLOC)).toFixed(1) + '/bloc)')
}
console.log('\ntotal retenu : ' + (total / 1024).toFixed(0) + ' Kio')
