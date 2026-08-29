/**
 * La ROM traduite, fabriquée dans le navigateur.
 *
 * Un seul endroit construit la ROM patchée — qu'elle parte vers l'émulateur ou
 * vers un fichier que l'utilisateur emporte. Les deux usages partagent la même
 * règle : le site ne distribue jamais le jeu. Il télécharge le patch (quelques
 * centaines de Kio, la seule chose qu'il envoie), lit la copie que l'utilisateur
 * a déposée, et applique l'un à l'autre en mémoire. Sans ROM déposée, il n'y a
 * rien à lancer et rien à télécharger.
 */
import { appliquePatch } from './patch'

export const PATCH = '/medabots-fr.bps'

/** Le nom qu'aura le fichier chez l'utilisateur. Le suffixe dit ce qu'il est. */
export const NOM_FICHIER_TRADUIT = 'Medabots - Metabee (Europe) [FR].gba'

export async function construitRomTraduite(rom: ArrayBuffer): Promise<ArrayBuffer> {
  const reponse = await fetch(PATCH)
  if (!reponse.ok) throw new Error('patch introuvable')
  const patch = new Uint8Array(await reponse.arrayBuffer())
  const patchee = appliquePatch(new Uint8Array(rom), patch)
  return patchee.buffer.slice(
    patchee.byteOffset,
    patchee.byteOffset + patchee.byteLength,
  ) as ArrayBuffer
}

/**
 * Remet la ROM traduite à l'utilisateur, en fichier, pour la jouer dans
 * l'émulateur de son choix. Rendu : la taille du fichier, pour l'annoncer.
 */
export async function telechargeRomTraduite(rom: ArrayBuffer): Promise<number> {
  const traduite = await construitRomTraduite(rom)
  const url = URL.createObjectURL(new Blob([traduite], { type: 'application/octet-stream' }))
  const lien = document.createElement('a')
  lien.href = url
  lien.download = NOM_FICHIER_TRADUIT
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  // Révoquer l'URL dans la foulée annule le téléchargement sur certains
  // navigateurs, qui n'ont pas encore commencé à lire le blob. Une minute
  // suffit largement à un fichier local de 16 Mio.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return traduite.byteLength
}
