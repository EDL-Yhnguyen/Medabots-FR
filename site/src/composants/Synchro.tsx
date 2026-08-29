import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  ecrireDansJeu,
  empreinteDe,
  envoyerAuCompte,
  jeuPret,
  lireDepuisJeu,
  lireDuCompte,
  type SauvegardeDistante,
} from '../lib/sauvegardes'
import { Bouton, Etiquette } from './ui'

/**
 * La bascule des sauvegardes entre l'appareil et le compte.
 *
 * DEUX RÈGLES, ET LA PREMIÈRE EST LA PLUS IMPORTANTE.
 *
 * 1. **On n'écrase jamais une partie sans demander.** Deux appareils, deux
 *    parties : celle du serveur peut être en avance comme en retard, et rien
 *    dans les octets ne dit laquelle compte pour la personne qui joue. On
 *    montre donc la date et on laisse choisir. Une synchronisation automatique
 *    qui perd trois heures de jeu est pire que pas de synchronisation du tout.
 *
 * 2. **L'envoi, lui, est automatique** — il n'écrase rien qui puisse manquer,
 *    puisque l'ancienne valeur est conservée côté serveur dans `precedente`.
 *    Toutes les trente secondes, et une dernière fois quand l'onglet part.
 *
 * Le rechargement d'une sauvegarde distante n'est proposé qu'à l'arrivée, avant
 * de jouer : `loadSaveFiles()` réinstalle le fichier, mais le cœur garde son
 * état courant en mémoire — charger au milieu d'une partie donnerait un
 * résultat que ni le jeu ni nous ne maîtrisons.
 */

const PERIODE_ENVOI = 30_000

type Etat =
  | { quoi: 'attente' }
  | { quoi: 'a-choisir'; distante: SauvegardeDistante; localeExiste: boolean }
  | { quoi: 'suivi'; envoyeeLe: Date | null }
  | { quoi: 'hors-ligne' }

export function Synchro({ session }: { session: Session }) {
  const [etat, setEtat] = useState<Etat>({ quoi: 'attente' })
  const derniereEmpreinte = useRef<string | null>(null)
  const compteId = session.user.id

  /** Envoie si — et seulement si — le contenu a changé depuis le dernier envoi. */
  const envoyer = useCallback(async () => {
    const donnees = lireDepuisJeu()
    if (!donnees) return
    const empreinte = await empreinteDe(donnees)
    if (empreinte === derniereEmpreinte.current) return

    const { envoyee } = await envoyerAuCompte(compteId, donnees)
    if (envoyee) {
      derniereEmpreinte.current = empreinte
      setEtat({ quoi: 'suivi', envoyeeLe: new Date() })
    }
  }, [compteId])

  // ── À l'arrivée : que contient le compte ? ────────────────────────────
  //
  // L'émulateur met un moment à monter son cœur. On attend qu'il réponde
  // plutôt que de supposer un délai — une temporisation fixe échouerait sur
  // une connexion lente et ferait perdre du temps sur une rapide.
  useEffect(() => {
    let vivant = true
    let essais = 0

    const regarder = async () => {
      if (!vivant) return
      if (!jeuPret()) {
        if (essais++ > 120) return // une minute : le jeu ne démarrera pas
        setTimeout(() => void regarder(), 500)
        return
      }

      const { jointe, sauvegarde } = await lireDuCompte()
      if (!vivant) return

      if (!jointe) {
        setEtat({ quoi: 'hors-ligne' })
        return
      }
      if (!sauvegarde) {
        // Rien sur le compte : la partie d'ici deviendra la référence.
        setEtat({ quoi: 'suivi', envoyeeLe: null })
        void envoyer()
        return
      }

      const locale = lireDepuisJeu()
      const empreinteLocale = locale ? await empreinteDe(locale) : null
      if (!vivant) return

      // Même partie des deux côtés : rien à décider.
      if (empreinteLocale === sauvegarde.empreinte) {
        derniereEmpreinte.current = sauvegarde.empreinte
        setEtat({ quoi: 'suivi', envoyeeLe: sauvegarde.joueeLe })
        return
      }

      setEtat({ quoi: 'a-choisir', distante: sauvegarde, localeExiste: locale !== null })
    }

    void regarder()
    return () => {
      vivant = false
    }
  }, [envoyer])

  // ── Pendant la partie : envoi régulier ────────────────────────────────
  useEffect(() => {
    if (etat.quoi !== 'suivi') return
    const minuteur = setInterval(() => void envoyer(), PERIODE_ENVOI)

    // Le départ de l'onglet est le moment le plus utile pour envoyer, et le
    // plus fragile : `visibilitychange` est le seul signal fiable sur mobile,
    // où `beforeunload` n'est pas toujours émis.
    const auDepart = () => {
      if (document.visibilityState === 'hidden') void envoyer()
    }
    document.addEventListener('visibilitychange', auDepart)

    return () => {
      clearInterval(minuteur)
      document.removeEventListener('visibilitychange', auDepart)
    }
  }, [etat.quoi, envoyer])

  if (etat.quoi === 'attente') {
    return <Ligne>Recherche de votre partie sur le compte…</Ligne>
  }

  if (etat.quoi === 'hors-ligne') {
    return (
      <Ligne ton="corail">
        Le compte n’a pas répondu. Vous pouvez jouer : la sauvegarde reste sur cet appareil et
        repartira à la prochaine connexion.
      </Ligne>
    )
  }

  if (etat.quoi === 'a-choisir') {
    const quand = etat.distante.joueeLe.toLocaleString('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
    return (
      <div className="space-y-3 rounded-carte border-2 border-jaune bg-surface-haute p-5">
        <h3 className="font-bold">Une partie vous attend sur votre compte</h3>
        <p className="text-sm text-texte-doux">
          Elle a été jouée le <strong className="text-texte">{quand}</strong>.{' '}
          {etat.localeExiste
            ? 'Cet appareil en a une autre. Choisissez laquelle garder — l’autre sera perdue.'
            : 'Cet appareil n’en a aucune.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <Bouton
            onClick={() => {
              if (ecrireDansJeu(etat.distante.donnees)) {
                derniereEmpreinte.current = etat.distante.empreinte
                setEtat({ quoi: 'suivi', envoyeeLe: etat.distante.joueeLe })
              }
            }}
          >
            Charger la partie du compte
          </Bouton>
          <Bouton
            ton="discret"
            onClick={() => {
              // Garder celle d'ici : elle partira au prochain envoi, et
              // l'ancienne restera récupérable dans `precedente`.
              derniereEmpreinte.current = null
              setEtat({ quoi: 'suivi', envoyeeLe: null })
            }}
          >
            Garder celle de cet appareil
          </Bouton>
        </div>
      </div>
    )
  }

  return (
    <Ligne ton="vert">
      {etat.envoyeeLe
        ? `Partie enregistrée sur votre compte · ${etat.envoyeeLe.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}`
        : 'Votre partie sera enregistrée sur votre compte au fil du jeu.'}
    </Ligne>
  )
}

function Ligne({ children, ton }: { children: React.ReactNode; ton?: 'vert' | 'corail' }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ton && <Etiquette ton={ton}>{ton === 'vert' ? 'Compte' : 'Hors ligne'}</Etiquette>}
      <span className="text-sm text-texte-doux">{children}</span>
    </div>
  )
}
