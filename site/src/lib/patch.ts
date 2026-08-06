/**
 * Application de patchs IPS et BPS, entièrement dans le navigateur.
 *
 * Rien ne part sur un serveur : la ROM de l'utilisateur est lue en mémoire,
 * le patch lui est appliqué, et le résultat est passé à l'émulateur.
 * Aucune écriture disque, aucun envoi réseau.
 */

export class ErreurPatch extends Error {}

/* ------------------------------------------------------------------ IPS ---- */

/**
 * IPS : suite d'enregistrements « à l'octet N, écris ces octets ».
 * Format simple mais limité à 16 Mio et sans contrôle d'intégrité — d'où BPS.
 */
export function appliqueIps(source: Uint8Array, patch: Uint8Array): Uint8Array {
  const entete = String.fromCharCode(...patch.subarray(0, 5))
  if (entete !== 'PATCH') throw new ErreurPatch('Ce fichier n’est pas un patch IPS.')

  // Copie : on ne modifie jamais l'original. Le paramètre de type explicite est
  // nécessaire depuis TypeScript 5.7, où Uint8Array est générique sur son tampon.
  let agrandi: Uint8Array<ArrayBuffer> = new Uint8Array(source)
  let pos = 5

  for (;;) {
    if (pos + 3 > patch.length) throw new ErreurPatch('Patch IPS tronqué : fin « EOF » absente.')
    // Le marqueur de fin est littéralement les trois octets « EOF ».
    if (patch[pos] === 0x45 && patch[pos + 1] === 0x4f && patch[pos + 2] === 0x46) {
      pos += 3
      break
    }
    const decalage = (patch[pos] << 16) | (patch[pos + 1] << 8) | patch[pos + 2]
    pos += 3
    const taille = (patch[pos] << 8) | patch[pos + 1]
    pos += 2

    if (taille === 0) {
      // Enregistrement RLE : une même valeur répétée.
      const repetitions = (patch[pos] << 8) | patch[pos + 1]
      pos += 2
      const valeur = patch[pos++]
      agrandi = agrandirSiBesoin(agrandi, decalage + repetitions)
      agrandi.fill(valeur, decalage, decalage + repetitions)
    } else {
      agrandi = agrandirSiBesoin(agrandi, decalage + taille)
      agrandi.set(patch.subarray(pos, pos + taille), decalage)
      pos += taille
    }
  }

  // Un IPS peut se terminer par une troncature sur 3 octets.
  if (pos + 3 <= patch.length) {
    const nouvelleTaille = (patch[pos] << 16) | (patch[pos + 1] << 8) | patch[pos + 2]
    if (nouvelleTaille > 0 && nouvelleTaille < agrandi.length) {
      return agrandi.subarray(0, nouvelleTaille)
    }
  }
  return agrandi
}

function agrandirSiBesoin(
  tableau: Uint8Array<ArrayBuffer>,
  taille: number,
): Uint8Array<ArrayBuffer> {
  if (taille <= tableau.length) return tableau
  const plus = new Uint8Array(taille)
  plus.set(tableau)
  return plus
}

/* ------------------------------------------------------------------ BPS ---- */

/**
 * BPS : format de delta moderne. Il porte les sommes de contrôle CRC32 de la
 * source, de la cible et du patch lui-même — donc il refuse de s'appliquer à la
 * mauvaise ROM au lieu de produire un jeu cassé. C'est le format qu'on livrera.
 */
