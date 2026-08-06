// Réinsertion du script dans la ROM, et test d'identité.
//
// LE TEST QUI COMPTE : extraire puis réinsérer SANS RIEN MODIFIER doit rendre une
// ROM identique au bit près à l'originale. Tant qu'il échoue, l'encodage perd de
// l'information quelque part, et insérer une traduction reviendrait à découvrir
// les dégâts trois cents dialogues plus tard.
//
// Usage :
//   node outils/reinserer.mjs <rom> <pointeurs.json> <dossier-script> [sortie] [--identite]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { TABLE } from './table-caracteres.mjs'

const [, , cheminRom, cheminPointeurs, dossierScript, cheminSortie] = process.argv
const identiteSeule = process.argv.includes('--identite')

const rom = readFileSync(cheminRom)
const sortie = Buffer.from(rom) // copie : l'original n'est jamais touché
const BASE = 0x08000000

// --- Place disponible par entrée ---
// Sans repointage, une entrée traduite s'écrit à son adresse d'origine. Si le
// français est plus long que l'anglais, elle DÉBORDE sur l'entrée suivante et la
// corrompt — silencieusement, car rien dans la ROM ne signale la faute. On calcule
// donc la place réellement disponible, et on refuse ce qui ne tient pas.
const placeDisponible = new Map() // "fichier@numéro" -> octets disponibles
{
  const tables = JSON.parse(readFileSync(cheminPointeurs, 'utf8'))
  for (const t of tables) {
    const debut = parseInt(t.adresse, 16)
    const cibles = []
    for (let k = 0; k < t.entrees; k++) cibles.push(rom.readUInt32LE(debut + k * 4) - BASE)
    const nomFichier = t.adresse.replace('0x', '') + '.txt'
    for (let k = 0; k < t.entrees; k++) {
      let fin = rom.length
      for (let j = k + 1; j < t.entrees; j++) {
        if (cibles[j] > cibles[k]) { fin = cibles[j]; break }
      }
      placeDisponible.set(nomFichier + '@' + String(k).padStart(4, '0'), Math.min(fin - cibles[k], 2048))
    }
  }
}

// --- Table inverse : caractère -> octet ---
const INVERSE = new Map()
for (let o = 0; o < 256; o++) {
  const c = TABLE[o]
  if (c === null) continue
  // Si deux octets rendaient le même caractère, l'encodage serait ambigu et le
  // test d'identité échouerait sans qu'on sache pourquoi. Autant le dire ici.
  if (INVERSE.has(c)) {
    throw new Error(
      `Table ambiguë : « ${c} » est rendu par 0x${INVERSE.get(c).toString(16).toUpperCase()} ` +
        `ET 0x${o.toString(16).toUpperCase()}. La réinsertion ne peut pas trancher.`,
    )
  }
  INVERSE.set(c, o)
}

class ErreurEncodage extends Error {}

/** Encode une ligne de texte extraite en octets. */
function encode(texte, contexte) {
  const octets = []
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]

    // {XX} — octet brut, non identifié ou code de contrôle.
    if (c === '{') {
      const fin = texte.indexOf('}', i)
      if (fin < 0 || fin - i !== 3) {
        throw new ErreurEncodage(`${contexte} : accolade mal formée à la position ${i}.`)
      }
      const hex = texte.slice(i + 1, fin)
      if (!/^[0-9A-F]{2}$/.test(hex)) {
        throw new ErreurEncodage(`${contexte} : « {${hex}} » n’est pas un octet hexadécimal.`)
      }
      octets.push(parseInt(hex, 16))
      i = fin
      continue
    }

    // Raccourci de confort pour la traduction : « … » vaut trois points d'ellipse.
    if (c === '…') {
      octets.push(0x3f, 0x3f, 0x3f)
      continue
    }

    const octet = INVERSE.get(c)
    if (octet === undefined) {
      throw new ErreurEncodage(
        `${contexte} : le caractère « ${c} » (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) ` +
          `n’existe pas dans la police du jeu.`,
      )
    }
    octets.push(octet)
  }
  return Buffer.from(octets)
}

// --- Lecture des fichiers extraits ---
const fichiers = readdirSync(dossierScript).filter((f) => f.endsWith('.txt')).sort()
let entrees = 0
let octetsEcrits = 0
const soucis = []
const debordements = []

for (const fichier of fichiers) {
  const lignes = readFileSync(dossierScript + '/' + fichier, 'utf8').split('\n')
  for (let i = 0; i < lignes.length; i++) {
    const marque = lignes[i].match(/^@(\d{4}) \[0x([0-9A-F]+)\]$/)
    if (!marque) continue
    const numero = marque[1]
    const adresse = parseInt(marque[2], 16)
    const texte = lignes[i + 1] ?? ''
    const contexte = `${fichier} @${numero}`

    let octets
    try {
      octets = encode(texte, contexte)
    } catch (e) {
      soucis.push(e.message)
      continue
    }

    // Garde-fou : refuser ce qui déborde, plutôt que corrompre l'entrée suivante.
    const place = placeDisponible.get(fichier + '@' + numero)
    if (place !== undefined && octets.length > place) {
      debordements.push(
        `${contexte} : ${octets.length} octets pour ${place} disponibles ` +
          `(${octets.length - place} de trop). Raccourcir, ou attendre le repointage.`,
      )
      continue
    }

    octets.copy(sortie, adresse)
    entrees++
    octetsEcrits += octets.length
  }
}

console.log('=== RÉINSERTION ===')
console.log('Fichiers : ' + fichiers.length)
console.log('Entrées  : ' + entrees.toLocaleString('fr-FR'))
console.log('Octets   : ' + octetsEcrits.toLocaleString('fr-FR'))
if (soucis.length) {
  console.log('\n❌ ' + soucis.length + ' entrée(s) non encodée(s) :')
  for (const s of soucis.slice(0, 12)) console.log('   ' + s)
  process.exitCode = 1
}
if (debordements.length) {
  console.log('\n❌ ' + debordements.length + ' entrée(s) trop longue(s), NON écrite(s) :')
  for (const d of debordements.slice(0, 12)) console.log('   ' + d)
  process.exitCode = 1
}

// --- Test d'identité ---
console.log('\n=== TEST D’IDENTITÉ ===')
if (sortie.equals(rom)) {
  console.log('✅ La ROM réinsérée est IDENTIQUE à l’originale, au bit près.')
  console.log('   L’encodage ne perd rien. La réinsertion est fiable.')
} else {
  let premier = -1
  let differents = 0
  for (let i = 0; i < rom.length; i++) {
    if (rom[i] !== sortie[i]) {
      if (premier < 0) premier = i
      differents++
    }
  }
  console.log('❌ ' + differents.toLocaleString('fr-FR') + ' octet(s) diffèrent.')
  console.log('   Première différence à 0x' + premier.toString(16).toUpperCase())
  const deb = Math.max(0, premier - 12)
  console.log('   originale : ' + rom.subarray(deb, premier + 16).toString('hex').toUpperCase())
  console.log('   réinsérée : ' + sortie.subarray(deb, premier + 16).toString('hex').toUpperCase())
  process.exitCode = 1
}

if (!identiteSeule && cheminSortie) {
  writeFileSync(cheminSortie, sortie)
  console.log('\nROM écrite : ' + cheminSortie)
}
