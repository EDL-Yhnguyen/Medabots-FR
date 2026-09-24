// Réinsertion du script dans la ROM, avec repointage.
//
// LE TEST QUI COMPTE : sans aucune traduction, extraire puis réinsérer doit rendre
// une ROM identique au bit près. Tant qu'il échoue, l'outillage perd de
// l'information et insérer une traduction reviendrait à découvrir les dégâts trois
// cents dialogues plus tard.
//
// REPOINTAGE : les chaînes d'origine sont collées bout à bout, la place de chacune
// vaut exactement sa longueur anglaise. Le français étant plus long, une traduction
// qui ne rentre pas est RELOGÉE dans l'espace libre en fin de ROM, et son pointeur
// est réécrit. Sans ça, il faudrait abréger — ce qui reviendrait à saboter la
// traduction pour arranger l'outil.
//
// Usage :
//   node outils/reinserer.mjs <rom> <pointeurs.json> <script> [traduction] [sortie] [--identite]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { TABLE, REPLI_ACCENTS } from './table-caracteres.mjs'
import { ciblesDeTable, placeEntree } from './entrees.mjs'
import { ouvrirAccents, ACCENTS } from './accents.mjs'
import { ouvrirGuillemets } from './guillemets.mjs'

const [, , cheminRom, cheminPointeurs, dossierScript, dossierTraduction, cheminSortie] = process.argv
const identiteSeule = process.argv.includes('--identite')

const rom = readFileSync(cheminRom)
const BASE = 0x08000000

// LA ROM TRADUITE FAIT 16 Mio, L'ORIGINALE 8.
//
// L'espace libre d'origine — 48 Kio de bourrage 0x00 à partir de 0x7F4464 —
// est le seul endroit où le relogement écrit, et 929 entrées en ont pris 29.
// Les 3 400 dialogues restants en demandent de l'ordre de 100. Étendre la ROM
// est la voie classique : le GBA adresse 32 Mio de cartouche, les pointeurs
// restent des adresses absolues en 0x08xxxxxx, et rien dans le binaire ne
// référence sa propre fin (cherché : 0x08800000 et 0x087FFFFF, zéro occurrence).
//
// On étend en 0x00, comme le bourrage d'origine, et TOUJOURS en mode
// traduction — une taille qui changerait à la première table trop grosse
// serait une surprise de plus. En mode identité, on ne touche à rien : le test
// compare au bit près avec l'originale, et il doit rester possible.
const TAILLE_ETENDUE = 0x1000000
const etendre = !identiteSeule && Boolean(dossierTraduction)
const sortie = etendre
  ? Buffer.concat([rom, Buffer.alloc(TAILLE_ETENDUE - rom.length, 0)])
  : Buffer.from(rom)

// Le relogement commence dans l'espace libre d'origine et continue au-delà de
// 8 Mio sans rupture : une entrée peut chevaucher la frontière, l'espace
// d'adressage est continu. Marge de 16 octets avant la toute fin.
const LIBRE_DEBUT = 0x7f4464
const LIBRE_FIN = sortie.length - 16
let curseurLibre = LIBRE_DEBUT

// --- Table inverse ---
const INVERSE = new Map()
for (let o = 0; o < 256; o++) {
  const c = TABLE[o]
  if (c === null) continue
  if (INVERSE.has(c)) {
    throw new Error(
      `Table ambiguë : « ${c} » est rendu par 0x${INVERSE.get(c).toString(16).toUpperCase()} ` +
        `ET 0x${o.toString(16).toUpperCase()}. La réinsertion ne peut pas trancher.`,
    )
  }
  INVERSE.set(c, o)
}

let accentsReplies = 0
const accentsVus = new Set()