export function appliqueBps(source: Uint8Array, patch: Uint8Array): Uint8Array {
  if (String.fromCharCode(...patch.subarray(0, 4)) !== 'BPS1') {
    throw new ErreurPatch('Ce fichier n’est pas un patch BPS.')
  }

  const curseur = { pos: 4 }
  const tailleSource = litVarint(patch, curseur)
  const tailleCible = litVarint(patch, curseur)
  const tailleMeta = litVarint(patch, curseur)
  curseur.pos += tailleMeta

  if (tailleSource !== source.length) {
    throw new ErreurPatch(
      `Ce patch attend une ROM de ${tailleSource.toLocaleString('fr-FR')} octets, ` +
        `la vôtre en fait ${source.length.toLocaleString('fr-FR')}.`,
    )
  }

  const crcSourceAttendu = litUint32(patch, patch.length - 12)
  const crcSourceReel = crc32(source)
  if (crcSourceAttendu !== crcSourceReel) {
    throw new ErreurPatch(
      'Ce patch ne correspond pas à votre ROM (empreinte CRC32 différente). ' +
        'Vérifiez que vous utilisez bien la version européenne.',
    )
  }

  const cible = new Uint8Array(tailleCible)
  let sortie = 0
  let relatifSource = 0
  let relatifCible = 0
  const fin = patch.length - 12

  while (curseur.pos < fin) {
    const donnee = litVarint(patch, curseur)
    const action = donnee % 4
    const longueur = Math.floor(donnee / 4) + 1

    switch (action) {
      case 0: // SourceRead — recopier depuis la ROM d'origine, à la même position
        for (let i = 0; i < longueur; i++, sortie++) cible[sortie] = source[sortie]
        break
      case 1: // TargetRead — octets neufs, écrits en clair dans le patch
        for (let i = 0; i < longueur; i++, sortie++) cible[sortie] = patch[curseur.pos++]
        break
      case 2: // SourceCopy — recopier depuis la ROM d'origine, ailleurs
        relatifSource += litVarintSigne(patch, curseur)
        for (let i = 0; i < longueur; i++, sortie++) cible[sortie] = source[relatifSource++]
        break
      case 3: // TargetCopy — recopier depuis ce qu'on vient d'écrire
        relatifCible += litVarintSigne(patch, curseur)
        for (let i = 0; i < longueur; i++, sortie++) cible[sortie] = cible[relatifCible++]
        break
    }
  }

  const crcCibleAttendu = litUint32(patch, patch.length - 8)
  if (crc32(cible) !== crcCibleAttendu) {
    throw new ErreurPatch('Le résultat du patch est corrompu. Retéléchargez le patch.')
  }
  return cible
}

/** Entier de taille variable, format BPS : 7 bits utiles, bit de poids fort = fin. */
function litVarint(donnees: Uint8Array, curseur: { pos: number }): number {
  let valeur = 0
  let facteur = 1
  for (;;) {
    const octet = donnees[curseur.pos++]
    if (octet === undefined) throw new ErreurPatch('Patch BPS tronqué.')
    valeur += (octet & 0x7f) * facteur
    if (octet & 0x80) break
    facteur *= 128
    valeur += facteur
  }
  return valeur
}

/** Variante signée : le bit 0 porte le signe. */
function litVarintSigne(donnees: Uint8Array, curseur: { pos: number }): number {
  const brut = litVarint(donnees, curseur)
  const negatif = brut % 2 === 1
  const amplitude = Math.floor(brut / 2)
  return negatif ? -amplitude : amplitude
}

function litUint32(donnees: Uint8Array, position: number): number {
  return (
    (donnees[position] |
      (donnees[position + 1] << 8) |
      (donnees[position + 2] << 16) |
      (donnees[position + 3] << 24)) >>>
    0
  )
}

/* ---------------------------------------------------------------- CRC32 ---- */

const TABLE_CRC = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(donnees: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < donnees.length; i++) c = TABLE_CRC[(c ^ donnees[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* ------------------------------------------------------------ aiguillage --- */

export function appliquePatch(source: Uint8Array, patch: Uint8Array): Uint8Array {
  const signature = String.fromCharCode(...patch.subarray(0, 4))
  if (signature === 'BPS1') return appliqueBps(source, patch)
  if (signature === 'PATC') return appliqueIps(source, patch)
  throw new ErreurPatch('Format de patch inconnu : ni BPS, ni IPS.')
}
