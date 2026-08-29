import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Bouton, Etiquette } from './ui'

/**
 * Le compte — facultatif, et il doit le rester.
 *
 * Sans compte, le site fonctionne exactement comme avant : on dépose sa ROM, on
 * joue, la sauvegarde reste dans le navigateur. Le compte n'ajoute qu'une chose,
 * mais elle est précieuse : **retrouver sa partie sur un autre appareil**.
 *
 * Le compte est celui de toute la suite d'applications — le projet Supabase est
 * partagé, donc `auth.users` est commun. Qui a déjà un compte Mamakilo ou
 * MamaLingo se connecte ici avec le même.
 *
 * Ce qu'on ne fait pas : exiger un compte pour lancer le jeu. Un site de
 * traduction qui refuserait de jouer parce qu'un serveur ne répond pas aurait
 * raté son sujet.
 */

/** L'état de session. `pret` vaut vrai dès qu'on SAIT, connecté ou non. */
export function useSession(): { session: Session | null; pret: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  const [pret, setPret] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    let vivant = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setSession(data.session)
      setPret(true)
    })

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, s) => {
      setSession(s)
      setPret(true)
    })

    return () => {
      vivant = false
      abonnement.subscription.unsubscribe()
    }
  }, [])

  return { session, pret }
}

type Mode = 'connexion' | 'inscription'

export function Compte({ session, pret }: { session: Session | null; pret: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const [mode, setMode] = useState<Mode>('connexion')
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<{ ton: 'erreur' | 'bien'; texte: string } | null>(null)

  const envoyer = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!supabase || enCours) return
      setEnCours(true)
      setMessage(null)

      const identifiants = { email: courriel.trim(), password: motDePasse }
      const { error } =
        mode === 'connexion'
          ? await supabase.auth.signInWithPassword(identifiants)
          : await supabase.auth.signUp(identifiants)

      setEnCours(false)

      if (error) {
        // Le message de Supabase est en anglais et souvent technique. On traduit
        // les deux cas courants et on garde le reste tel quel : inventer un
        // libellé pour une erreur qu'on ne connaît pas rendrait le diagnostic
        // impossible.
        const brut = error.message.toLowerCase()
        setMessage({
          ton: 'erreur',
          texte: brut.includes('invalid login')
            ? 'Adresse ou mot de passe incorrect.'
            : brut.includes('already registered')
              ? 'Cette adresse a déjà un compte. Connectez-vous.'
              : error.message,
        })
        return
      }

      if (mode === 'inscription') {
        setMessage({
          ton: 'bien',
          texte: 'Compte créé. Vérifiez votre boîte mail si une confirmation est demandée.',
        })
      } else {
        setOuvert(false)
        setMotDePasse('')
      }
    },
    [courriel, motDePasse, mode, enCours],
  )

  // Sans clés Supabase, le compte n'existe pas. On le dit une fois, sobrement,
  // plutôt que d'afficher un formulaire qui ne mènerait nulle part.
  if (!supabase) {
    return <p className="text-sm text-texte-doux">Vos sauvegardes restent dans ce navigateur.</p>
  }

  // Capturé après le garde ci-dessus. TypeScript ne conserve pas le
  // rétrécissement d'une variable IMPORTÉE à l'intérieur d'une closure — un
  // autre module pourrait la réaffecter, pour ce qu'il en sait. Une constante
  // locale, elle, est définitivement non nulle.
  const client = supabase

  if (!pret) {
    return <p className="text-sm text-texte-doux">Vérification du compte…</p>
  }

  if (session) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Etiquette ton="vert">Partie synchronisée</Etiquette>
          <span className="text-sm text-texte-doux">{session.user.email}</span>
        </div>
        <Bouton ton="discret" onClick={() => void client.auth.signOut()}>
          Se déconnecter
        </Bouton>
      </div>
    )
  }

  if (!ouvert) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-sm text-texte-doux">
          Sans compte, votre partie reste sur cet appareil. Avec un compte, vous la retrouvez
          partout —{' '}
          <strong className="text-texte">votre ROM, elle, ne quitte jamais votre appareil</strong>.
        </p>
        <Bouton ton="discret" onClick={() => setOuvert(true)}>
          Utiliser mon compte
        </Bouton>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void envoyer(e)} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{mode === 'connexion' ? 'Se connecter' : 'Créer un compte'}</h3>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'connexion' ? 'inscription' : 'connexion')
            setMessage(null)
          }}
          className="min-h-11 text-sm font-semibold text-jaune underline underline-offset-4
            hover:text-jaune-vif"
        >
          {mode === 'connexion' ? 'Pas encore de compte ?' : 'J’ai déjà un compte'}
        </button>
      </div>

      <p className="text-sm text-texte-doux">
        Le même compte que vos autres applications — Mamakilo, MamaLingo, GénieLab.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Adresse e-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={courriel}
            onChange={(e) => setCourriel(e.target.value)}
            className="min-h-11 w-full rounded-xl border-2 border-trait-fort bg-transparent px-4
              py-2.5 text-texte placeholder:text-texte-doux focus:border-jaune focus:outline-none"
            placeholder="vous@exemple.fr"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Mot de passe</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="min-h-11 w-full rounded-xl border-2 border-trait-fort bg-transparent px-4
              py-2.5 text-texte placeholder:text-texte-doux focus:border-jaune focus:outline-none"
            placeholder="8 caractères au moins"
          />
        </label>
      </div>

      {message && (
        <p
          role={message.ton === 'erreur' ? 'alert' : 'status'}
          className={`text-sm ${message.ton === 'erreur' ? 'text-corail' : 'text-vert'}`}
        >
          {message.texte}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? 'Un instant…' : mode === 'connexion' ? 'Se connecter' : 'Créer le compte'}
        </Bouton>
        <Bouton ton="discret" onClick={() => setOuvert(false)}>
          Annuler
        </Bouton>
      </div>
    </form>
  )
}
