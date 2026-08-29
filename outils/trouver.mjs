// Retrouve une phrase du jeu dans la ROM, à partir de son texte.
//
//   node outils/trouver.mjs <rom> "Good afternoon!"
//
// Une phrase vue à l'écran ne dit pas où elle est écrite. Le détecteur de tables
// ne voit que les tables de pointeurs qui passent son seuil — une phrase pointée
// autrement lui échappe, et c'est justement le cas du premier dialogue du jeu.
// Encoder le texte avec la table et balayer les 8 Mio règle la question en une
// seconde, sans supposer quoi que ce soit sur les pointeurs.
//
// On cherche avec la table D'ORIGINE : chercher un texte anglais avec la table
// étendue n'aurait aucun sens, et la règle du projet est de ne lire l'anglais
// qu'avec la table d'origine.
//
// La sortie donne aussi QUI pointe vers l'adresse trouvée : les pointeurs GBA
// sont des mots de 32 bits valant 0x08000000 + décalage, donc les repérer est
// une simple recherche de quatre octets. Sans ça, on connaît l'adresse du texte
// mais pas la table qui la commande — et c'est la table qu'il faut pour traduire.
import { readFileSync } from 'node:fs'
import { TABLE, rendOctet } from './table-caracteres.mjs'

const BASE = 0x08000000

const INVERSE = new Map()
for (let i = 0; i < 256; i++) {
  if (TABLE[i] !== null && !INVERSE.has(TABLE[i])) INVERSE.set(TABLE[i], i)
}

const rom = readFileSync(process.argv[2])
const phrase = process.argv[3]
if (!phrase) {
  console.error('Usage : node outils/trouver.mjs <rom> "texte a chercher"')
  process.exit(1)
}

const motif = []
for (const c of phrase) {
  const b = INVERSE.get(c)
  if (b === undefined) {
    console.error('Aucun code pour le caractere « ' + c + ' » dans la table du jeu.')
    process.exit(1)
  }
  motif.push(b)
}

const hex = (n, l = 2) => n.toString(16).toUpperCase().padStart(l, '0')

console.log('Motif : ' + motif.map((b) => hex(b)).join(' ') + '\n')

const trouves = []
for (let o = 0; o <= rom.length - motif.length; o++) {
  let ok = true
  for (let i = 0; i < motif.length; i++) {
    if (rom[o + i] !== motif[i]) { ok = false; break }
  }
  if (ok) trouves.push(o)
}

if (trouves.length === 0) {
  console.log('Aucune occurrence.')
  process.exit(0)
}

for (const o of trouves) {
  console.log('0x' + hex(o, 6) + '  (pointeur 0x' + hex(BASE + o, 8) + ')')

  // Le texte complet de l'entrée, jusqu'au terminateur.
  let texte = ''
  for (let i = o; i < Math.min(rom.length, o + 256); i++) {
    const b = rom[i]
    if (b === 0xff) { texte += '{FF}'; break }
    if (b === 0xfe) { texte += '{FE}'; break }
    texte += TABLE[b] !== null ? TABLE[b] : rendOctet(b)
  }
  console.log('   texte    : ' + texte)

  // Qui pointe ici ? Un pointeur GBA est un mot de 32 bits little-endian.
  const p = Buffer.alloc(4)
  p.writeUInt32LE(BASE + o)
  const refs = []
  let d = rom.indexOf(p, 0)
  while (d !== -1 && refs.length < 8) {
    refs.push(d)
    d = rom.indexOf(p, d + 1)
  }
  console.log(
    '   pointe par: ' +
      (refs.length ? refs.map((r) => '0x' + hex(r, 6)).join(', ') : 'AUCUN pointeur direct'),
  )
  console.log('')
}

console.log(trouves.length + ' occurrence(s).')
