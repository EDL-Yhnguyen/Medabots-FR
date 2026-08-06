// Extraction du script, table par table.
//
// Chaque entrée est délimitée par le pointeur SUIVANT, pas par un octet de fin :
// c'est sans perte, et ça n'exige pas de connaître tous les codes de contrôle.
// Les tables étant triées par adresse croissante, l'entrée i occupe
// [cible(i), cible(i+1)).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { TABLE as table, rendOctet as rendu } from './table-caracteres.mjs'

const rom = readFileSync(process.argv[2])
const tables = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const dossier = process.argv[4]
const BASE = 0x08000000

const inconnus = new Map() // octet -> exemples de contexte

function decodeEntree(deb, fin) {
  let s = ''
  for (let i = deb; i < fin && i < rom.length; i++) {
    const c = rom[i]
    if (table[c] === null) {
      if (!inconnus.has(c)) inconnus.set(c, [])
      const liste = inconnus.get(c)
      if (liste.length < 6) {
        // Contexte : ce qui précède et ce qui suit, en clair.
        const avant = []
        for (let k = Math.max(deb, i - 22); k < i; k++) avant.push(rendu(rom[k]))
        const apres = []
        for (let k = i + 1; k < Math.min(fin, i + 23); k++) apres.push(rendu(rom[k]))
        liste.push(avant.join('') + ' ⟦' + c.toString(16).toUpperCase().padStart(2, '0') + '⟧ ' + apres.join(''))
      }
    }
    s += rendu(c)
  }
  return s
}

mkdirSync(dossier, { recursive: true })

// Purger les .txt d'une extraction précédente. Sans ça, une table écartée depuis
// ou un fichier produit avec une ancienne table de caractères survit et se fait
// relire à la réinsertion. C'est exactement ce qui a fait échouer le premier test
// d'identité : 49 fichiers relus pour 21 tables extraites.
const restes = readdirSync(dossier).filter((f) => f.endsWith('.txt'))
for (const f of restes) rmSync(dossier + '/' + f)
if (restes.length) console.log('Purge   : ' + restes.length + ' fichier(s) d’une extraction précédente')
if (!existsSync(dossier)) mkdirSync(dossier, { recursive: true })
let totalEntrees = 0
let totalOctets = 0
const index = []

for (const t of tables) {
  const debutTable = parseInt(t.adresse, 16)
  const cibles = []
  for (let k = 0; k < t.entrees; k++) cibles.push(rom.readUInt32LE(debutTable + k * 4) - BASE)

  const lignes = [
    '# Table ' + t.adresse + ' — ' + t.entrees + ' entrées',
    '# Ne PAS modifier les lignes @NNNN : elles portent le numéro d’entrée.',
    '# Les {XX} sont des octets non encore identifiés — les laisser tels quels.',
    '',
  ]
  let octetsTable = 0
  for (let k = 0; k < t.entrees; k++) {
    const deb = cibles[k]
    // Fin = prochaine cible strictement supérieure (les doublons pointent au même endroit).
    let fin = rom.length
    for (let j = k + 1; j < t.entrees; j++) {
      if (cibles[j] > deb) { fin = cibles[j]; break }
    }
    // Garde-fou : une entrée de plus de 2 Kio n'est pas du dialogue, c'est la fin de table.
    if (fin - deb > 2048) fin = deb + 2048
    const texte = decodeEntree(deb, fin)
    octetsTable += fin - deb
    lignes.push('@' + String(k).padStart(4, '0') + ' [0x' + deb.toString(16).toUpperCase() + ']')
    lignes.push(texte)
    lignes.push('')
  }
  writeFileSync(dossier + '/' + t.adresse.replace('0x', '') + '.txt', lignes.join('\n'), 'utf8')
  totalEntrees += t.entrees
  totalOctets += octetsTable
  index.push({ ...t, octets: octetsTable })
}

console.log('=== EXTRACTION ===')
console.log('Tables    : ' + tables.length)
console.log('Entrées   : ' + totalEntrees.toLocaleString('fr-FR'))
console.log('Octets    : ' + totalOctets.toLocaleString('fr-FR') + '  (' + Math.round(totalOctets / 1024) + ' Kio)')
console.log('Mots env. : ' + Math.round(totalOctets / 6).toLocaleString('fr-FR'))
console.log('Écrit dans: ' + dossier)

console.log('\n=== OCTETS ENCORE INCONNUS (' + inconnus.size + ') ===')
const tries = [...inconnus.entries()].sort((a, b) => a[0] - b[0])
for (const [octet, exemples] of tries) {
  console.log('\n0x' + octet.toString(16).toUpperCase().padStart(2, '0') + ' :')
  for (const ex of exemples.slice(0, 3)) console.log('   ' + ex)
}