function encode(texte, contexte) {
  const octets = []
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (c === '{') {
      const fin = texte.indexOf('}', i)
      if (fin < 0 || fin - i !== 3) throw new Error(`${contexte} : accolade mal formée.`)
      const hex = texte.slice(i + 1, fin)
      if (!/^[0-9A-F]{2}$/.test(hex)) throw new Error(`${contexte} : « {${hex}} » n’est pas hexadécimal.`)
      octets.push(parseInt(hex, 16))
      i = fin
      continue
    }
    if (c === '…') { octets.push(0x3f, 0x3f, 0x3f); continue }

    let octet = INVERSE.get(c)
    if (octet === undefined) {
      // Le caractère n'existe pas dans la police : repli d'accent, s'il y en a un.
      const repli = REPLI_ACCENTS.get(c)
      if (repli !== undefined) {
        for (const r of repli) {
          const o = INVERSE.get(r)
          if (o === undefined) throw new Error(`${contexte} : repli « ${r} » introuvable.`)
          octets.push(o)
        }
        accentsReplies++
        accentsVus.add(c)
        continue
      }
      throw new Error(
        `${contexte} : « ${c} » (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) ` +
          `n’est ni dans la police, ni dans la table de repli.`,
      )
    }
    octets.push(octet)
  }
  return Buffer.from(octets)
}

/** Lit un dossier de fichiers @NNNN → texte. */
function litEntrees(dossier) {
  const parTable = new Map()
  if (!dossier || !existsSync(dossier)) return parTable
  for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.txt')).sort()) {
    const lignes = readFileSync(dossier + '/' + fichier, 'utf8').split('\n')
    const entrees = new Map()
    for (let i = 0; i < lignes.length; i++) {
      const m = lignes[i].match(/^@(\d{4})(?: \[0x[0-9A-F]+\])?$/)
      if (m) entrees.set(m[1], lignes[i + 1] ?? '')
    }
    parTable.set(fichier, entrees)
  }
  return parTable
}

const anglais = litEntrees(dossierScript)
const francais = litEntrees(dossierTraduction)

// --- Place disponible et adresse de chaque entrée ---
const tables = JSON.parse(readFileSync(cheminPointeurs, 'utf8'))
const infos = new Map() // fichier -> { debutTable, cibles[] }
for (const t of tables) {
  const debut = parseInt(t.adresse, 16)
  const cibles = ciblesDeTable(rom, debut, t.entrees, BASE)
  infos.set(t.adresse.replace('0x', '') + '.txt', { debut, cibles, entrees: t.entrees })
}

const dejaRelogé = new Map() // texte encodé (hex) -> adresse, pour ne pas dupliquer
let ecrites = 0
let traduites = 0
let relogees = 0
let octetsRelogés = 0
const soucis = []

for (const [fichier, entrees] of anglais) {
  const info = infos.get(fichier)
  if (!info) continue

  for (const [numero, texteAnglais] of entrees) {
    const k = parseInt(numero, 10)
    const adresse = info.cibles[k]
    const traduction = francais.get(fichier)?.get(numero)
    const texte = traduction ?? texteAnglais
    const contexte = `${fichier} @${numero}`

    let octets
    try {
      octets = encode(texte, contexte)
    } catch (e) {
      soucis.push(e.message)
      continue
    }

    const place = placeEntree(rom, info.cibles, k)

    if (traduction !== undefined) traduites++

    if (octets.length <= place) {
      octets.copy(sortie, adresse)
      ecrites++
      continue
    }

    // Ça ne rentre pas : reloger en fin de ROM et réécrire le pointeur.
    if (traduction === undefined) {
      // Du texte NON traduit qui ne rentre pas dans sa propre place est un bug
      // d'extraction, pas un problème de longueur. On refuse d'y toucher.
      soucis.push(`${contexte} : l’anglais lui-même déborde (${octets.length} > ${place}).`)
      continue
    }

    const cle = octets.toString('hex')
    let nouvelleAdresse = dejaRelogé.get(cle)
    if (nouvelleAdresse === undefined) {
      if (curseurLibre + octets.length > LIBRE_FIN) {
        soucis.push(`${contexte} : plus d’espace libre en fin de ROM pour reloger.`)
        continue
      }
      nouvelleAdresse = curseurLibre
      octets.copy(sortie, nouvelleAdresse)
      curseurLibre += octets.length
      octetsRelogés += octets.length
      dejaRelogé.set(cle, nouvelleAdresse)
    }
    sortie.writeUInt32LE(nouvelleAdresse + BASE, info.debut + k * 4)
    ecrites++
    relogees++
  }
}

