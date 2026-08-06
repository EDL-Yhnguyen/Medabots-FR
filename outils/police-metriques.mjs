// Métriques verticales de la police : que signifie le 2e octet de la table de
// chasse ? On mesure l'étendue verticale réelle de chaque glyphe et on la
// confronte à la classe déclarée.
//
// Usage : node outils/police-metriques.mjs <rom.gba>

import { readFileSync } from 'node:fs'
const rom = readFileSync(process.argv[2])
const DESSINS = 0x4bfc64, LARGEURS = 0x3b4e08

const NOM = { 0: 'esp' }
for (let i = 1; i <= 26; i++) NOM[i] = String.fromCharCode(64 + i)
for (let i = 0x1b; i <= 0x34; i++) NOM[i] = String.fromCharCode(97 + i - 0x1b)
for (let i = 0x35; i <= 0x3e; i++) NOM[i] = String.fromCharCode(48 + i - 0x35)
Object.assign(NOM, { 0x3f: '…', 0x40: '.', 0x41: ',', 0x42: "'", 0x43: '-', 0x44: '/', 0x45: ':', 0x46: '?', 0x47: '!', 0x48: '"', 0x49: '(', 0x4a: ')', 0x4b: '♥', 0x4c: '£', 0x4d: '&', 0x4e: '%' })

// ⚠ Le fond n'est PAS la couleur 0 mais la couleur 1 : un octet « vide » vaut
// 0x11. La police est anticrénelée, l'encre monte jusqu'à l'index 15.
const parClasse = new Map()
const couleurs = new Set()
for (let c = 1; c < 0x4f; c++) {
  let y0 = -1, y1 = -1
  for (let y = 0; y < 16; y++) {
    let v = 0
    for (let b = 0; b < 4; b++) {
      const o = rom[DESSINS + c * 64 + y * 4 + b]
      couleurs.add(o & 15); couleurs.add(o >> 4)
      if (o !== 0x11) v = 1
    }
    if (v !== 0) { if (y0 < 0) y0 = y; y1 = y }
  }
  const cl = rom[LARGEURS + c * 2 + 1]
  if (!parClasse.has(cl)) parClasse.set(cl, [])
  parClasse.get(cl).push({ nom: NOM[c] || '?', y0, y1 })
}
console.log('=== 2e octet de la table de chasse = classe verticale ===')
for (const cl of [...parClasse.keys()].sort()) {
  const l = parClasse.get(cl)
  const y0 = [...new Set(l.map((x) => x.y0))].sort((a, b) => a - b)
  const y1 = [...new Set(l.map((x) => x.y1))].sort((a, b) => a - b)
  console.log('\n  classe ' + cl + '  (' + l.length + ' glyphes)  lignes ' + y0.join('/') + ' → ' + y1.join('/'))
  console.log('    ' + l.map((x) => x.nom + '(' + x.y0 + '-' + x.y1 + ')').join(' '))
}
