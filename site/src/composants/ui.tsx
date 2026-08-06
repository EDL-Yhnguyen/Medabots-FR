import type { ReactNode, ButtonHTMLAttributes } from 'react'

/* Vocabulaire visuel du site. On étend ces composants plutôt que d'en créer
   d'autres à côté : deux boutons qui se ressemblent sans être le même finissent
   toujours par diverger. */

type TonBouton = 'principal' | 'discret' | 'danger'

export function Bouton({
  ton = 'principal',
  children,
  ...reste
}: { ton?: TonBouton; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tons: Record<TonBouton, string> = {
    principal:
      'bg-jaune text-fond hover:bg-jaune-vif shadow-[0_6px_0_0_#B87F00] active:translate-y-[3px] active:shadow-[0_3px_0_0_#B87F00]',
    discret: 'bg-surface-haute text-texte border border-trait hover:border-jaune hover:text-jaune',
    danger: 'bg-transparent text-corail border border-corail/50 hover:bg-corail/10',
  }
  return (
    <button
      {...reste}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
        text-sm font-bold tracking-wide transition-all duration-150
        disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none
        disabled:active:translate-y-0 ${tons[ton]} ${reste.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function Carte({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-carte border border-trait bg-surface/80 p-6 backdrop-blur-sm
        sm:p-8 ${className}`}
    >
      {children}
    </section>
  )
}

export function Etiquette({
  children,
  ton = 'neutre',
}: {
  children: ReactNode
  ton?: 'neutre' | 'jaune' | 'vert' | 'corail'
}) {
  const tons = {
    neutre: 'bg-surface-haute text-texte-doux border-trait',
    jaune: 'bg-jaune/15 text-jaune border-jaune/40',
    vert: 'bg-vert/15 text-vert border-vert/40',
    corail: 'bg-corail/15 text-corail border-corail/40',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs
        font-semibold tracking-wide ${tons[ton]}`}
    >
      {children}
    </span>
  )
}

export function Titre({ children, sur }: { children: ReactNode; sur?: string }) {
  return (
    <header className="mb-6">
      {sur && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-jaune">{sur}</p>
      )}
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">{children}</h2>
    </header>
  )
}

export function Barre({ part, libelle }: { part: number; libelle: string }) {
  const pourcent = Math.round(part * 100)
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="text-sm font-semibold">{libelle}</span>
        <span className="text-sm font-black tabular-nums text-texte-doux">{pourcent} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pourcent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={libelle}
        className="h-2.5 overflow-hidden rounded-full bg-surface-haute"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-jaune to-jaune-vif transition-[width] duration-700"
          style={{ width: `${Math.max(pourcent, pourcent > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  )
}
