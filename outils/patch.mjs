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

// Deux actions suffisent ici : les deux ROM ont la même taille et ne diffèrent
// que par îlots. On alterne « recopier l'original » et « écrire du neuf ».
const ACTION_SOURCE = 0 // SourceRead
const ACTION_CIBLE = 1 // TargetRead

let i = 0
let identiques = 0
let differents = 0
while (i < cible.length) {
  const memeOctet = i < origine.length && origine[i] === cible[i]
  let j = i
  while (j < cible.length && (j < origine.length && origine[j] === cible[j]) === memeOctet) j++
  const longueur = j - i

  if (memeOctet) {
    ecritVarint(((longueur - 1) * 4) + ACTION_SOURCE, octets)
    identiques += longueur
  } else {
    ecritVarint(((longueur - 1) * 4) + ACTION_CIBLE, octets)
    for (let k = i; k < j; k++) octets.push(cible[k])
    differents += longueur
  }
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

const refait = Buffer.alloc(tailleCible)
let pos = 0
const fin = patch.length - 12
while (curseur.pos < fin) {
  const donnee = litVarint(patch, curseur)
  const action = donnee % 4
  const longueur = Math.floor(donnee / 4) + 1
  if (action === ACTION_SOURCE) {
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = origine[pos]
  } else if (action === ACTION_CIBLE) {
    for (let k = 0; k < longueur; k++, pos++) refait[pos] = patch[curseur.pos++]
  } else {
    throw new Error('Action inattendue : ' + action)
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
