import { supabase } from './supabase'

/**
 * La sauvegarde de cartouche : la lire dans l'émulateur, l'y remettre, et la
 * faire voyager avec le compte.
 *
 * CE QUI VOYAGE, ET CE QUI NE VOYAGE PAS. La sauvegarde monte sur le compte —
 * huit kilo-octets décrivant une partie, produits par la personne qui joue.
 * **La ROM, jamais** : elle reste en IndexedDB sur l'appareil (`stockage.ts`).
 * Sur un appareil neuf on redépose son fichier une fois, et on retrouve sa
 * partie où on l'avait laissée.
 *
 * L'API d'EmulatorJS employée ici a été LUE DANS SON CODE, pas devinée :
 *
 *   gameManager.getSaveFile()      → Uint8Array | null
 *      Vide d'abord le tampon du cœur vers le système de fichiers virtuel,
 *      puis lit `getSaveFilePath()`. Sans ce vidage, on récupérerait l'état
 *      du dernier point de sauvegarde et non celui de l'instant.
 *
 *   gameManager.FS.writeFile(chemin, octets) + gameManager.loadSaveFiles()
 *      Le chemin vient de `getSaveFilePath()`. C'est la séquence exacte du
 *      bouton « charger une sauvegarde » d'EmulatorJS, arborescence comprise.
 */

/** Ce qu'EmulatorJS installe sur `window` une fois le jeu lancé. */
interface SystemeFichiers {
  analyzePath(chemin: string): { exists: boolean }
  readFile(chemin: string): Uint8Array
  writeFile(chemin: string, donnees: Uint8Array): void
  unlink(chemin: string): void
  mkdir(chemin: string): void
}

interface GestionnaireJeu {
  FS: SystemeFichiers
  getSaveFilePath(): string
  getSaveFile(vider?: boolean): Uint8Array | null
  saveSaveFiles(): void
  loadSaveFiles(): void
}

declare global {
  interface Window {
    EJS_emulator?: { gameManager?: GestionnaireJeu; started?: boolean }
  }
}

/** L'émulateur n'existe qu'après le chargement du cœur ; avant, tout est absent. */
function gestionnaire(): GestionnaireJeu | null {
  const jeu = window.EJS_emulator
  if (!jeu?.gameManager) return null
  // `getSaveFilePath` manquant signifie un cœur encore en cours de montage.
  return typeof jeu.gameManager.getSaveFilePath === 'function' ? jeu.gameManager : null
}

/** Vrai quand le jeu tourne et qu'une sauvegarde peut être lue ou écrite. */
export function jeuPret(): boolean {
  return gestionnaire() !== null
}

/**
 * La sauvegarde telle qu'elle est à l'instant.
 *
 * Rend `null` tant que le jeu n'a rien écrit — une partie neuve, où le fichier
 * n'existe pas encore. Ce n'est pas une erreur, et l'appelant doit s'abstenir
 * d'envoyer quoi que ce soit dans ce cas : écraser une sauvegarde distante par
 * du vide est exactement l'accident à éviter.
 */
export function lireDepuisJeu(): Uint8Array | null {
  const g = gestionnaire()
  if (!g) return null
  try {
    const donnees = g.getSaveFile()
    return donnees && donnees.length > 0 ? donnees : null
  } catch (erreur) {
    console.error('Lecture de la sauvegarde impossible', erreur)
    return null
  }
}

/**
 * Remet une sauvegarde dans le jeu en cours.
 *
 * L'arborescence est créée au besoin : le dossier des sauvegardes n'existe pas
 * tant que le jeu n'a rien écrit, et `writeFile` échouerait sur un chemin dont
 * le parent manque.
 */
export function ecrireDansJeu(donnees: Uint8Array): boolean {
  const g = gestionnaire()
  if (!g) return false
  try {
    const chemin = g.getSaveFilePath()
    const morceaux = chemin.split('/')
    let dossier = ''
    for (let i = 0; i < morceaux.length - 1; i++) {
      if (morceaux[i] === '') continue
      dossier += '/' + morceaux[i]
      if (!g.FS.analyzePath(dossier).exists) g.FS.mkdir(dossier)
    }
    if (g.FS.analyzePath(chemin).exists) g.FS.unlink(chemin)
    g.FS.writeFile(chemin, donnees)
    g.loadSaveFiles()
    return true
  } catch (erreur) {
    console.error('Écriture de la sauvegarde impossible', erreur)
    return false
  }
}

