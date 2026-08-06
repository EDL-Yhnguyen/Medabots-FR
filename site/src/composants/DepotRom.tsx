import { useCallback, useEffect, useRef, useState } from 'react'
import { Bouton, Carte, Etiquette, Titre } from './ui'
import { ROM_REFERENCE, verifieRom, type Verdict } from '../lib/empreinte'
import { litRom, oublieRom, rangeRom } from '../lib/stockage'

type Etat =
  | { nom: 'chargement' }
  | { nom: 'vide' }
  | { nom: 'analyse' }
  | { nom: 'refus'; verdict: Exclude<Verdict, { etat: 'conforme' }> }
  | { nom: 'prete'; rom: ArrayBuffer }

export function DepotRom({ surRomPrete }: { surRomPrete: (rom: ArrayBuffer) => void }) {
  const [etat, setEtat] = useState<Etat>({ nom: 'chargement' })
  const [survol, setSurvol] = useState(false)
  const champ = useRef<HTMLInputElement>(null)

  // Au retour sur la page, la ROM déjà déposée est reprise telle quelle.
  useEffect(() => {
    let vivant = true
    litRom()
      .then((rom) => {
        if (!vivant) return
        setEtat(rom ? { nom: 'prete', rom } : { nom: 'vide' })
      })
      .catch(() => vivant && setEtat({ nom: 'vide' }))
    return () => {
      vivant = false
    }
  }, [])

  const accepte = useCallback(async (fichier: File) => {
    setEtat({ nom: 'analyse' })
    const donnees = await fichier.arrayBuffer()
    const verdict = await verifieRom(donnees)
    if (verdict.etat !== 'conforme') {
      setEtat({ nom: 'refus', verdict })
      return
    }
    await rangeRom(donnees)
    setEtat({ nom: 'prete', rom: donnees })
  }, [])

  if (etat.nom === 'chargement') {
    return (
      <Carte>
        <p className="text-texte-doux">Lecture du stockage local…</p>
      </Carte>
    )
  }

  if (etat.nom === 'prete') {
    return (
      <Carte className="border-vert/40">
        <Titre sur="Votre ROM">Prête à lancer</Titre>
        <p className="mb-6 text-texte-doux">
          Le fichier est reconnu et rangé sur cet appareil. Il n’a été envoyé nulle part.
        </p>
        <div className="flex flex-wrap gap-3">
          <Bouton onClick={() => surRomPrete(etat.rom)}>▶ Lancer le jeu</Bouton>
          <Bouton
            ton="danger"
            onClick={async () => {
              await oublieRom()
              setEtat({ nom: 'vide' })
            }}
          >
            Oublier ma ROM
          </Bouton>
        </div>
      </Carte>
    )
  }

  return (
    <Carte className={survol ? 'border-jaune' : undefined}>
      <Titre sur="Lecteur">Déposez votre ROM</Titre>

      <div className="mb-6 space-y-3 text-texte-doux">
        <p>
          Ce site <strong className="text-texte">ne distribue pas le jeu</strong>. Il fonctionne
          avec la copie que vous possédez déjà.
        </p>
        <p>
          Votre fichier est lu par le navigateur, gardé sur votre appareil et{' '}
          <strong className="text-texte">jamais envoyé sur un serveur</strong>. Vous pouvez
          l’effacer à tout moment.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setSurvol(true)
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSurvol(false)
          const fichier = e.dataTransfer.files[0]
          if (fichier) void accepte(fichier)
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors
          ${survol ? 'border-jaune bg-jaune/5' : 'border-trait'}`}
      >
        <p className="mb-4 text-sm text-texte-doux">
          Glissez ici votre fichier <code className="text-jaune">.gba</code>, ou
        </p>
        <input
          ref={champ}
          type="file"
          accept=".gba,.bin"
          className="sr-only"
          onChange={(e) => {
            const fichier = e.target.files?.[0]
            if (fichier) void accepte(fichier)
          }}
        />
        <Bouton
          onClick={() => champ.current?.click()}
          disabled={etat.nom === 'analyse'}
        >
          {etat.nom === 'analyse' ? 'Vérification…' : 'Choisir un fichier'}
        </Bouton>
      </div>

      {etat.nom === 'refus' && <Refus verdict={etat.verdict} />}

      <dl className="mt-6 grid gap-2 border-t border-trait pt-5 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-texte-doux">Version attendue</dt>
          <dd className="font-semibold">{ROM_REFERENCE.nom}</dd>
        </div>
        <div>
          <dt className="text-texte-doux">Taille</dt>
          <dd className="font-semibold tabular-nums">
            {ROM_REFERENCE.taille.toLocaleString('fr-FR')} octets
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-texte-doux">Empreinte SHA-1</dt>
          <dd className="break-all font-mono text-[11px] text-jaune">{ROM_REFERENCE.sha1}</dd>
        </div>
      </dl>
    </Carte>
  )
}

/** Un refus doit dire ce qui cloche ET quoi faire — pas seulement « erreur ». */
function Refus({ verdict }: { verdict: Exclude<Verdict, { etat: 'conforme' }> }) {
  return (
    <div
      role="alert"
      className="mt-5 rounded-xl border border-corail/40 bg-corail/10 p-5 text-sm"
    >
      <div className="mb-2">
        <Etiquette ton="corail">Fichier refusé</Etiquette>
      </div>
      {verdict.etat === 'taille' ? (
        <p className="text-texte-doux">
          Ce fichier fait{' '}
          <strong className="text-texte">{verdict.obtenue.toLocaleString('fr-FR')} octets</strong>,
          alors que la version européenne en fait{' '}
          {verdict.attendue.toLocaleString('fr-FR')}. C’est probablement une autre version, ou une
          ROM tronquée.
        </p>
      ) : (
        <div className="space-y-2 text-texte-doux">
          <p>
            La taille est bonne, mais le contenu diffère. C’est sans doute une autre région (États-Unis,
            Espagne, Japon) ou une ROM déjà modifiée.
          </p>
          <p className="break-all font-mono text-[11px]">
            <span className="text-texte-doux">obtenu </span>
            <span className="text-corail">{verdict.obtenue}</span>
          </p>
        </div>
      )}
    </div>
  )
}
