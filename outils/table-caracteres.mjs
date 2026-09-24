// Table de caractères du jeu — source unique.
//
// Elle était recopiée dans trois scripts, et une correction n'en atteignait qu'un.
// Tout outil qui décode du texte importe CE fichier.
//
// Chaque valeur ci-dessous est établie par un contexte réel du script extrait,
// cité en commentaire. Rien n'est deviné : une supposition non marquée finit
// toujours par être prise pour un fait.

export const TABLE = new Array(256).fill(null)

for (let i = 0; i < 26; i++) {
  TABLE[0x01 + i] = String.fromCharCode(65 + i) // A..Z
  TABLE[0x1b + i] = String.fromCharCode(97 + i) // a..z
}
for (let i = 0; i < 10; i++) TABLE[0x35 + i] = String.fromCharCode(48 + i) // 0..9

TABLE[0x00] = ' '

// ATTENTION — deux points différents, et il faut les distinguer.
// 0x3F et 0x40 sont deux glyphes distincts du jeu. Les rendre tous les deux « . »
// rendrait la réinsertion IMPOSSIBLE : rien ne dirait lequel réécrire. 0x3F,
// qui s'emploie par trois pour l'ellipse, prend donc le point médian « · ».
// À la réinsertion, « … » est accepté comme raccourci pour trois 0x3F.
TABLE[0x3f] = '·' // « every now and th···Zzz···Zzz. » — le point d'ellipse
TABLE[0x40] = '.' // « Select Corps. garbage » — le point de fin de phrase
TABLE[0x41] = ','
TABLE[0x42] = "'" // « Let's continue »
TABLE[0x43] = '-' // « fix-up broken Medaparts », « I-I-I, in the whole town »
TABLE[0x44] = '/' // « L/R Buttons »
TABLE[0x46] = '?' // « Is everyone alright? », « Shouldn't you be studying? »
TABLE[0x47] = '!' // « Mom, Dad, I'm home! »
TABLE[0x48] = '"' // « "Medabots Weekly" » — guillemet, ouvrant et fermant
TABLE[0x49] = '('
TABLE[0x4a] = ')'
TABLE[0x4b] = '♥' // lus directement dans la police, à 0x4BFC64
TABLE[0x4c] = '£'
TABLE[0x4d] = '&'
TABLE[0x4e] = '%'

// LE JEU EUROPÉEN, 0x50 à 0x7C.
//
// La ROM est une version Europe : les glyphes accentués des quatre langues du
// continent DORMAIENT DÉJÀ dans la police, aux emplacements suivant le 79e.
// Rien n'a eu à être dessiné ni relogé. Ce qui les rendait inatteignables, ce
// sont les tables de chasse, à zéro sur ces codes : le jeu ignorait leur
// largeur, donc ne les employait jamais.
//
// Le catalogue et les largeurs vivent dans outils/accents.mjs, qui les écrit
// dans la ROM livrée. Ce fichier-ci ne dit que la correspondance texte↔octet.

const EUROPEEN = {
  0x50: 'Ä', 0x51: 'ä', 0x52: 'Á', 0x53: 'á', 0x54: 'Â', 0x55: 'â',
  0x56: 'È', 0x57: 'è', 0x58: 'É', 0x59: 'é', 0x5a: 'Ê', 0x5b: 'ê',
  0x5c: 'Ë', 0x5d: 'ë', 0x5e: 'Î', 0x5f: 'î', 0x60: 'Ï', 0x61: 'ï',
  0x62: 'Í', 0x63: 'í', 0x64: 'Ö', 0x65: 'ö', 0x66: 'Ô', 0x67: 'ô',
  0x68: 'Ó', 0x69: 'ó', 0x6a: 'Ü', 0x6b: 'ü', 0x6c: 'Û', 0x6d: 'û',
  0x6e: 'Ù', 0x6f: 'ù', 0x70: 'Ú', 0x71: 'ú', 0x72: 'ß', 0x73: 'Ç',
  0x74: 'ç', 0x75: 'Ñ', 0x76: 'ñ', 0x77: '¡', 0x78: '¿', 0x79: 'À',
  0x7a: 'à', 0x7b: 'Œ', 0x7c: 'œ',
}
/**
 * LA TABLE DE LECTURE, arrêtée à 0x4E.
 *
 * Le texte ANGLAIS de la ROM n'emploie aucun code européen : ces glyphes n'ont
 * jamais été atteignables. Décoder avec la table étendue rendrait donc lisibles
 * des octets qui ne sont pas du texte — et c'est exactement ce qui s'est produit
 * la première fois : le détecteur de tables est passé de 33 à 35 tables et de
 * 5 933 à 6 047 entrées, deux zones de données ayant franchi le seuil de
 * lisibilité par les seuls codes 0x50-0x7C.
 *
 * D'où la règle : ON LIT L'ANGLAIS AVEC LA TABLE D'ORIGINE, ON N'ÉCRIT LE
 * FRANÇAIS QU'AVEC LA TABLE ÉTENDUE.
 */
export const TABLE_LECTURE = TABLE.slice()

for (const [code, car] of Object.entries(EUROPEEN)) TABLE[Number(code)] = car

