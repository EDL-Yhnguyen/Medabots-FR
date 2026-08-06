import { useCallback, useState } from 'react'
import { Barre, Carte, Etiquette, Titre } from './composants/ui'
import { DepotRom } from './composants/DepotRom'
import { Emulateur } from './composants/Emulateur'
import { appliquePatch } from './lib/patch'
import { ETAPES, LOTS } from './donnees/avancement'

const DEPOT = 'https://github.com/EDL-Yhnguyen/Medabots-FR'
const PATCH = '/medabots-fr.bps'

export default function App() {
  const [romLancee, setRomLancee] = useState<ArrayBuffer | null>(null)
  const [erreurPatch, setErreurPatch] = useState<string | null>(null)
  const total = LOTS.reduce((somme, lot) => somme + lot.part, 0) / LOTS.length

  // Le patch est appliqué ici, dans le navigateur, juste avant de lancer le jeu.
  // La ROM patchée n'existe qu'en mémoire : rien n'est écrit, rien n'est envoyé.
  const lancer = useCallback(async (rom: ArrayBuffer) => {
    setErreurPatch(null)
    try {
      const reponse = await fetch(PATCH)
      if (!reponse.ok) throw new Error('patch introuvable')
      const patch = new Uint8Array(await reponse.arrayBuffer())
      const patchee = appliquePatch(new Uint8Array(rom), patch)
      setRomLancee(
        patchee.buffer.slice(patchee.byteOffset, patchee.byteOffset + patchee.byteLength) as ArrayBuffer,
      )
    } catch (e) {
      // Mieux vaut jouer en anglais que ne pas jouer : on le dit, et on lance.
      setErreurPatch(e instanceof Error ? e.message : String(e))
      setRomLancee(rom)
    }
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
      <Entete total={total} />

      <main className="mt-12 space-y-8">
        <section id="lecteur" className="scroll-mt-8">
          {romLancee ? (
            <>
              {erreurPatch && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-corail/40 bg-corail/10 p-4 text-sm text-texte-doux"
                >
                  La traduction n’a pas pu être appliquée ({erreurPatch}). Le jeu se lance en
                  anglais.
                </div>
              )}
              <Emulateur
                rom={romLancee}
                traduit={!erreurPatch}
                surQuitter={() => window.location.reload()}
              />
            </>
          ) : (
            <DepotRom surRomPrete={(rom) => void lancer(rom)} />
          )}
        </section>

        <Carte>
          <Titre sur="Avancement">Où en est la traduction</Titre>
          <div className="space-y-5">
            {LOTS.map((lot) => (
              <div key={lot.titre}>
                <Barre part={lot.part} libelle={lot.titre} />
                <p className="mt-1.5 text-xs text-texte-doux">{lot.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-trait pt-5 text-sm text-texte-doux">
            Le script du jeu représente de l’ordre de{' '}
            <strong className="text-texte">100 000 mots</strong>. Chaque lot sera livré comme un
            patch utilisable, plutôt que d’attendre des mois un ensemble complet.
          </p>
        </Carte>

        <Carte>
          <Titre sur="Technique">Ce qu’on sait du jeu</Titre>
          <ul className="space-y-4">
            {ETAPES.map((etape) => (
              <li key={etape.titre} className="flex gap-4">
                <span className="mt-0.5 shrink-0">
                  <Etiquette
                    ton={etape.etat === 'fait' ? 'vert' : etape.etat === 'bloque' ? 'corail' : 'neutre'}
                  >
                    {etape.etat === 'fait' ? 'résolu' : etape.etat === 'bloque' ? 'bloqué' : 'à venir'}
                  </Etiquette>
                </span>
                <div>
                  <h3 className="font-bold">{etape.titre}</h3>
                  <p className="mt-0.5 text-sm text-texte-doux">{etape.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-trait pt-5 text-sm text-texte-doux">
            Le détail complet, avec ce qui établit chaque affirmation, est dans{' '}
            <a
              href={`${DEPOT}/blob/main/docs/format.md`}
              className="font-semibold text-jaune underline underline-offset-4 hover:text-jaune-vif"
            >
              docs/format.md
            </a>
            .
          </p>
        </Carte>

        <Carte>
          <Titre sur="Le projet">Pourquoi ce chantier</Titre>
          <div className="space-y-4 text-texte-doux">
            <p>
              <strong className="text-texte">Medabots: Metabee Version</strong> est sorti en Europe
              en anglais seulement. C’est un portage de <em>Medarot 2 Core</em>, jamais traduit en
              français — la demande a été faite en 2013 sur un forum, personne ne l’a reprise.
            </p>
            <p>
              Le dépôt contient les outils d’analyse, la documentation du format et, à terme, le
              patch. Il ne contient <strong className="text-texte">aucune ROM</strong>, et n’en
              contiendra jamais.
            </p>
          </div>
          <a
            href={DEPOT}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-trait
              bg-surface-haute px-5 py-3 text-sm font-bold transition-colors
              hover:border-jaune hover:text-jaune"
          >
            Voir le dépôt sur GitHub →
          </a>
        </Carte>
      </main>

      <footer className="mt-12 border-t border-trait pt-6 text-xs leading-relaxed text-texte-doux">
        <p>
          Projet de traduction amateur, sans lien avec Imagineer, Natsume ou Ubisoft.{' '}
          <strong className="text-texte">Aucun jeu n’est distribué ici.</strong> Le lecteur
          fonctionne avec un fichier que vous fournissez et qui reste sur votre appareil.
        </p>
        <p className="mt-2">
          Émulation assurée par{' '}
          <a
            href="https://emulatorjs.org"
            className="underline underline-offset-2 hover:text-jaune"
          >
            EmulatorJS
          </a>{' '}
          (cœur mGBA).
        </p>
      </footer>
    </div>
  )
}

function Entete({ total }: { total: number }) {
  return (
    <header className="monte">
      <div className="mb-5 flex flex-wrap gap-2">
        <Etiquette ton="jaune">Game Boy Advance</Etiquette>
        <Etiquette>Traduction française</Etiquette>
        <Etiquette ton={total > 0 ? 'vert' : 'corail'}>
          {total > 0 ? `${Math.round(total * 100)} % traduit` : 'Chantier ouvert'}
        </Etiquette>
      </div>

      <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
        Medabots
        <span className="block text-jaune">en français</span>
      </h1>

      <p className="mt-5 max-w-xl text-lg text-texte-doux">
        La première traduction française de <em>Medabots: Metabee Version</em>. Suivez
        l’avancement, lisez comment le jeu est démonté — et jouez-y ici même, avec votre propre
        copie.
      </p>

      <a
        href="#lecteur"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-jaune px-6 py-3.5
          text-sm font-black tracking-wide text-fond shadow-[0_6px_0_0_#B87F00]
          transition-all duration-150 hover:bg-jaune-vif
          active:translate-y-[3px] active:shadow-[0_3px_0_0_#B87F00]"
      >
        ▶ Ouvrir le lecteur
      </a>
    </header>
  )
}
