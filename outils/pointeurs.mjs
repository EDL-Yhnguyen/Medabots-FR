// Recherche des tables de pointeurs de texte.
//
// Sur GBA la ROM est mappée en 0x08000000 : un pointeur est donc un entier 32 bits
// petit-boutiste dont l'octet de poids fort vaut 0x08 (ou 0x09 au-delà de 16 Mio).
// Une table de pointeurs se voit comme une longue suite de tels entiers.
//
// Mais ça ne suffit PAS : les « pools de littéraux » du code ARM contiennent aussi
// des adresses et produisent les mêmes suites. Le seul critère qui tranche, c'est
// que la cible doit se décoder en texte lisible avec notre table.
import { readFileSync, writeFileSync } from 'node:fs'
import { TABLE as table } from './table-caracteres.mjs'

const rom = readFileSync(process.argv[2])
const BASE = 0x08000000

const MARQUE_CONTROLE = '¤' // surtout PAS « · » : c'est le point d'ellipse (0x3F)
const MARQUE_INCONNU = '×'

/** Décode un message jusqu'à 0xFF (fin) ou jusqu'à `max` octets. */
function decode(depart, max = 90) {
  let s = ''
  for (let i = depart; i < rom.length && s.length < max; i++) {
    const c = rom[i]
    if (c === 0xff) break
    if (c === 0xfd) { s += ' ⏎ '; continue }
    if (c === 0xfe) { s += ' | '; continue }
    if (c >= 0xf8) { s += MARQUE_CONTROLE; continue }
    s += table[c] !== null ? table[c] : MARQUE_INCONNU
  }
  return s
}

// La liste des caractères « lisibles » se DÉDUIT de la table, elle ne se recopie
// pas. Elle était écrite en dur, et le jour où 0x3F est passé de « . » à « · »
// une table de script entière a été rejetée sans que rien ne le signale — c'est
// la chaîne de vérification qui l'a rattrapé.
const CARACTERES_CONNUS = new Set(table.filter((c) => c !== null))

/** Part de texte réellement lisible dans une chaîne décodée. */
function lisibilite(s) {
  if (s.length < 6) return 0
  let bons = 0
  for (const c of s) {
    if (CARACTERES_CONNUS.has(c) || c === MARQUE_CONTROLE || c === '⏎' || c === '|') bons++
  }
  return bons / s.length
}

// Un taux de caractères « lisibles » ne suffit pas : des données binaires
// structurées le franchissent (constaté sur 0x412E60 et 0x3D1D94, notées 86-87 %
// alors qu'elles ne contiennent aucun texte). Le test qui tranche vraiment :
// du dialogue anglais contient des mots anglais courants.
const MOTS_COURANTS =
  /\b(the|you|and|to|is|it|of|in|that|for|have|this|we|not|my|me|are|your|but|with|what|can|will|all|was|from|they|there|out|about|just|like|know|get|one|now|here|our|who|when|how|his|her|him|she|he|do|don|let|go|see|been|has|had|them|then|than|some|more|very|too|so|if|no|yes|on|at|be|as|an|by|up|or|us)\b/g

function motsAnglais(echantillons) {
  const texte = echantillons.join(' ').toLowerCase()
  return (texte.match(MOTS_COURANTS) ?? []).length
}

const estPointeur = (v) => {
  const haut = v >>> 24
  if (haut !== 0x08 && haut !== 0x09) return false
  const cible = v - BASE
  return cible >= 0 && cible < rom.length
}

// --- Détection des suites de pointeurs ---
console.log('=== SUITES DE POINTEURS (>= 12 entrées consécutives) ===\n')
const suites = []
let debut = -1
let n = 0
for (let i = 0; i + 4 <= rom.length; i += 4) {
  if (estPointeur(rom.readUInt32LE(i))) {
    if (debut < 0) { debut = i; n = 0 }
    n++
  } else {
    if (n >= 12) suites.push({ debut, nombre: n })
    debut = -1
    n = 0
  }
}
if (n >= 12) suites.push({ debut, nombre: n })