// LES GUILLEMETS FRANÇAIS, dessinés le 25/09/2026.
//
// Contrairement aux accents, ils n'étaient PAS dans la police : aucune des
// quatre langues du continent ne les emploie sous cette forme. Ils sont dessinés
// par outils/guillemets.mjs dans deux des onze emplacements vides, et c'est ce
// qui a fait disparaître les 68 derniers replis du projet.
//
// Ces deux codes sont posés APRÈS la prise de TABLE_LECTURE, plus haut : le
// détecteur de tables de pointeurs continue de lire l'anglais avec la table
// arrêtée à 0x4E, et reste à 33 tables. Les ajouter avant l'aurait déplacé,
// comme l'avait fait le bloc européen (docs/format.md § 4 bis).
TABLE[0x7d] = '«'
TABLE[0x7e] = '»'

// Restent neuf emplacements de glyphe vides : 0x4F, puis 0x7F à 0x86.

TABLE[0x45] = ':' // « Key: A Class », « Key: B Class », « It says: » — établi

/**
 * Codes de contrôle repérés. Leurs PARAMÈTRES ne sont pas des caractères :
 * l'octet qui suit 0xFB porte vraisemblablement le portrait ou le locuteur.
 * C'est ce qui explique l'essentiel des « octets inconnus » d'une extraction
 * brute — ce ne sont pas des lettres manquantes, ce sont des arguments.
 */
export const CONTROLES = {
  0xf7: 'vitesse d’affichage — suivi d’un paramètre',
  0xf8: 'italique (propre à la version anglaise)',
  0xf9: 'insertion d’une variable depuis la RAM — suivi d’un paramètre',
  0xfa: 'contrôle (rôle à établir)',
  0xfb: 'portrait / locuteur — suivi de trois octets',
  0xfc: 'nouvelle boîte de dialogue',
  0xfd: 'saut de ligne',
  0xfe: 'fin d’entrée (listes)',
  0xff: 'fin de message — suivi d’un paramètre',
}

// Source : les notes de hacking de Kimbles sur Medarot 2 Core (Medapedia), dont
// ce jeu est le portage. Elles confirment 0xFC, 0xFD, 0xFE, 0xFF tels qu'ils
// avaient été déduits du script, et établissent 0xF7, 0xF8 et 0xF9 qui restaient
// marqués « rôle à établir ».
//
// 0xF8 = italique explique enfin ce qui encadre les onomatopées des scènes
// cinématiques : {F8}BA DA DA DA BOOOM!!{F8} s'affiche en italique.
// https://medarot.meowcorp.us/wiki/User:Kimbles/Medarot_2_Core_Hacking_Notes

/** Rend un octet : le caractère s'il est connu, sinon {XX} — visible et réversible. */
export function rendOctet(octet) {
  return TABLE[octet] !== null
    ? TABLE[octet]
    : '{' + octet.toString(16).toUpperCase().padStart(2, '0') + '}'
}

/** Idem, mais avec la table de LECTURE : pour tout ce qui décode la ROM anglaise. */
export function rendOctetLecture(octet) {
  return TABLE_LECTURE[octet] !== null
    ? TABLE_LECTURE[octet]
    : '{' + octet.toString(16).toUpperCase().padStart(2, '0') + '}'
}

/**
 * CARACTÈRES ABSENTS DE LA POLICE : + ; * = # @ [ ] < > et tout le reste
 * au-delà de 0x4E.
 *
 * Établi en lisant la police elle-même (0x4BFC64), plus par constat à
 * l'insertion. Écrire « Puissance + » fait échouer l'insertion — ce qui est le
 * bon comportement : mieux vaut un refus net qu'un carré vide à l'écran. D'où
 * « Gain puissance ».
 *
 * Corrigé le 06/08 : `&` et `%` avaient été listés absents à tort, faute d'avoir
 * vu la police. Ils existent, en 0x4D et 0x4E.
 */

/**
 * Repli, pour le peu qui manque encore.
 *
 * La traduction s'écrit AVEC ses accents — « Régénération », pas « Regeneration ».
 * Appauvrir le vocabulaire pour contourner une limite de l'outillage reviendrait
 * à laisser cette limite décider du texte français, et il faudrait tout relire le
 * jour où elle tombe.
 *
 * C'est exactement ce qui s'est passé le 25/08/2026 : les glyphes ont été
 * ajoutés à TABLE et les quelque 700 replis ont disparu SANS QU'UN SEUL MOT
 * SOIT RÉÉCRIT. Écrire les accents dès le premier jour aura donc bien été le
 * bon choix.
 */
export const REPLI_ACCENTS = new Map(
  Object.entries({
    // Tout ce que la police PORTE a quitté cette table. Les guillemets français
    // en sont sortis le 25/09/2026, une fois dessinés. Ne reste que ce qu'elle
    // n'a vraiment pas : la ligature æ, les tirets longs et le y tréma.
    æ: 'ae', Æ: 'AE',
    '’': "'", '‘': "'", '–': '-', '—': '-',
    ÿ: 'y', Ÿ: 'Y',
  }),
)
