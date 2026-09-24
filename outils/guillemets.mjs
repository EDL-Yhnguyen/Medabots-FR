// Les guillemets français, eux, ont vraiment dû être dessinés.
//
// C'est la différence avec outils/accents.mjs : les 45 signes européens
// DORMAIENT dans la police d'une cartouche Europe, et il a suffi de leur écrire
// une largeur (docs/format.md § 4 bis). « et » n'y sont pas — aucune des quatre
// langues du continent ne les emploie sous cette forme. Il restait 68 replis sur
// le guillemet droit `"`, les derniers du projet.
//
// Deux des onze emplacements vides reçoivent le dessin : 0x7D et 0x7E. Le
// glyphe 0x4F reste libre, au milieu du bloc européen.
//
//   node outils/guillemets.mjs <rom.gba> --controle   trace le résultat
//
// Usage en bibliothèque : ouvrirGuillemets(buffer) dessine et chasse.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { POLICES, derniereColonne, classe } from './accents.mjs'

/** Code du glyphe ouvrant, code du fermant. */
export const OUVRANT = 0x7d
export const FERMANT = 0x7e

/**
 * Le dessin, rangée par rangée : « . » = fond, « # » = encre.
 *
 * Il occupe les rangées 5 à 9, c'est-à-dire le milieu de la hauteur d'x — « e »
 * va de la rangée 5 à la 10, le trait d'union est sur 7 et 8. Un guillemet posé
 * plus haut se lirait comme une apostrophe double, plus bas comme une virgule.
 *
 * Deux chevrons décalés de deux colonnes, pointe à gauche, sur cinq rangées avec
 * la pointe au milieu. Les arêtes font exactement 45° : à cette taille c'est un
 * pixel par rangée, sans lissage — le `/` de la police n'est lissé que parce que
 * sa pente, elle, n'est pas de 45°.
 */
const DESSIN_OUVRANT = [
  '..#.#...',
  '.#.#....',
  '#.#.....',
  '.#.#....',
  '..#.#...',
]

/** La rangée où commence le dessin. */
const RANGEE = 5

/** Le fermant est le miroir exact de l'ouvrant sur ses cinq colonnes utiles. */
const DESSIN_FERMANT = DESSIN_OUVRANT.map(
  (l) => [...l.slice(0, 5)].reverse().join('') + l.slice(5),
)

/**
 * L'encre : 0xE, la valeur la plus employée de la police (386 pixels sur les
 * 125 glyphes dessinés, devant 0xD à 378 et 0xF à 242). Le fond est 1, pas 0.
 */
const ENCRE = 0xe
const FOND = 0x1

/**
 * L'italique reçoit le même dessin, décalé d'une colonne vers la droite.
 *
 * Pas de cisaillement : sur cinq rangées, pencher le glyphe d'un pixel casse la
 * continuité des arêtes — deux pixels qui se touchent par le coin au lieu de se
 * suivre. Le lecteur y verrait un défaut, pas une italique. Le décalage seul
 * suffit à poser le glyphe à la place optique qu'occupent les autres signes de
 * cette police, dont le `"` penché.
 */
const DECALAGE_ITALIQUE = 1

const poser = (tampon, base, i, x, y, v) => {
  const o = base + i * 64 + y * 4 + (x >> 1)
  tampon[o] = x & 1 ? (tampon[o] & 0x0f) | (v << 4) : (tampon[o] & 0xf0) | v
}

/** Écrit les 64 octets du glyphe : fond partout, puis l'encre du dessin. */
function dessiner(tampon, base, code, dessin, decalage) {
  for (let i = 0; i < 64; i++) tampon[base + code * 64 + i] = (FOND << 4) | FOND
  for (let r = 0; r < dessin.length; r++)
    for (let x = 0; x < 8; x++)
      if (dessin[r][x] === '#') poser(tampon, base, code, x + decalage, RANGEE + r, ENCRE)
}

/**
 * Dessine « et » dans les deux polices et leur écrit une chasse.
 *
 * La largeur se mesure sur le dessin, exactement comme pour les accents sans
 * lettre de base : dernière colonne encrée + le jeu propre à la police. Les deux
 * polices tombent sur 6, la largeur d'une lettre — l'italique rattrape par son
 * décalage ce que son jeu plus court lui retire.
 */
export function ouvrirGuillemets(tampon) {
  for (const police of POLICES) {
    const decalage = police.nom === 'italique' ? DECALAGE_ITALIQUE : 0
    for (const [code, dessin] of [[OUVRANT, DESSIN_OUVRANT], [FERMANT, DESSIN_FERMANT]]) {
      dessiner(tampon, police.dessins, code, dessin, decalage)
      tampon[police.chasse + code * 2] = derniereColonne(tampon, police.dessins, code) + police.jeu
      tampon[police.chasse + code * 2 + 1] = classe(tampon, police, code)
    }
  }
  return 2
}

// --- Contrôle -------------------------------------------------------------
const lanceDirectement = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (lanceDirectement && process.argv[2]) {
  const rom = readFileSync(process.argv[2])
  const avant = POLICES.map((p) => [OUVRANT, FERMANT].map((c) => rom[p.chasse + c * 2]))
  ouvrirGuillemets(rom)

  const px = (base, i, x, y) => {
    const o = base + i * 64 + y * 4 + (x >> 1)
    return x & 1 ? (rom[o] >> 4) & 15 : rom[o] & 15
  }
  const colonnes = []
  for (const police of POLICES)
    for (const [code, car] of [[OUVRANT, '«'], [FERMANT, '»']]) {
      const art = []
      for (let y = 0; y < 16; y++) {
        let l = ''
        for (let x = 0; x < 8; x++) { const v = px(police.dessins, code, x, y); l += v === FOND ? '.' : v.toString(16) }
        art.push(l)
      }
      colonnes.push({ titre: `${car} 0x${code.toString(16)} ${police.nom.slice(0, 4)} l=${rom[police.chasse + code * 2]}`, art })
    }
  console.log(colonnes.map((c) => c.titre.padEnd(20)).join(''))
  for (let y = 0; y < 16; y++) console.log(colonnes.map((c) => c.art[y].padEnd(20)).join(''))
  console.log('\nLargeurs avant écriture :', avant.map((a) => a.join('/')).join('  '),
    '— zéro partout, c’est ce qui les rendait inemployables.')
  console.log('Chasse écrite :', POLICES.map((p) => `${p.nom} ${rom[p.chasse + OUVRANT * 2]}/${rom[p.chasse + FERMANT * 2]}`).join('  '))
}
