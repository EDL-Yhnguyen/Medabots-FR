import type { ReactNode, ButtonHTMLAttributes } from 'react'

/* Vocabulaire visuel du site. On étend ces composants plutôt que d'en créer
   d'autres à côté : deux boutons qui se ressemblent sans être le même finissent
   toujours par diverger.

   Deux règles tenues ici :
   - un état se dit par un APLAT SATURÉ opaque, jamais par une teinte à 15 % ;
   - la limite d'un contrôle passe par --trait-fort, jamais par --trait, qui est
     du décor et tombe à 1,6:1. */

type TonBouton = 'principal' | 'discret' | 'danger'

export function Bouton({
  ton = 'principal',
  children,
  ...reste
}: { ton?: TonBouton; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tons: Record<TonBouton, string> = {
    // L'ombre portée pleine donne la butée d'une touche de console : elle
    // s'enfonce au clic. C'est la signature du site, on la garde.
    principal:
      'bg-jaune text-fond shadow-[0_6px_0_0_var(--color-jaune-ombre)] hover:bg-jaune-vif active:translate-y-[3px] active:shadow-[0_3px_0_0_var(--color-jaune-ombre)]',
    // Fond transparent plutôt qu'un aplat à 1,2:1 de la carte : le bouton se
    // délimitait par une bordure invisible posée sur un fond invisible.
    discret:
      'bg-transparent text-texte border-2 border-trait-fort hover:bg-surface-haute hover:border-jaune hover:text-jaune',
    danger:
      'bg-transparent text-corail border-2 border-corail hover:bg-corail-fond hover:text-jaune-vif hover:border-jaune-vif',
  }
  return (
    <button
      type="button"
      {...reste}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3
        text-sm font-bold tracking-wide
        transition-[background-color,border-color,color,box-shadow,transform] duration-150
        disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none
        disabled:active:translate-y-0 ${tons[ton]} ${reste.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Une carte est un conteneur, pas une région : un <section> sans nom
    accessible n'est annoncé nulle part et ne fait qu'empiler du bruit. */
export function Carte({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-carte border border-trait bg-surface/80 p-5 backdrop-blur-sm
        sm:p-8 ${className}`}
    >
      {children}
    </div>
  )
}

type TonEtiquette = 'neutre' | 'jaune' | 'vert' | 'corail'

/** Un état se lit d'un coup d'œil ou ne sert à rien : aplat plein, texte sombre.
    Le contraste ne dépend alors plus de ce qu'il y a dessous. */
export function Etiquette({
  children,
  ton = 'neutre',
  bloc = false,
}: {
  children: ReactNode
  ton?: TonEtiquette
  /** Occupe toute la largeur de son conteneur — pour aligner une colonne d'états. */
  bloc?: boolean
}) {
  const tons: Record<TonEtiquette, string> = {
    neutre: 'bg-surface-haute text-texte border border-trait-fort',
    jaune: 'bg-jaune text-fond',
    vert: 'bg-vert text-fond',
    corail: 'bg-corail text-fond',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs
        font-bold tracking-wide ${bloc ? 'w-full justify-center' : ''} ${tons[ton]}`}
    >
      {children}
    </span>
  )
}

/** Un lien qui sort du site s'ouvre à côté : installé sur l'écran d'accueil,
    le site n'a pas de bouton « retour », et partir vers GitHub dans le même
    onglet ferme le jeu en cours. */
export function LienExterne({
  href,
  children,
  className = '',
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  )
}

export function Titre({ children, sur, id }: { children: ReactNode; sur?: string; id?: string }) {
  return (
    <header className="mb-6">
      {sur && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-jaune">{sur}</p>
      )}
      <h2 id={id} className="text-2xl font-black tracking-tight sm:text-3xl">
        {children}
      </h2>
    </header>
  )
}

export function Barre({ part, libelle }: { part: number; libelle: string }) {
  const pourcent = Math.round(part * 100)
  const idLibelle = `barre-${libelle.replace(/[^a-zA-Z]+/g, '-').toLowerCase()}`
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span id={idLibelle} className="text-sm font-semibold">
          {libelle}
        </span>
        <span className="text-sm font-black tabular-nums text-texte-doux">{pourcent}&nbsp;%</span>
      </div>
      {/* Le rail était à 1,22:1 de la carte : à 0 %, la barre ne se voyait pas
          du tout — le lot « Histoire principale » n'affichait rien. Un contour
          à --trait-fort donne sa forme au rail quel que soit le remplissage,
          et le fond reste sombre pour que le jaune garde toute sa saturation. */}
      <div
        role="progressbar"
        aria-valuenow={pourcent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${pourcent} %`}
        aria-labelledby={idLibelle}
        className="h-3 overflow-hidden rounded-full border border-trait-fort bg-surface-haute"
      >
        <div
          className="h-full rounded-full bg-jaune transition-[width] duration-700"
          style={{ width: `${pourcent}%` }}
        />
      </div>
    </div>
  )
}
