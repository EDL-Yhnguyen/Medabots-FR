/**
 * Empreinte SHA-1 d'un fichier, calculée par le navigateur.
 * Sert à refuser une ROM qui n'est pas celle sur laquelle le patch a été construit :
 * appliquer un patch à la mauvaise révision produit un jeu corrompu, silencieusement.
 */
export async function sha1(donnees: ArrayBuffer): Promise<string> {
  const condense = await crypto.subtle.digest('SHA-1', donnees)
  return [...new Uint8Array(condense)]
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/** ROM de référence : Medabots - Metabee (Europe), 8 Mio. */
export const ROM_REFERENCE = {
  nom: 'Medabots - Metabee (Europe)',
  taille: 8_388_608,
  sha1: 'CD3D674E88F40A0707B150C4293588A659001D29',
} as const

export type Verdict =
  | { etat: 'conforme' }
  | { etat: 'taille'; attendue: number; obtenue: number }
  | { etat: 'empreinte'; attendue: string; obtenue: string }

export async function verifieRom(donnees: ArrayBuffer): Promise<Verdict> {
  if (donnees.byteLength !== ROM_REFERENCE.taille) {
    return { etat: 'taille', attendue: ROM_REFERENCE.taille, obtenue: donnees.byteLength }
  }
  const empreinte = await sha1(donnees)
  if (empreinte !== ROM_REFERENCE.sha1) {
    return { etat: 'empreinte', attendue: ROM_REFERENCE.sha1, obtenue: empreinte }
  }
  return { etat: 'conforme' }
}
