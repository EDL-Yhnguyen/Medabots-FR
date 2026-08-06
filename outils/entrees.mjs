// Calcul de l'étendue d'une entrée de texte — source unique.
//
// Cette logique était recopiée dans extraire.mjs, reinserer.mjs et lister.mjs.
// Trois copies, et un défaut n'en atteignait qu'une.
//
// LE PIÈGE QU'ELLE FERME : la DERNIÈRE entrée d'une table n'a pas d'entrée
// suivante pour la borner. On lisait alors 2048 octets « au cas où » — ce qui
// traverse allègrement la table de pointeurs voisine. La réécrire telle quelle
// restaure les pointeurs d'ORIGINE et défait silencieusement le repointage.
//
// Le test d'identité ne voyait rien : ces octets sont identiques à l'original,
// c'est justement le problème. Il a fallu constater qu'un pointeur traduit visait
// le milieu d'une autre chaîne pour s'en apercevoir.
//
// Une entrée s'arrête donc au premier terminateur si rien d'autre ne la borne.

const FIN_ENTREE = 0xfe // fin d'entrée de liste
const FIN_MESSAGE = 0xff // fin de message
const GARDE_MAX = 2048 // filet, si aucun terminateur n'est trouvé

/** Adresses cibles d'une table de pointeurs. */
export function ciblesDeTable(rom, adresseTable, nbEntrees, base = 0x08000000) {
  const cibles = []
  for (let k = 0; k < nbEntrees; k++) cibles.push(rom.readUInt32LE(adresseTable + k * 4) - base)
  return cibles
}

/**
 * Fin (exclue) de l'entrée k : la prochaine cible strictement supérieure, ou —
 * à défaut — juste après le premier terminateur rencontré.
 */
export function finEntree(rom, cibles, k) {
  const debut = cibles[k]

  // Borne dure : jamais au-delà de l'entrée suivante.
  let borne = rom.length
  for (let j = k + 1; j < cibles.length; j++) {
    if (cibles[j] > debut) { borne = cibles[j]; break }
  }
  const plafond = Math.min(borne, debut + GARDE_MAX, rom.length)

  // Une entrée finit à son terminateur. S'en tenir à la borne suivante suffisait
  // tant que les entrées étaient jointives ; dès qu'il y a un trou, on avalait
  // les données voisines — et les réécrire écrasait une table de pointeurs.
  for (let i = debut; i < plafond; i++) {
    if (rom[i] === FIN_ENTREE) return i + 1
    // 0xFF est suivi d'un octet de paramètre : le laisser derrière soi le
    // perdrait au relogement.
    if (rom[i] === FIN_MESSAGE) return Math.min(i + 2, plafond)
  }
  return plafond
}

/** Place disponible pour l'entrée k, en octets. */
export function placeEntree(rom, cibles, k) {
  return finEntree(rom, cibles, k) - cibles[k]
}