// --- Vérification : les cibles se décodent-elles en texte ? ---
// C'est ce test qui sépare une vraie table de script d'un pool de littéraux ARM.
for (const s of suites) {
  const echantillon = []
  const pas = Math.max(1, Math.floor(s.nombre / 12))
  for (let k = 0; k < s.nombre && echantillon.length < 12; k += pas) {
    const cible = rom.readUInt32LE(s.debut + k * 4) - BASE
    echantillon.push(decode(cible))
  }
  s.note = echantillon.reduce((a, t) => a + lisibilite(t), 0) / echantillon.length
  s.mots = motsAnglais(echantillon)
  s.echantillon = echantillon

  // Une table de script est presque toujours triée par adresse croissante.
  let croissant = 0
  for (let k = 1; k < s.nombre; k++) {
    if (rom.readUInt32LE(s.debut + k * 4) >= rom.readUInt32LE(s.debut + (k - 1) * 4)) croissant++
  }
  s.croissance = croissant / (s.nombre - 1)
}

// Deux natures de texte, et un seul critère les manquerait toutes les deux :
//  - les DIALOGUES sont des phrases : ils contiennent des mots anglais courants ;
//  - les LISTES (noms de pièces, d'objets, de médailles) n'en contiennent aucun —
//    « PSYCHO MISSILE | ELECTO MISSILE » — mais elles sont truffées du séparateur
//    d'entrée 0xFE, rendu « | » au décodage.
// N'exiger que des mots anglais rejetait la table des 480 Medaparts. C'est du texte
// à traduire au même titre que le reste.
const estListe = (s) => s.note > 0.92 && (s.echantillon.join('').match(/\|/g) ?? []).length >= 4
const estTexte = (s) => s.note > 0.9 && (s.mots >= 6 || estListe(s))
const vraies = suites.filter(estTexte).sort((a, b) => b.nombre - a.nombre)
const limites = suites.filter((s) => !estTexte(s) && s.note > 0.85)

console.log('Suites détectées        : ' + suites.length)
console.log('Pointant vers du texte  : ' + vraies.length + '  ← les tables de script')
console.log('Lisibles mais sans mots : ' + limites.length + '  ← écartées, ce ne sont pas des dialogues')
console.log('Entrées de texte totales: ' + vraies.reduce((a, s) => a + s.nombre, 0) + '\n')

for (const s of vraies) {
  console.log('─'.repeat(78))
  console.log('Table 0x' + s.debut.toString(16).toUpperCase().padStart(6, '0') +
    '  ·  ' + s.nombre + ' entrées' +
    '  ·  lisibilité ' + (s.note * 100).toFixed(0) + ' %' +
    '  ·  ' + s.mots + ' mots anglais' +
    '  ·  ' + (s.croissance * 100).toFixed(0) + ' % croissant')
  console.log('    « ' + s.echantillon[0].trim().slice(0, 88) + ' »')
}

if (limites.length) {
  console.log('\n=== ÉCARTÉES DE JUSTESSE (lisibles, mais sans mots anglais) ===')
  for (const s of limites) {
    console.log('  0x' + s.debut.toString(16).toUpperCase().padStart(6, '0') +
      '  ' + String(s.nombre).padStart(4) + ' entrées, ' + (s.note * 100).toFixed(0) + ' % lisible, ' +
      s.mots + ' mots')
    console.log('      « ' + s.echantillon[0].trim().slice(0, 70) + ' »')
  }
}

// --- Fichier récapitulatif pour la suite du projet ---
const rapport = vraies.map((s) => ({
  adresse: '0x' + s.debut.toString(16).toUpperCase().padStart(6, '0'),
  entrees: s.nombre,
  lisibilite: +(s.note * 100).toFixed(1),
  croissant: +(s.croissance * 100).toFixed(1),
  premiereCible: '0x' + (rom.readUInt32LE(s.debut) - BASE).toString(16).toUpperCase(),
}))
writeFileSync(process.argv[3], JSON.stringify(rapport, null, 2))
console.log('\n' + '─'.repeat(78))
console.log('Récapitulatif écrit : ' + process.argv[3])
