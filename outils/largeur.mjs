// Largeur des lignes de dialogue, en pixels — et structure des boîtes.
//
//   node outils/largeur.mjs <rom.gba> <fichier|dossier> [plafond] [--contre <script>]
//
// LE PLAFOND EST 212 PX. Mesuré : sur les treize tables de dialogue de
// `0x47xxxx`, la ligne anglaise la plus large fait 212 px (`47B110` @0191 et
// `47D5C0` @0259), et les treize maxima se tiennent entre 200 et 212. Le jeu
// affiche tout cela correctement, donc la boîte fait au moins 212 px.
// Ne pas mesurer ce plafond sur `travail/script` entier : les tables de listes
// n'ont pas de sauts de ligne, une « ligne » y vaut l'entrée entière et le
// maximum monte à 4393 px, ce qui ne veut rien dire.
//
// `--contre` COMPARE À L'ORIGINAL. Combien de lignes tient une boîte, on ne le
// sait pas exactement : 3 981 boîtes anglaises en ont deux, donc DEUX LIGNES
// SONT TOUJOURS SÛRES. Mais 154 en ont trois à cinq, et rien ne dit si le jeu
// les fait défiler ou s'il s'agit d'un autre type d'affichage. Plutôt que de
// trancher sans mesure, on tient la règle sûre : une boîte traduite a au plus
// deux lignes, ou autant que l'original si lui en avait davantage à cet
// endroit. Ce qui ne rentre pas prend une boîte de plus (`{FC}`), sans risque.
//
// LE DÉFAUT QUE CET OUTIL ATTRAPE. Le repointage règle la longueur en octets :
// une traduction trop longue est relogée en fin de ROM, et personne n'a à
// abréger. Mais il ne dit rien de la LARGEUR À L'ÉCRAN. Les sauts de ligne sont
// posés à la main dans le script, `{FD}` par `{FD}` ; le français étant plus
// long que l'anglais, une ligne traduite sans y penser déborde de la boîte de
// dialogue. Rien ne le signale : ni l'encodage, ni la réinsertion, ni le test
// d'identité. Ça ne se voit qu'en jouant, trois cents dialogues plus tard.
//
// LE PLAFOND EST MESURÉ, PAS SUPPOSÉ. On ne sait pas dire, depuis le binaire,
// combien de pixels fait la boîte. En revanche le jeu affiche correctement tout
// son script anglais : la ligne anglaise la plus large est donc une borne sûre,
// et elle est atteinte quelque part. Sans troisième argument, l'outil calcule
// ce maximum sur le dossier qu'on lui donne et s'en sert comme plafond — passer
// `travail/script` mesure donc l'anglais et le prend pour référence.
//
// La chasse est variable et il y a DEUX polices : `{F8}` bascule en italique,
// dont les largeurs sont dans une seconde table. Mesurer l'italique avec les
// largeurs romaines donnerait un résultat faux sur les onomatopées.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { TABLE, REPLI_ACCENTS } from './table-caracteres.mjs'

const args = process.argv.slice(2)
const iContre = args.indexOf('--contre')
const contre = iContre >= 0 ? args[iContre + 1] : null
if (iContre >= 0) args.splice(iContre, 2)
const [cheminRom, dossier, plafondArg] = args
if (!cheminRom || !dossier) {
  console.error('Usage : node outils/largeur.mjs <rom.gba> <fichier|dossier> [plafond] [--contre <script>]')
  process.exit(1)
}

const rom = readFileSync(cheminRom)
const CHASSE_ROMAINE = 0x3b4e08
const CHASSE_ITALIQUE = 0x3b5008

/** Octet 0 de l'entrée : la largeur. L'octet 1 ne sert à rien — établi au
    désassemblage, toutes les lectures de chasse font un LDRB d'offset 0. */
const largeurDe = (octet, italique) =>
  rom[(italique ? CHASSE_ITALIQUE : CHASSE_ROMAINE) + octet * 2]

const INVERSE = new Map()
for (let o = 0; o < TABLE.length; o++) {
  if (TABLE[o] !== null && !INVERSE.has(TABLE[o])) INVERSE.set(TABLE[o], o)
}

/** Les octets d'un texte de script, replis d'accents compris — même règle que
    la réinsertion, sans quoi on mesurerait autre chose que ce qui sera écrit. */
function octetsDe(texte) {
  const octets = []
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (c === '{') {
      const fin = texte.indexOf('}', i)
      if (fin - i !== 3) continue
      octets.push(parseInt(texte.slice(i + 1, fin), 16))
      i = fin
      continue
    }
    if (c === '…') { octets.push(0x3f, 0x3f, 0x3f); continue }
    const o = INVERSE.get(c)
    if (o !== undefined) { octets.push(o); continue }
    const repli = REPLI_ACCENTS.get(c)
    if (repli) for (const r of repli) { const x = INVERSE.get(r); if (x !== undefined) octets.push(x) }
  }
  return octets
}

