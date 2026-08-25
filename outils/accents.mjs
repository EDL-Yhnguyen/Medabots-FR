// Les accents étaient déjà dans la ROM.
//
// Après avoir localisé la police (docs/format.md § 4), un simple coup d'œil aux
// emplacements suivant le 79e glyphe a montré ce que sept recherches n'avaient
// pas soupçonné : la ROM est une version EUROPE, et elle embarque le jeu de
// caractères des quatre langues du continent — Ä ä Á á Â â È è É é Ê ê Ë ë
// Î î Ï ï Í í Ö ö Ô ô Ó ó Ü ü Û û Ù ù Ú ú ß Ç ç Ñ ñ ¡ ¿ À à Œ œ.
//
// Rien n'a jamais eu besoin d'être dessiné ni relogé. Le seul obstacle était
// que les entrées 0x4F..0x7C des DEUX tables de chasse sont à zéro : le jeu ne
// sait pas quelle largeur donner à ces glyphes, donc il ne les emploie jamais.
// Écrire ces largeurs suffit à ouvrir le français.
//
//   node outils/accents.mjs <rom.gba> --controle   vérifie l'identification
//
// Usage en bibliothèque : ouvrirAccents(buffer) écrit les deux tables.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const POLICES = [
  { nom: 'romaine', dessins: 0x4bfc64, chasse: 0x3b4e08, jeu: 2 },
  { nom: 'italique', dessins: 0x4c59a4, chasse: 0x3b5008, jeu: 1 },
]

/**
 * Le catalogue. Chaque ligne dit : le code, le caractère, et le glyphe DE BASE
 * dont ce glyphe reprend le corps.
 *
 * La base n'est pas devinée : pour les capitales, le corps de l'accentué est
 * identique AU BIT PRÈS à celui de la lettre nue (distance 0 sur les lignes
 * 4 à 15, mesurée par --controle). Pour les bas-de-casse la distance est de 22
 * à 42, l'écart venant du diacritique qui mord la ligne 5 — aucune autre lettre
 * n'approche.
 *
 * `null` = pas de lettre de base : la largeur se calcule alors sur le dessin.
 */
export const ACCENTS = [
  [0x50, 'Ä', 0x01], [0x51, 'ä', 0x1b],
  [0x52, 'Á', 0x01], [0x53, 'á', 0x1b],
  [0x54, 'Â', 0x01], [0x55, 'â', 0x1b],
  [0x79, 'À', 0x01], [0x7a, 'à', 0x1b],
  [0x56, 'È', 0x05], [0x57, 'è', 0x1f],
  [0x58, 'É', 0x05], [0x59, 'é', 0x1f],
  [0x5a, 'Ê', 0x05], [0x5b, 'ê', 0x1f],
  [0x5c, 'Ë', 0x05], [0x5d, 'ë', 0x1f],
  [0x5e, 'Î', 0x09], [0x5f, 'î', 0x23],
  [0x60, 'Ï', 0x09], [0x61, 'ï', 0x23],
  [0x62, 'Í', 0x09], [0x63, 'í', 0x23],
  [0x64, 'Ö', 0x0f], [0x65, 'ö', 0x29],
  [0x66, 'Ô', 0x0f], [0x67, 'ô', 0x29],
  [0x68, 'Ó', 0x0f], [0x69, 'ó', 0x29],
  [0x6a, 'Ü', 0x15], [0x6b, 'ü', 0x2f],
  [0x6c, 'Û', 0x15], [0x6d, 'û', 0x2f],
  [0x6e, 'Ù', 0x15], [0x6f, 'ù', 0x2f],
  [0x70, 'Ú', 0x15], [0x71, 'ú', 0x2f],
  [0x73, 'Ç', 0x03], [0x74, 'ç', 0x1d],
  [0x75, 'Ñ', 0x0e], [0x76, 'ñ', 0x28],
  [0x72, 'ß', null], [0x77, '¡', null], [0x78, '¿', null],
  [0x7b, 'Œ', null], [0x7c, 'œ', null],
]

const px = (rom, base, i, x, y) => {
  const o = base + i * 64 + y * 4 + (x >> 1)
  return x & 1 ? (rom[o] >> 4) & 15 : rom[o] & 15
}

/** Dernière colonne portant de l'encre. Le fond est l'index 1, pas 0. */
export function derniereColonne(rom, base, i) {
  let d = -1
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if (px(rom, base, i, x, y) !== 1 && x > d) d = x
  return d
}

