// Fabrication du patch BPS, et vérification par application.
//
// BPS plutôt qu'IPS : il porte les sommes CRC32 de la source, de la cible et de
// lui-même. Il REFUSE donc de s'appliquer à la mauvaise ROM, au lieu de produire
// un jeu cassé en silence — ce qu'un IPS fait sans broncher.
//
// Usage : node outils/patch.mjs <rom-origine> <rom-traduite> <sortie.bps>
import { readFileSync, writeFileSync } from 'node:fs'

const origine = readFileSync(process.argv[2])
const cible = readFileSync(process.argv[3])
const sortie = process.argv[4]

const TABLE_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Entier de taille variable, format BPS. */
function ecritVarint(n, out) {
  for (;;) {
    const x = n % 128
    n = Math.floor(n / 128)
    if (n === 0) { out.push(0x80 | x); break }
    out.push(x)
    n--
  }
}

const octets = []
for (const c of 'BPS1') octets.push(c.charCodeAt(0))
ecritVarint(origine.length, octets)
ecritVarint(cible.length, octets)
ecritVarint(0, octets) // pas de métadonnées

// Trois actions. « Recopier l'original » et « écrire du neuf » suffisaient
// tant que les deux ROM faisaient la même taille. La traduite fait 16 Mio
// contre 8 : les 8 Mio ajoutés sont du bourrage, et les écrire en clair
// ferait un patch de 8 Mio pour rien. Le format a l'action qu'il faut :
// TargetCopy, « recopie ce que tu viens d'écrire », lue un octet en arrière —
// c'est le codage par plages du BPS, et l'applicateur du site le connaît.
const ACTION_SOURCE = 0 // SourceRead
const ACTION_CIBLE = 1 // TargetRead
const ACTION_COPIE_CIBLE = 3 // TargetCopy

// En dessous, une plage d'octets identiques coûte moins en clair qu'en
// deux actions.
const SEUIL_PLAGE = 8

/** Variante signée : le bit 0 porte le signe. */
function ecritVarintSigne(n, out) {
  ecritVarint(Math.abs(n) * 2 + (n < 0 ? 1 : 0), out)
}

const memeQueSource = (k) => k < origine.length && origine[k] === cible[k]
/** Longueur de la plage d'octets identiques qui commence en k, plafonnée. */
function plage(k, max = Infinity) {
  let j = k
  while (j < cible.length && j - k < max && cible[j] === cible[k] && !memeQueSource(j)) j++
  return j - k
}

let i = 0
let identiques = 0
let differents = 0
let plages = 0
// Position de lecture courante de TargetCopy — l'applicateur tient la même,
// et chaque décalage s'écrit relativement à elle.
let relatifCible = 0

while (i < cible.length) {
  if (memeQueSource(i)) {
    let j = i
    while (memeQueSource(j)) j++
    ecritVarint(((j - i - 1) * 4) + ACTION_SOURCE, octets)
    identiques += j - i
    i = j
    continue
  }

  const n = plage(i)
  if (n >= SEUIL_PLAGE) {
    // Un octet en clair, puis (n - 1) recopies de l'octet précédent.
    ecritVarint(ACTION_CIBLE, octets)
    octets.push(cible[i])
    ecritVarint(((n - 2) * 4) + ACTION_COPIE_CIBLE, octets)
    ecritVarintSigne(i - relatifCible, octets)
    relatifCible = i + (n - 1)
    plages += n
    i += n
    continue
  }

  // Octets neufs en clair, jusqu'au prochain octet identique à la source ou
  // à la prochaine plage qui vaut le coup.
  let j = i + 1
  while (j < cible.length && !memeQueSource(j) && plage(j, SEUIL_PLAGE) < SEUIL_PLAGE) j++
  ecritVarint(((j - i - 1) * 4) + ACTION_CIBLE, octets)
  for (let k = i; k < j; k++) octets.push(cible[k])
  differents += j - i
  i = j
}

const ecritUint32 = (v) => {
  octets.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff)
}
ecritUint32(crc32(origine))
ecritUint32(crc32(cible))
const sansSaCrc = Buffer.from(octets)
ecritUint32(crc32(sansSaCrc))

