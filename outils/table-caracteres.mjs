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

TABLE[0x45] = ':' // « Key: A Class », « Key: B Class », « It says: » — établi

/**
 * Codes de contrôle repérés. Leurs PARAMÈTRES ne sont pas des caractères :
 * l'octet qui suit 0xFB porte vraisemblablement le portrait ou le locuteur.
 * C'est ce qui explique l'essentiel des « octets inconnus » d'une extraction
 * brute — ce ne sont pas des lettres manquantes, ce sont des arguments.
 */
export const CONTROLES = {
  0xf8: 'contrôle (rôle à établir)',
  0xf9: 'contrôle (rôle à établir)',
  0xfa: 'contrôle (rôle à établir)',
  0xfb: 'début de réplique — suivi de paramètres',
  0xfc: 'attente / page suivante',
  0xfd: 'saut de ligne',
  0xfe: 'fin d’entrée (listes)',
  0xff: 'fin de message — suivi d’un paramètre',
}

/** Rend un octet : le caractère s'il est connu, sinon {XX} — visible et réversible. */
export function rendOctet(octet) {
  return TABLE[octet] !== null
    ? TABLE[octet]
    : '{' + octet.toString(16).toUpperCase().padStart(2, '0') + '}'
}

/**
 * CARACTÈRES ABSENTS DE LA POLICE, constatés à l'insertion :
 *
 *   +  &  %  ;  *  =  #  @  [  ]  <  >
 *
 * Le jeu n'en a pas le glyphe. Écrire « Puissance + » fait échouer l'insertion —
 * ce qui est le bon comportement : mieux vaut un refus net qu'un carré vide à
 * l'écran. Pour les suffixes d'amélioration, la traduction emploie « Gain »
 * (« Gain puissance ») plutôt qu'un signe que la police ne sait pas dessiner.
 *
 * Cette liste s'allonge à mesure des découvertes ; la chaîne de vérification la
 * fait respecter toute seule.
 */

/**
 * Repli d'accents, en attendant que la police porte les glyphes français.
 *
 * La traduction s'écrit AVEC ses accents — « Régénération », pas « Regeneration ».
 * Appauvrir le vocabulaire pour contourner une limite de l'outillage reviendrait
 * à laisser cette limite décider du texte français, et il faudrait tout relire le
 * jour où elle tombe.
 *
 * Tant que la police ne porte pas ces glyphes, l'insertion les remplace ici et
 * compte les remplacements. Le jour où ils existent, il suffira de les ajouter à
 * TABLE : les mêmes fichiers de traduction deviendront corrects sans qu'un seul
 * mot soit réécrit.
 */
export const REPLI_ACCENTS = new Map(
  Object.entries({
    à: 'a', â: 'a', ä: 'a',
    é: 'e', è: 'e', ê: 'e', ë: 'e',
    î: 'i', ï: 'i',
    ô: 'o', ö: 'o',
    ù: 'u', û: 'u', ü: 'u',
    ç: 'c',
    À: 'A', Â: 'A', Ä: 'A',
    É: 'E', È: 'E', Ê: 'E', Ë: 'E',
    Î: 'I', Ï: 'I',
    Ô: 'O', Ö: 'O',
    Ù: 'U', Û: 'U', Ü: 'U',
    Ç: 'C',
    œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE',
    '«': '"', '»': '"',
    '’': "'", '‘': "'", '–': '-', '—': '-',
  }),
)
