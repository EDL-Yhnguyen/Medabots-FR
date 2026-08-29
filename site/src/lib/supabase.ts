import { createClient } from '@supabase/supabase-js'
import { nettoieVariable } from './variablesEnv'

/**
 * Le compte, et lui seul.
 *
 * Supabase ne sert ici qu'à UNE chose : retrouver sa partie sur un autre
 * appareil. **La ROM ne passe jamais par là**, et ce n'est pas un détail
 * d'implémentation — c'est la règle qui tient tout le projet. Posséder le jeu
 * autorise à en avoir une copie, pas à la publier ; une ROM envoyée sur un
 * serveur, fût-il le sien, est une redistribution. Elle reste donc en
 * IndexedDB, sur l'appareil (voir `stockage.ts`).
 *
 * Ce qui voyage est la sauvegarde de cartouche : quelques kilo-octets qui
 * décrivent une partie, produits par la personne qui joue. Elle lui appartient.
 *
 * `nettoieVariable` et non `.trim()` : voir `variablesEnv.ts`. Le piège est
 * propre à Vite et il est muet.
 */
const url = nettoieVariable(import.meta.env.VITE_SUPABASE_URL)
const cle = nettoieVariable(import.meta.env.VITE_SUPABASE_ANON_KEY)

/**
 * Le schéma est cloisonné. Le projet Supabase est partagé avec les autres
 * applications personnelles — Mamakilo dans `public`, MamaLingo dans
 * `mamalingo` — et le plan gratuit n'en permet pas un de plus. Un schéma dédié
 * évite que deux applications se marchent dessus.
 *
 * Conséquence heureuse et voulue : `auth.users` est commun, donc **le compte est
 * le même partout**. On se connecte une fois pour toute la suite.
 */
const SCHEMA = 'medabots'

/** Vrai quand les clés sont là. Faux n'est pas une panne : voir ci-dessous. */
export function supabaseConfigure(): boolean {
  return Boolean(url && cle)
}

/**
 * Sans clés, le site fonctionne exactement comme avant : on dépose sa ROM, on
 * joue, la sauvegarde reste dans le navigateur. Le compte est un **ajout**, pas
 * une condition — un site de traduction qui refuserait de lancer le jeu parce
 * qu'un serveur ne répond pas aurait raté son sujet.
 *
 * Une clé présente mais malformée ne doit pas faire mieux qu'une clé absente.
 * `createClient` lève sur une URL invalide, et il est appelé ici au niveau du
 * module : l'exception partirait pendant le chargement du fichier, avant que
 * React ait monté quoi que ce soit — page blanche, sans message. D'où le
 * `try`/`catch`, bruyant en console parce qu'un basculement silencieux en mode
 * local ferait croire à une perte de données.
 */
/* Le type n'est PAS annoté à la main. `SupabaseClient` sans paramètre vaut
   `SupabaseClient<any, "public", "public">`, et notre client est configuré sur
   `medabots` : l'annotation entrait en conflit avec la valeur qu'elle
   prétendait décrire. L'inférence dit la vérité, une annotation approximative
   la contredit. */
export const supabase = (() => {
  if (!url || !cle) return null
  try {
    return createClient(url, cle, {
      db: { schema: SCHEMA },
      auth: { persistSession: true, autoRefreshToken: true },
    })
  } catch (erreur) {
    console.error(
      'Configuration Supabase inutilisable — le site reste en mode local, ' +
        'les sauvegardes ne quitteront pas cet appareil.',
      erreur,
    )
    return null
  }
})()
