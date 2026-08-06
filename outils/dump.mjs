// Décodage du texte avec la table déduite, et repérage des banques de texte.
import { readFileSync } from 'node:fs'
const rom = readFileSync(process.argv[2])

// Table déduite par recherche relative : A-Z = 0x01-0x1A, a-z = 0x1B-0x34.
// Le reste est inconnu pour l'instant : on l'affiche entre crochets pour l'identifier
// par le contexte (c'est comme ça qu'on complète une table, pas en devinant).
const table = new Array(256).fill(null)
for (let i = 0; i < 26; i++) {
  table[0x01 + i] = String.fromCharCode(65 + i) // A..Z
  table[0x1b + i] = String.fromCharCode(97 + i) // a..z
}

const decode = (deb, lon) => {
  let s = ''
  for (let i = deb; i < deb + lon && i < rom.length; i++) {
    const c = rom[i]
    s += table[c] !== null ? table[c] : '[' + c.toString(16).toUpperCase().padStart(2, '0') + ']'
  }
  return s
}

console.log('=== ÉCHANTILLONS AUTOUR DES OCCURRENCES TROUVÉES ===')
for (const p of [0x3b53d2, 0x3acb61, 0x41018f, 0x43108b, 0x483d1e, 0x452708, 0x3b528a]) {
  console.log('\n-- 0x' + p.toString(16).toUpperCase() + ' --')
  console.log(decode(Math.max(0, p - 24), 120))
}

// Quels octets non-lettres reviennent le plus dans les zones de texte ?
// Ce sont eux qui portent l'espace, la ponctuation et les codes de contrôle.
console.log('\n=== OCTETS NON-LETTRES LES PLUS FRÉQUENTS EN ZONE DE TEXTE ===')
const compte = new Uint32Array(256)
for (let i = 0x3a0000; i < 0x4a0000; i++) if (table[rom[i]] === null) compte[rom[i]]++
const top = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24)
for (const [v, n] of top) {
  console.log('  0x' + v.toString(16).toUpperCase().padStart(2, '0') + '  ×' + n)
}

// Où commence et où finit la zone de texte ? On mesure, par tranche de 4 Kio,
// la proportion d'octets qui tombent dans la plage des lettres.
console.log('\n=== CARTOGRAPHIE DES BANQUES DE TEXTE (tranches de 4 Kio, > 45 % de lettres) ===')
const pas = 0x1000
const zones = []
for (let d = 0; d < rom.length; d += pas) {
  let lettres = 0
  const fin = Math.min(d + pas, rom.length)
  for (let i = d; i < fin; i++) if (table[rom[i]] !== null) lettres++
  const part = lettres / (fin - d)
  if (part > 0.45) zones.push([d, part])
}
// On fusionne les tranches contiguës pour afficher des blocs lisibles.
const blocs = []
for (const [d, part] of zones) {
  const dernier = blocs[blocs.length - 1]
  if (dernier && d === dernier.fin) { dernier.fin = d + pas; dernier.parts.push(part) }
  else blocs.push({ deb: d, fin: d + pas, parts: [part] })
}
for (const b of blocs) {
  const moy = (b.parts.reduce((a, x) => a + x, 0) / b.parts.length) * 100
  console.log('  0x' + b.deb.toString(16).toUpperCase().padStart(6, '0') + ' → 0x' + b.fin.toString(16).toUpperCase().padStart(6, '0') +
    '   (' + (((b.fin - b.deb) / 1024) | 0) + ' Kio, ' + moy.toFixed(0) + ' % de lettres)')
}
console.log('  Total : ' + blocs.length + ' bloc(s), ' +
  ((blocs.reduce((a, b) => a + b.fin - b.deb, 0) / 1024) | 0) + ' Kio de texte brut')
