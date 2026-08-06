// Recherche de la TABLE DE LARGEURS de la police à chasse variable.
//
// Les quatre tentatives précédentes cherchaient les DESSINS. Elles ont échoué
// parce que l'indice du glyphe n'est pas la valeur de table. Mais une police à
// chasse variable a forcément une seconde structure : un octet de largeur par
// caractère, indexé — lui — par la valeur de table, puisque c'est ce que le moteur
// lit pour avancer le curseur.
//
// Signature attendue, à l'adresse `base` :
//   base+0x00  largeur de l'espace   (petite, mais non nulle)
//   base+0x01..0x1A  A..Z            (4 à 8 pixels)
//   base+0x09  'I'  plus étroit que  base+0x0D 'M' et base+0x17 'W'
//   base+0x1B..0x34  a..z            (idem, souvent un peu plus étroites)
//   base+0x22  'h'  plus étroit que  base+0x2C 'r' ? non — 'l' (0x26) est le plus fin
import { readFileSync } from 'node:fs'

const rom = readFileSync(process.argv[2])
const NB = 0x4b // on couvre jusqu'à la ponctuation connue

console.log('=== RECHERCHE DE LA TABLE DE LARGEURS ===\n')
const trouves = []

for (let base = 0; base + NB < rom.length; base++) {
  // Toutes les largeurs doivent être plausibles : 1 à 12 pixels sur un écran GBA.
  let plausible = true
  for (let i = 0; i < NB; i++) {
    const l = rom[base + i]
    if (l < 1 || l > 12) { plausible = false; break }
  }
  if (!plausible) continue

  const A = base + 0x01
  const I = rom[A + 8], M = rom[A + 12], W = rom[A + 22]
  const i = rom[base + 0x1b + 8], m = rom[base + 0x1b + 12], w = rom[base + 0x1b + 22]
  const l = rom[base + 0x1b + 11] // 'l'

  // Les rapports de largeur qui tiennent dans toute police latine.
  if (!(I < M && I < W)) continue
  if (!(i < m && i < w)) continue
  if (!(l <= i + 1)) continue
  if (!(i < rom[base + 0x1b + 0])) continue // 'i' plus fin que 'a'

  // Une table de largeurs a peu de valeurs distinctes (typiquement 3 à 8).
  const distinctes = new Set()
  for (let k = 0; k < NB; k++) distinctes.add(rom[base + k])
  if (distinctes.size < 2 || distinctes.size > 9) continue

  trouves.push({ base, I, M, W, i, m, w, l, distinctes: distinctes.size })
}

console.log('Correspondances : ' + trouves.length + '\n')
for (const t of trouves.slice(0, 30)) {
  const largeurs = []
  for (let k = 0; k < 0x35; k++) largeurs.push(rom[t.base + k])
  console.log('0x' + t.base.toString(16).toUpperCase().padStart(6, '0') +
    '  espace=' + rom[t.base] +
    '  I=' + t.I + ' M=' + t.M + ' W=' + t.W +
    '  i=' + t.i + ' l=' + t.l + ' m=' + t.m + ' w=' + t.w +
    '  (' + t.distinctes + ' valeurs distinctes)')
  console.log('    A..Z : ' + largeurs.slice(0x01, 0x1b).join(' '))
  console.log('    a..z : ' + largeurs.slice(0x1b, 0x35).join(' '))
}
