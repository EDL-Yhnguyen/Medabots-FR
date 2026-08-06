// Recherche relative : retrouver la table de caractères d'une ROM dont le texte
// n'est pas en ASCII. Principe : dans presque toutes les tables, les lettres se
// suivent (a, b, c...). Donc les ÉCARTS entre octets d'un mot encodé sont les
// mêmes que les écarts entre les lettres de ce mot en clair.
import { readFileSync } from 'node:fs'

const rom = readFileSync(process.argv[2])

// Mots choisis pour être longs, tout en minuscules (le mélange majuscule/minuscule
// casse la méthode car les deux casses ont des bases différentes) et propres au jeu.
const cibles = [
  'obattle', 'edabot', 'edabots', 'edalist', 'inpet',
  'attle', 'edal', 'obot', 'rena', 'ission',
  'eaded', 'egend', 'ilver', 'creen', 'ption',
]

const ecarts = (mot) => {
  const d = []
  for (let i = 1; i < mot.length; i++) d.push(mot.charCodeAt(i) - mot.charCodeAt(i - 1))
  return d
}

console.log('=== RECHERCHE RELATIVE ===')
const bases = new Map() // base déduite -> nombre de fois trouvée

for (const mot of cibles) {
  const d = ecarts(mot)
  const trouves = []
  for (let i = 0; i < rom.length - mot.length; i++) {
    let ok = true
    for (let k = 0; k < d.length; k++) {
      if (rom[i + k + 1] - rom[i + k] !== d[k]) { ok = false; break }
    }
    if (ok) {
      // On ignore les suites d'octets nuls ou aberrantes.
      if (d.every((x) => x === 0)) continue
      trouves.push(i)
      const base = rom[i] - mot.charCodeAt(0) // décalage table -> ASCII
      bases.set(base, (bases.get(base) || 0) + 1)
    }
  }
  if (trouves.length) {
    const ex = trouves.slice(0, 5).map((p) => '0x' + p.toString(16).toUpperCase())
    console.log('  "' + mot + '"'.padEnd(12) + ' → ' + trouves.length + ' occurrence(s) : ' + ex.join(', '))
  }
}

console.log('\n  Décalages candidats (octet_table - code_ASCII), les plus fréquents :')
const classes = [...bases.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
for (const [base, n] of classes) {
  const b = ((base % 256) + 256) % 256
  console.log('    décalage ' + String(base).padStart(5) + ' (0x' + b.toString(16).toUpperCase().padStart(2, '0') + ')  →  ' + n + ' correspondance(s)')
}

console.log('\n=== BLOCS COMPRESSÉS LZ77 (format BIOS Nintendo) ===')
// En-tête LZ77 : octet 0x10, puis 3 octets de taille décompressée (little-endian).
// Un bloc plausible fait entre 32 octets et 64 Kio une fois décompressé.
let lz = 0
const exemplesLz = []
for (let i = 0; i < rom.length - 4; i += 4) { // les blocs sont alignés sur 4 octets
  if (rom[i] !== 0x10) continue
  const taille = rom[i + 1] | (rom[i + 2] << 8) | (rom[i + 3] << 16)
  if (taille >= 32 && taille <= 0x10000) {
    lz++
    if (exemplesLz.length < 12) exemplesLz.push([i, taille])
  }
}
console.log('  Blocs LZ77 plausibles : ' + lz)
for (const [p, t] of exemplesLz) {
  console.log('    0x' + p.toString(16).toUpperCase().padStart(6, '0') + '  → ' + t + ' octets décompressés')
}

console.log('\n=== HISTOGRAMME DES OCTETS (zones de texte probables) ===')
// Du texte encodé occupe une plage d'octets étroite et très répétitive.
// On découpe la ROM en tranches de 64 Kio et on mesure la diversité de chaque tranche.
const tranche = 0x10000
console.log('  tranche        octets distincts   octet dominant   part du dominant')
for (let d = 0; d < rom.length; d += tranche) {
  const compte = new Uint32Array(256)
  const fin = Math.min(d + tranche, rom.length)
  for (let i = d; i < fin; i++) compte[rom[i]]++
  let distincts = 0, max = 0, dom = 0
  for (let v = 0; v < 256; v++) {
    if (compte[v]) distincts++
    if (compte[v] > max) { max = compte[v]; dom = v }
  }
  const part = ((max / (fin - d)) * 100).toFixed(1)
  // On ne montre que les tranches "suspectes" : peu de valeurs distinctes = données structurées.
  if (distincts < 140) {
    console.log('  0x' + d.toString(16).toUpperCase().padStart(6, '0') + '        ' +
      String(distincts).padStart(3) + '              0x' + dom.toString(16).toUpperCase().padStart(2, '0') +
      '             ' + part + ' %')
  }
}