/** Découpe une entrée en lignes affichées et rend la largeur de chacune.
    Les paramètres des codes de contrôle ne sont PAS du texte : les compter
    ajouterait la largeur de trois lettres fantômes à chaque changement de
    locuteur. */
function lignesDe(texte) {
  const octets = octetsDe(texte)
  const lignes = []
  let largeur = 0
  let italique = false
  const pousse = () => { lignes.push(largeur); largeur = 0 }

  for (let i = 0; i < octets.length; i++) {
    const o = octets[i]
    if (o === 0xfb) { i += 3; continue }
    if (o === 0xf7 || o === 0xf9) { i += 1; continue }
    if (o === 0xff) break
    if (o === 0xf8) { italique = !italique; continue }
    if (o === 0xfc || o === 0xfd) { pousse(); continue }
    if (o === 0xfe) break
    if (o === 0xfa) continue
    largeur += largeurDe(o, italique) ?? 0
  }
  pousse()
  return lignes
}

/** Une entrée du script : son numéro et son texte, tels que le format les écrit
    (`@NNNN [0xADRESSE]` sur une ligne, le texte sur la suivante). */
function* entreesDe(chemin) {
  const lignes = readFileSync(chemin, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lignes.length; i++) {
    const m = /^@(\d+)/.exec(lignes[i])
    if (m && lignes[i + 1] !== undefined) yield { numero: m[1], texte: lignes[i + 1] }
  }
}

/* Un fichier seul est accepté autant qu'un dossier : on vérifie le plus souvent
   UNE table qu'on vient de traduire, et créer un dossier pour un fichier est un
   détour. */
const estDossier = statSync(dossier).isDirectory()
const racine = estDossier ? dossier : dirname(dossier)
const fichiers = estDossier
  ? readdirSync(dossier).filter((f) => f.endsWith('.txt')).sort()
  : [basename(dossier)]

const mesures = []
for (const f of fichiers) {
  for (const { numero, texte } of entreesDe(`${racine}/${f}`)) {
    lignesDe(texte).forEach((px, rang) => {
      if (px > 0) mesures.push({ table: f.replace('.txt', ''), numero, rang, px })
    })
  }
}

if (mesures.length === 0) {
  console.error('Aucune ligne mesurée — le dossier est-il le bon ?')
  process.exit(1)
}

/* Le nombre de lignes de la boîte la plus haute d'une entrée. Une boîte va d'un
   `{FC}` au suivant ; ses lignes sont ses `{FD}`, plus un. */
const hauteurMax = (texte) =>
  Math.max(...texte.split('{FC}').map((b) => (b.match(/\{FD\}/g) ?? []).length + 1))

let ajouts = 0
if (contre) {
  for (const f of fichiers) {
    const original = `${contre}/${f}`
    if (!existsSync(original)) {
      console.error(`Pas d'original pour ${f} dans ${contre} — comparaison impossible.`)
      process.exit(1)
    }
    const avant = new Map()
    for (const { numero, texte } of entreesDe(original)) avant.set(numero, hauteurMax(texte))
    for (const { numero, texte } of entreesDe(`${racine}/${f}`)) {
      const apres = hauteurMax(texte)
      const origine = avant.get(numero)
      // Deux lignes sont toujours sûres : 3 981 boîtes anglaises en ont deux.
      // Au-delà, on ne dépasse jamais ce que l'original faisait au même endroit.
      if (origine !== undefined && apres > Math.max(origine, 2)) {
        ajouts++
        console.log(
          `  ${f.replace('.txt', '')} @${numero} : boîte de ${apres} lignes contre ${origine} ` +
            `dans l'original — scinder avec {FC} plutôt que d'ajouter une ligne.`,
        )
      }
    }
  }
  if (ajouts > 0) console.log(`\n${ajouts} boîte(s) ont gagné une ligne.\n`)
}

mesures.sort((a, b) => b.px - a.px)
const maximum = mesures[0].px
const plafond = plafondArg ? Number(plafondArg) : maximum

console.log(`${fichiers.length} fichier(s), ${mesures.length} lignes mesurées.`)
console.log(`Ligne la plus large : ${maximum} px — ${mesures[0].table} @${mesures[0].numero}`)
console.log(`Plafond appliqué : ${plafond} px` + (plafondArg ? '' : ' (le maximum observé)'))

const debordent = mesures.filter((m) => m.px > plafond)
if (debordent.length === 0) {
  console.log('\nAucune ligne ne dépasse le plafond.')
  process.exit(ajouts > 0 ? 1 : 0)
}

console.log(`\n${debordent.length} ligne(s) dépassent, jusqu'à +${debordent[0].px - plafond} px :`)
for (const m of debordent.slice(0, 40)) {
  console.log(`  ${m.table} @${m.numero} ligne ${m.rang + 1} : ${m.px} px (+${m.px - plafond})`)
}
if (debordent.length > 40) console.log(`  … et ${debordent.length - 40} autres.`)
process.exit(1)
