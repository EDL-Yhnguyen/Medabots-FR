// Voir une phrase française AVANT de la mettre dans le jeu.
//
//   node outils/apercu-texte.mjs <rom.gba> "Régénération complète !" [--italique]
//
// Compose la phrase avec les dessins de la police et les largeurs de la table de
// chasse, telles qu'elles sont DANS LA ROM DONNÉE. Passer la ROM traduite montre
// donc l'effet réel des largeurs écrites par outils/accents.mjs.
//
// C'est une simulation de la composition, pas le moteur bit à bit : le jeu
// décale le glyphe de largeur×4 bits et l'assemble par OU dans une tuile
// (0x0401A2-0x0401CE), là où l'on peint ici pixel par pixel. Les deux donnent la
// même image ; ce qui se vérifie ici, c'est l'ESPACEMENT — une largeur trop
// courte fait mordre les lettres, une largeur trop longue les disperse, et ni
// l'une ni l'autre ne se voit dans un fichier de traduction.

import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { TABLE } from './table-caracteres.mjs'
import { POLICES } from './accents.mjs'

const INVERSE = new Map()
for (let o = 0; o < 256; o++) if (TABLE[o] !== null) INVERSE.set(TABLE[o], o)

/** Rend une chaîne. Retourne { pixels, largeur, hauteur, inconnus }. */
export function composer(rom, texte, italique = false) {
  const pol = POLICES[italique ? 1 : 0]
  const codes = []
  const inconnus = []
  for (const c of texte) {
    const o = INVERSE.get(c)
    if (o === undefined) { inconnus.push(c); continue }
    codes.push(o)
  }
  const largeur = codes.reduce((a, c) => a + rom[pol.chasse + c * 2], 0) || 1
  const px = new Uint8Array(largeur * 16).fill(1) // 1 = fond
  let x0 = 0
  for (const c of codes) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 8; x++) {
        const o = pol.dessins + c * 64 + y * 4 + (x >> 1)
        const v = x & 1 ? (rom[o] >> 4) & 15 : rom[o] & 15
        const cible = x0 + x
        if (v !== 1 && cible < largeur) px[y * largeur + cible] = v
      }
    x0 += rom[pol.chasse + c * 2]
  }
  return { pixels: px, largeur, hauteur: 16, inconnus }
}

const RAMPE = ' .:-=+*abcdef#@'
export function enAscii({ pixels, largeur }) {
  const l = []
  for (let y = 0; y < 16; y++) {
    let s = ''
    for (let x = 0; x < largeur; x++) {
      const v = pixels[y * largeur + x]
      s += v === 1 ? '.' : RAMPE[Math.min(14, v)]
    }
    l.push(s)
  }
  return l.join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rom = readFileSync(process.argv[2])
  const italique = process.argv.includes('--italique')
  const phrases = process.argv.slice(3).filter((a) => !a.startsWith('--'))
  for (const phrase of phrases) {
    const img = composer(rom, phrase, italique)
    console.log(`\n« ${phrase} »   ${img.largeur} px${italique ? '  (italique)' : ''}`)
    if (img.inconnus.length) console.log(`   ⚠ hors police, ignoré(s) : ${[...new Set(img.inconnus)].join(' ')}`)
    console.log(enAscii(img))
  }
}