console.log('=== RÉINSERTION ===')
console.log('Entrées écrites : ' + ecrites.toLocaleString('fr-FR'))
console.log('Dont traduites  : ' + traduites.toLocaleString('fr-FR'))
console.log('Dont relogées   : ' + relogees.toLocaleString('fr-FR') +
  ' (' + octetsRelogés.toLocaleString('fr-FR') + ' octets)')
console.log('Espace libre    : ' + (LIBRE_FIN - curseurLibre).toLocaleString('fr-FR') +
  ' octets restants sur ' + (LIBRE_FIN - LIBRE_DEBUT).toLocaleString('fr-FR'))
if (accentsReplies) {
  console.log('\n⚠️  ' + accentsReplies + ' signe(s) remplacé(s) faute de glyphe : ' +
    [...accentsVus].sort().join(' '))
  console.log('   La police ne les a PAS — contrairement aux accents, qui y dormaient et')
  console.log('   qu’outils/accents.mjs a réveillés, et aux guillemets français, que')
  console.log('   outils/guillemets.mjs a dessinés. Il reste neuf emplacements vides')
  console.log('   (0x4F, 0x7F-0x86). La traduction les garde.')
}
if (soucis.length) {
  console.log('\n❌ ' + soucis.length + ' problème(s) :')
  for (const s of soucis.slice(0, 12)) console.log('   ' + s)
  process.exitCode = 1
}

// --- Test d'identité (seulement s'il n'y a aucune traduction) ---
if (traduites === 0) {
  console.log('\n=== TEST D’IDENTITÉ ===')
  if (sortie.equals(rom)) {
    console.log('✅ ROM réinsérée IDENTIQUE à l’originale, au bit près.')
  } else {
    let premier = -1, differents = 0
    for (let i = 0; i < rom.length; i++) {
      if (rom[i] !== sortie[i]) { if (premier < 0) premier = i; differents++ }
    }
    console.log('❌ ' + differents.toLocaleString('fr-FR') + ' octet(s) diffèrent, ' +
      'première à 0x' + premier.toString(16).toUpperCase())
    process.exitCode = 1
  }
} else {
  console.log('\n(test d’identité sauté : ' + traduites + ' entrée(s) traduite(s))')
}

if (!identiteSeule && cheminSortie) {
  // Les accents, EN DERNIER et jamais avant le test d'identité.
  //
  // Écrire les largeurs des glyphes européens est une modification VOLONTAIRE
  // de la ROM, pas une réinsertion de texte. La mêler au test d'identité ferait
  // échouer le seul contrôle qui prouve que l'outillage ne perd rien — et on le
  // perdrait pour rien, puisque les deux ne vérifient pas la même chose.
  const n = ouvrirAccents(sortie)
  console.log('\n' + n + ' glyphe(s) européen(s) ouverts dans les deux tables de chasse.')
  console.log('   ' + ACCENTS.map(([, c]) => c).join(' '))

  // Les guillemets, eux, sont DESSINÉS, pas réveillés : la police ne les avait
  // pas. Même règle que les accents — après le test d'identité, jamais avant.
  ouvrirGuillemets(sortie)
  console.log('2 guillemet(s) dessiné(s) dans les deux polices : « »')

  writeFileSync(cheminSortie, sortie)
  console.log('\nROM écrite : ' + cheminSortie)
}
