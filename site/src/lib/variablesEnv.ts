/**
 * Lecture nettoyée des variables d'environnement du navigateur.
 *
 * **Ne jamais nettoyer une variable Vite avec `trim()`.** C'est contre-intuitif,
 * et ça a coûté vingt jours de panne muette sur Mamakilo, qui tourne sur la
 * même pile.
 *
 * Une clé Supabase collée dans Vercel commençait par U+FEFF — un BOM, invisible
 * partout : à l'écran, dans l'interface Vercel, dans un `echo`. Un en-tête HTTP
 * ne peut pas porter ce caractère, donc `fetch` refusait de construire la
 * requête. **Aucune requête ne partait** : rien dans les logs Supabase, rien
 * dans ceux de Vercel, rien dans l'onglet réseau.
 *
 * Le code faisait pourtant `import.meta.env.VITE_…?.trim()`, et ce `trim()` est
 * correct : U+FEFF est un caractère d'espacement d'ECMAScript. Sauf qu'il ne
 * s'exécute jamais. Vite remplace `import.meta.env.VITE_*` par la valeur
 * **littérale** à la compilation ; le minifieur voit alors une expression
 * constante et l'évalue lui-même — avec une implémentation de `trim` qui, elle,
 * ne retire pas U+FEFF. Le BOM traverse la compilation et atterrit dans le
 * bundle.
 *
 * Un `replace()` sur une expression régulière n'est pas replié par le
 * minifieur : il s'exécute réellement, au moment voulu.
 *
 * Le motif écrit le BOM en échappement (`\u{feff}`) et non en clair : remettre
 * le caractère invisible dans le fichier serait rejouer la panne à l'endroit
 * même censé la corriger.
 */

/** Ce qui se colle à une valeur au copier-coller, et qui n'a sa place ni dans
 *  une URL ni dans une clé : blancs, BOM, guillemets conservés. */
const PARASITES = /^[\s\u{feff}"']+|[\s\u{feff}"']+$/gu

/**
 * Retire les parasites de tête et de queue d'une variable d'environnement.
 *
 * Ne touche pas au milieu de la valeur : une clé qui contiendrait un caractère
 * aberrant en son sein est un autre problème, et le masquer rendrait le
 * diagnostic plus difficile, pas moins.
 */
export function nettoieVariable(valeur: string | undefined): string | undefined {
  if (valeur === undefined) return undefined
  const nettoyee = valeur.replace(PARASITES, '')
  return nettoyee === '' ? undefined : nettoyee
}