const patch = Buffer.from(octets)
writeFileSync(sortie, patch)

console.log('=== PATCH BPS ===')
console.log('Origine   : ' + origine.length.toLocaleString('fr-FR') + ' octets, CRC32 ' + crc32(origine).toString(16).toUpperCase())
console.log('Traduite  : ' + cible.length.toLocaleString('fr-FR') + ' octets, CRC32 ' + crc32(cible).toString(16).toUpperCase())
console.log('Identique : ' + identiques.toLocaleString('fr-FR') + ' octets')
console.log('Modifié   : ' + differents.toLocaleString('fr-FR') + ' octets')
console.log('Plages    : ' + plages.toLocaleString('fr-FR') + ' octets (bourrage et séries, codés par recopie)')
console.log('Patch     : ' + patch.length.toLocaleString('fr-FR') + ' octets → ' + sortie)

// --- Vérification : on RÉAPPLIQUE le patch et on compare ---
// Un patch qu'on n'a pas appliqué est un patch dont on ignore s'il fonctionne.
console.log('\n=== VÉRIFICATION PAR APPLICATION ===')

function litVarint(d, curseur) {
  let valeur = 0, facteur = 1
  for (;;) {
    const o = d[curseur.pos++]
    valeur += (o & 0x7f) * facteur
    if (o & 0x80) break
    facteur *= 128
    valeur += facteur
  }
  return valeur
}

const curseur = { pos: 4 }
const tailleSource = litVarint(patch, curseur)
const tailleCible = litVarint(patch, curseur)
// PIÈGE : ne JAMAIS écrire `curseur.pos += litVarint(patch, curseur)`.
// En JavaScript, `a += f()` lit la valeur de `a` AVANT d'évaluer `f()`. Comme
// litVarint avance curseur.pos, l'affectation écrase cet avancement par
// « ancienne valeur + taille des métadonnées ». Le curseur recule d'un octet et
// le décodeur lit une action fantôme. C'est ce qui a fait croire pendant une
// heure que le patch était corrompu, alors qu'il était juste.
const tailleMeta = litVarint(patch, curseur)
curseur.pos += tailleMeta
if (tailleSource !== origine.length) throw new Error('Taille source incohérente.')

function litVarintSigne(d, curseur) {
  const brut = litVarint(d, curseur)
  return (brut % 2 === 1 ? -1 : 1) * Math.floor(brut / 2)
}

// Même logique, mêmes noms que `site/src/lib/patch.ts` : c'est lui qui
// appliquera le patch chez l'utilisateur, et un décodeur qui divergerait ici
// validerait un patch que le site ne saurait pas lire.
const refait = Buffer.alloc(tailleCible)
let pos = 0
let lectureSource = 0
let lectureCible = 0
const fin = patch.length - 12
while (curseur.pos < fin) {
  const donnee = litVarint(patch, curseur)
  const action = donnee % 4
  const longueur = Math.floor(donnee / 4) + 1
  if (action === ACTION_SOURCE) {
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = origine[pos]
  } else if (action === ACTION_CIBLE) {
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = patch[curseur.pos++]
  } else if (action === 2) {
    lectureSource += litVarintSigne(patch, curseur)
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = origine[lectureSource++]
  } else {
    lectureCible += litVarintSigne(patch, curseur)
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = refait[lectureCible++]
  }
}

if (refait.equals(cible)) {
  console.log('✅ Le patch appliqué à la ROM d’origine redonne EXACTEMENT la ROM traduite.')
} else {
  console.log('❌ Le patch ne reproduit pas la ROM traduite.')
  console.log('   octets reconstruits : ' + pos.toLocaleString('fr-FR') + ' / ' + tailleCible.toLocaleString('fr-FR'))
  console.log('   position dans le patch : ' + curseur.pos + ' / ' + fin + ' (fin des actions)')
  let premier = -1, n = 0
  for (let k = 0; k < cible.length; k++) {
    if (refait[k] !== cible[k]) { if (premier < 0) premier = k; n++ }
  }
  console.log('   ' + n.toLocaleString('fr-FR') + ' octet(s) faux, premier à 0x' + premier.toString(16).toUpperCase())
  process.exitCode = 1
}
