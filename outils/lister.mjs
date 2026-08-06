// Liste les entrées d'une table avec la place disponible pour chacune.
//
// Sans repointage, une traduction doit tenir dans la place de l'original. Traduire
// sans connaître cette place, c'est écrire du texte qui sera refusé à l'insertion.
//
// Usage : node outils/lister.mjs <rom> <pointeurs.json> <adresse-table>
import { readFileSync } from 'node:fs'
import { TABLE, rendOctet } from './table-caracteres.mjs'
import { ciblesDeTable, placeEntree } from './entrees.mjs'

const rom = readFileSync(process.argv[2])
const tables = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const vise = process.argv[4].toUpperCase().replace('0X', '')
const BASE = 0x08000000

const t = tables.find((x) => x.adresse.toUpperCase().replace('0X', '') === vise)
if (!t) {
  console.error('Table introuvable : ' + process.argv[4])
  console.error('Disponibles : ' + tables.map((x) => x.adresse).join(', '))
  process.exit(1)
}

const debut = parseInt(t.adresse, 16)
const cibles = ciblesDeTable(rom, debut, t.entrees, BASE)

console.log('Table ' + t.adresse + ' — ' + t.entrees + ' entrées\n')
console.log('  n°   place   texte')
console.log('  ' + '─'.repeat(70))

for (let k = 0; k < t.entrees; k++) {
  const place = placeEntree(rom, cibles, k)
  let texte = ''
  for (let i = cibles[k]; i < cibles[k] + place && i < rom.length; i++) {
    texte += TABLE[rom[i]] !== null ? TABLE[rom[i]] : rendOctet(rom[i])
  }
  console.log(
    '  ' + String(k).padStart(3) + '  ' + String(place).padStart(5) + '   ' + texte.slice(0, 62),
  )
}
