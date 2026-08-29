// Une ROM JETABLE pour voir les accents à l'écran, sans jouer trois heures.
//
//   node outils/demo-accents.mjs <rom-traduite> travail/pointeurs.json <sortie.gba>
//
// Le texte français traduit ne se rencontre qu'en progressant dans le jeu :
// boutique, sauvegarde, Robattle. Vérifier que la police accentuée s'affiche
// demanderait donc d'y jouer d'abord — et tant qu'on n'a pas vérifié, on ne sait
// pas si ça vaut la peine d'y jouer.
//
// D'où ce détour : on remplace CHAQUE voyelle du script par sa version
// accentuée, UN OCTET POUR UN OCTET. Aucune longueur ne change, donc aucun
// pointeur ne bouge. Le premier écran de texte venu, même en anglais, devient
// alors un banc d'essai de la police européenne.
//
// Cette ROM ne sort jamais de travail/. Ce n'est pas une traduction, c'est un
// instrument de mesure.

import { readFileSync, writeFileSync } from 'node:fs'
import { ciblesDeTable } from './entrees.mjs'
import { ouvrirAccents } from './accents.mjs'
import { TABLE } from './table-caracteres.mjs'

const BASE = 0x08000000

const SUBSTITUTION = new Map([
  [0x01, 0x79], [0x1b, 0x7a], // A à, a à
  [0x03, 0x73], [0x1d, 0x74], // C Ç, c ç
  [0x05, 0x58], [0x1f, 0x59], // E É, e é
  [0x09, 0x5e], [0x23, 0x5f], // I Î, i î
  [0x0f, 0x66], [0x29, 0x67], // O Ô, o ô
  [0x15, 0x6c], [0x2f, 0x6d], // U Û, u û
])

// Nombre d'octets de PARAMÈTRE qui suivent un code de contrôle. Les toucher
// casserait le jeu : ce ne sont pas des lettres, ce sont des arguments.
const PARAMETRES = new Map([[0xf7, 1], [0xf9, 1], [0xfb, 3], [0xff, 1]])

const rom = readFileSync(process.argv[2])
const sortie = Buffer.from(rom)
const tables = JSON.parse(readFileSync(process.argv[3], 'utf8'))

ouvrirAccents(sortie)

let entrees = 0
let remplaces = 0
for (const t of tables) {
  const debut = parseInt(t.adresse, 16)
  for (const adresse of ciblesDeTable(rom, debut, t.entrees, BASE)) {
    if (adresse < 0 || adresse >= rom.length) continue
    entrees++
    for (let o = adresse; o < rom.length && o < adresse + 4096; o++) {
      const b = sortie[o]
      if (PARAMETRES.has(b)) {
        if (b === 0xff) break // fin de message
        o += PARAMETRES.get(b)
        continue
      }
      if (b === 0xfe) break // fin d'entrée de liste
      const sub = SUBSTITUTION.get(b)
      if (sub !== undefined) { sortie[o] = sub; remplaces++ }
    }
  }
}

// LE BANC D'ESSAI, à l'adresse du tout premier dialogue du jeu.
//
// « Good afternoon! » est la première phrase affichée après « NEW GAME ». Elle
// n'appartient à AUCUNE des 33 tables détectées — elle est pointée autrement, et
// le détecteur ne la voit pas. La substitution de voyelles ci-dessus ne l'atteint
// donc pas.
//
// On y écrit à la main quinze signes accentués, exactement la longueur de la
// phrase anglaise : aucun octet ne bouge, et le premier écran de dialogue
// devient un banc d'essai de toute la police européenne.
//
// ON CHERCHE LA PHRASE, ON NE DEVINE PAS SON ADRESSE. Le premier jet écrivait en
// dur à 0x4148BE ; l'écran est resté anglais. La ROM en contient DEUX copies, et
// c'est la seconde (0x474C87, dans la zone de dialogues 0x47xxxx, suivie de
// « {FD}It's {F9}. ») qui est affichée. Chercher et écrire sur toutes les
// occurrences enlève la question : une adresse devinée coûte un aller-retour
// d'émulateur pour rien.
const PHRASE = [0x07, 0x29, 0x29, 0x1e, 0x00, 0x1b, 0x20, 0x2e, 0x1f, 0x2c, 0x28, 0x29, 0x29, 0x28, 0x47]

// Le banc par défaut montre QUE les accents s'affichent. Un cinquième argument
// permet d'en écrire un autre, en octets hex — parce qu'une fois l'affichage
// acquis, la question devient la CHASSE, et la mesurer demande un autre motif.
//
// Le banc de chasse tient en une ligne :
//
//   node outils/demo-accents.mjs <rom> <pointeurs> <sortie> "1b 1f 23 29 2f 01 05 fd 7a 59 5f 67 6d 79 58"
//
// soit « aeiouAE » puis un saut de ligne (0xFD) puis « àéîôûÀÉ ». Les deux
// lignes portent les mêmes lettres, accentuées ou non : si les largeurs écrites
// dans les tables de chasse sont justes, elles doivent finir AU MÊME PIXEL.
// L'œil ne juge alors plus « ça a l'air serré », il compare deux bords.
const CODES = process.argv[5]
  ? process.argv[5].trim().split(/\s+/).map((h) => parseInt(h, 16))
  : [0x58, 0x74, 0x7a, 0x57, 0x5b, 0x5f, 0x67, 0x6d, 0x6f, 0x61, 0x5d, 0x00, 0x79, 0x73, 0x5e]
const ESSAI = CODES.map((b) => (b === 0xfd ? '⏎' : TABLE[b] ?? '{' + b.toString(16) + '}')).join('')
if (CODES.length !== PHRASE.length) throw new Error('le banc d’essai doit faire exactement ' + PHRASE.length + ' octets, pas ' + CODES.length)

const bancs = []
for (let o = 0; o <= rom.length - PHRASE.length; o++) {
  let ok = true
  for (let i = 0; i < PHRASE.length; i++) if (rom[o + i] !== PHRASE[i]) { ok = false; break }
  if (!ok) continue
  bancs.push(o)
  for (let i = 0; i < CODES.length; i++) sortie[o + i] = CODES[i]
}
if (bancs.length === 0) throw new Error('« Good afternoon! » introuvable — la ROM n’est pas celle attendue')

writeFileSync(process.argv[4], sortie)
console.log(`${entrees.toLocaleString('fr-FR')} entrées parcourues, ${remplaces.toLocaleString('fr-FR')} voyelles accentuées.`)
console.log(`Banc d’essai « ${ESSAI} » écrit à ${bancs.map((o) => '0x' + o.toString(16).toUpperCase()).join(', ')}.`)
console.log(`Longueur inchangée : ${sortie.length === rom.length ? '✅' : '❌'}  →  ${process.argv[4]}`)