/**
 * Empreinte SHA-256 du contenu.
 *
 * Sert à ne pas réécrire une sauvegarde identique : le jeu vide son tampon très
 * souvent, et comparer deux empreintes coûte moins qu'un aller-retour réseau
 * inutile — et évite de faire tourner l'horodatage pour rien.
 */
export async function empreinteDe(donnees: Uint8Array): Promise<string> {
  const copie = new Uint8Array(donnees)
  const brut = await crypto.subtle.digest('SHA-256', copie)
  return Array.from(new Uint8Array(brut))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
}

/* ── Le transport ───────────────────────────────────────────────────────
   Base64 plutôt que binaire : la colonne est du texte, et une chaîne
   traverse PostgREST sans encodage maison à décoder des deux côtés. */

function versBase64(donnees: Uint8Array): string {
  // Par tranches : `String.fromCharCode(...tableau)` sur 8 Kio dépasse la
  // limite d'arguments d'un appel de fonction dans certains navigateurs.
  let binaire = ''
  const TRANCHE = 0x8000
  for (let i = 0; i < donnees.length; i += TRANCHE) {
    binaire += String.fromCharCode(...donnees.subarray(i, i + TRANCHE))
  }
  return btoa(binaire)
}

function depuisBase64(texte: string): Uint8Array {
  const binaire = atob(texte)
  const donnees = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) donnees[i] = binaire.charCodeAt(i)
  return donnees
}

export interface SauvegardeDistante {
  donnees: Uint8Array
  empreinte: string
  joueeLe: Date
}

/**
 * La sauvegarde rangée sur le compte, ou `null` s'il n'y en a pas encore.
 *
 * Une erreur réseau rend `null` elle aussi, après l'avoir signalée : le jeu doit
 * se lancer même quand le serveur ne répond pas. La distinction compte, d'où le
 * booléen `jointe` — l'appelant ne doit jamais présenter « rien sur le compte »
 * comme une certitude quand la requête a échoué.
 */
export async function lireDuCompte(): Promise<{
  jointe: boolean
  sauvegarde: SauvegardeDistante | null
}> {
  if (!supabase) return { jointe: false, sauvegarde: null }
  const { data, error } = await supabase
    .from('sauvegardes')
    .select('donnees, empreinte, jouee_le')
    .maybeSingle()

  if (error) {
    console.error('Sauvegarde du compte illisible', error)
    return { jointe: false, sauvegarde: null }
  }
  if (!data) return { jointe: true, sauvegarde: null }

  return {
    jointe: true,
    sauvegarde: {
      donnees: depuisBase64(data.donnees as string),
      empreinte: data.empreinte as string,
      joueeLe: new Date(data.jouee_le as string),
    },
  }
}

/**
 * Range la sauvegarde sur le compte.
 *
 * L'ancienne valeur est recopiée dans `precedente` par la même écriture, ce qui
 * laisse un coup en arrière si un second appareil a écrasé la bonne partie.
 * C'est fait ici et non par un déclencheur : la lecture préalable sert de toute
 * façon à comparer les empreintes.
 */
export async function envoyerAuCompte(
  compteId: string,
  donnees: Uint8Array,
): Promise<{ envoyee: boolean; raison?: string }> {
  if (!supabase) return { envoyee: false, raison: 'pas de compte configuré' }
  if (donnees.length === 0) return { envoyee: false, raison: 'sauvegarde vide' }

  const empreinte = await empreinteDe(donnees)

  const { data: existante } = await supabase
    .from('sauvegardes')
    .select('donnees, octets, empreinte')
    .maybeSingle()

  // Rien de neuf : on ne touche pas à la ligne, donc pas d'horodatage qui
  // bouge et pas de « sauvegarde plus récente » trompeur sur l'autre appareil.
  if (existante && existante.empreinte === empreinte) return { envoyee: true }

  const { error } = await supabase.from('sauvegardes').upsert(
    {
      compte_id: compteId,
      donnees: versBase64(donnees),
      octets: donnees.length,
      empreinte,
      precedente: (existante?.donnees as string | undefined) ?? null,
      precedente_octets: (existante?.octets as number | undefined) ?? null,
      precedente_maj: existante ? new Date().toISOString() : null,
      jouee_le: new Date().toISOString(),
    },
    { onConflict: 'compte_id' },
  )

  if (error) {
    console.error('Envoi de la sauvegarde refusé', error)
    return { envoyee: false, raison: error.message }
  }
  return { envoyee: true }
}
