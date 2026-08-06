// Chaîne de vérification du projet : `npm run verifier`.
//
// Elle enchaîne recherche de pointeurs → extraction → réinsertion → test
// d'identité. Le test d'identité est le seul qui compte vraiment : si extraire
// puis réinsérer sans rien changer ne rend pas la ROM d'origine au bit près,
// alors l'outillage perd de l'information et aucune traduction n'est fiable.
//
// La ROM n'étant pas dans le dépôt, son chemin se donne par la variable
// d'environnement MEDABOTS_ROM ou en argument.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const SHA1_REFERENCE = 'CD3D674E88F40A0707B150C4293588A659001D29'

const rom = process.argv[2] ?? process.env.MEDABOTS_ROM
if (!rom) {
  console.error('Chemin de la ROM absent.\n')
  console.error('  MEDABOTS_ROM="C:/chemin/vers/Medabots - Metabee (Europe).gba" npm run verifier')
  console.error('  ou : node outils/verifier.mjs "C:/chemin/vers/rom.gba"')
  process.exit(2)
}
if (!existsSync(rom)) {
  console.error('Fichier introuvable : ' + rom)
  process.exit(2)
}

// Une ROM différente donnerait des adresses fausses sans le moindre avertissement.
const empreinte = createHash('sha1').update(readFileSync(rom)).digest('hex').toUpperCase()
if (empreinte !== SHA1_REFERENCE) {
  console.error('❌ Ce n’est pas la ROM de référence.')
  console.error('   attendu : ' + SHA1_REFERENCE)
  console.error('   obtenu  : ' + empreinte)
  console.error('\n   Le projet ne vaut que pour « Medabots - Metabee (Europe) ».')
  process.exit(2)
}

const etapes = [
  ['Recherche des tables de pointeurs', ['outils/pointeurs.mjs', rom, 'travail/pointeurs.json']],
  ['Extraction du script', ['outils/extraire.mjs', rom, 'travail/pointeurs.json', 'travail/script']],
  [
    'Réinsertion et test d’identité',
    ['outils/reinserer.mjs', rom, 'travail/pointeurs.json', 'travail/script', '', '--identite'],
  ],
]

let numero = 0
for (const [titre, args] of etapes) {
  numero++
  console.log(`\n━━ ${numero}/${etapes.length}  ${titre}`)
  try {
    const sortie = execFileSync(process.execPath, args, { encoding: 'utf8' })
    // On ne réaffiche que l'essentiel : les totaux et le verdict.
    for (const ligne of sortie.split('\n')) {
      if (/^(Tables|Entrées|Octets|Fichiers|Purge|Pointant|Estimation|✅|❌|Suites)/.test(ligne.trim())) {
        console.log('   ' + ligne.trim())
      }
    }
  } catch (e) {
    console.log(e.stdout ?? '')
    console.error('\n❌ Échec à l’étape : ' + titre)
    process.exit(1)
  }
}

console.log('\n✅ Chaîne complète au vert. L’outillage ne perd rien.')