/**
 * Largeur à déclarer, en pixels d'avance.
 *
 * Deux mesures, dont on garde la plus grande :
 *
 * - **la largeur de la lettre de base**, puisque le corps est le même dessin ;
 * - **la place réellement occupée**, dernière colonne encrée + le jeu propre à
 *   la police (2 en romaine, 1 en italique — relevé sur les 78 lettres nues).
 *
 * Les deux concordent sur presque tout le catalogue. Elles divergent pour î, ï
 * et í, dont le fût est décalé d'un pixel vers la droite pour dégager le
 * diacritique : la lettre de base dirait 2, le dessin dit 4. Prendre le plus
 * grand est la seule réponse sûre — une largeur trop courte ferait mordre
 * l'accent sur la lettre suivante, et rien dans la ROM ne le signalerait.
 */
export function largeur(rom, police, code, base) {
  const calcul = derniereColonne(rom, police.dessins, code) + police.jeu
  const declaree = base === null ? 0 : rom[police.chasse + base * 2]
  return Math.max(calcul, declaree)
}

/** Classe verticale, purement descriptive — voir la note de ouvrirAccents(). */
function classe(rom, police, code) {
  let haut = 99, bas = -1
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 8; x++)
      if (px(rom, police.dessins, code, x, y) !== 1) { if (y < haut) haut = y; if (y > bas) bas = y }
  if (bas >= 12) return 3 // jambage — Ç et ç descendent sous la ligne de base
  if (haut <= 3) return 0 // hampe
  return 1
}

/**
 * Écrit les largeurs manquantes dans les deux tables de chasse du tampon.
 *
 * L'octet 1 de chaque entrée reçoit une classe verticale cohérente avec le
 * reste de la table, mais **le moteur ne la lit jamais** : les 21 instructions
 * qui chargent une table de chasse font toutes un LDRB d'offset 0, aucune
 * d'offset 1. Elle n'est écrite que pour ne pas laisser une table à moitié
 * renseignée derrière soi.
 */
export function ouvrirAccents(tampon) {
  let n = 0
  for (const police of POLICES) {
    for (const [code, , base] of ACCENTS) {
      tampon[police.chasse + code * 2] = largeur(tampon, police, code, base)
      tampon[police.chasse + code * 2 + 1] = classe(tampon, police, code)
      n++
    }
  }
  return n / POLICES.length
}

// --- Contrôle -------------------------------------------------------------
//
// Ne s'exécute que si CE fichier est le programme lancé. Le tester sur argv[2]
// ne suffisait pas : reinserer.mjs importe ce module ET reçoit un chemin de ROM
// en argv[2], si bien que le tableau de contrôle sortait au milieu de la
// réinsertion. Un garde d'exécution se compare au point d'entrée, pas aux
// arguments.
const lanceDirectement = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (lanceDirectement && process.argv[2]) {
  const rom = readFileSync(process.argv[2])
  const g = (base, i) => {
    const p = []
    for (let y = 0; y < 16; y++) { const l = []; for (let x = 0; x < 8; x++) l.push(px(rom, base, i, x, y)); p.push(l) }
    return p
  }
  const dist = (a, b) => { let d = 0; for (let y = 4; y < 16; y++) for (let x = 0; x < 8; x++) d += Math.abs(a[y][x] - b[y][x]); return d }

  console.log('code car  base │ romaine: dist  base calc → LARG │ italique: dist  base calc → LARG')
  let ecarts = 0
  for (const [code, car, base] of ACCENTS) {
    const cols = []
    for (const police of POLICES) {
      const d = base === null ? null : dist(g(police.dessins, code), g(police.dessins, base))
      const calcul = derniereColonne(rom, police.dessins, code) + police.jeu
      const declaree = base === null ? 0 : rom[police.chasse + base * 2]
      const larg = Math.max(calcul, declaree)
      if (base !== null && calcul !== declaree) ecarts++
      cols.push(`${String(d ?? '—').padStart(5)} ${String(declaree || '—').padStart(4)} ${String(calcul).padStart(4)} → ${String(larg).padStart(2)}`)
    }
    console.log(`0x${code.toString(16)} ${car}   ${base === null ? ' — ' : '0x' + base.toString(16).padStart(2, '0')} │ ${cols.join(' │ ')}`)
  }
  console.log(`\n${ACCENTS.length} glyphes catalogués, ${ecarts} écart(s) entre largeur de base et largeur calculée.`)
  console.log('Un écart n’est pas une erreur : c’est un glyphe dont le corps a été décalé pour')
  console.log('loger son diacritique. La plus grande des deux mesures l’emporte.')
}
