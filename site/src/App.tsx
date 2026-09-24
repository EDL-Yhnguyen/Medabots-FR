import { useCallback, useState } from 'react'
import { Barre, Carte, Etiquette, LienExterne, Titre } from './composants/ui'
import { DepotRom } from './composants/DepotRom'
import { Emulateur } from './composants/Emulateur'
import { Compte, useSession } from './composants/Compte'
import { OuVoirLaSerie } from './composants/OuVoirLaSerie'
import { Synchro } from './composants/Synchro'
import { construitRomTraduite } from './lib/romTraduite'
import { ENTREES, ETAPES, LOTS } from './donnees/avancement'

const DEPOT = 'https://github.com/EDL-Yhnguyen/Medabots-FR'

export default function App() {
  const [romLancee, setRomLancee] = useState<ArrayBuffer | null>(null)
  const [erreurPatch, setErreurPatch] = useState<string | null>(null)
  // Le compte est facultatif : sans lui, tout fonctionne comme avant, la
  // sauvegarde restant sur l'appareil. Il n'ajoute qu'une chose — retrouver sa
  // partie ailleurs — et ne conditionne jamais le lancement du jeu.
  const { session, pret: comptePret } = useSession()
  // Le compte d'entrées, pas la moyenne des lots : voir ENTREES.
  const total = ENTREES.traduites / ENTREES.total
  // Terminé quand tout ce qui n'est pas traduit l'est par choix (noms gardés
  // en anglais) ou n'est jamais affiché — voir le commentaire de ENTREES.
  const termine = ENTREES.traduites + ENTREES.gardees >= ENTREES.total

  // Le patch est appliqué ici, dans le navigateur, juste avant de lancer le jeu.
  // La ROM patchée n'existe qu'en mémoire : rien n'est écrit, rien n'est envoyé.
  const lancer = useCallback(async (rom: ArrayBuffer) => {
    setErreurPatch(null)
    try {
      setRomLancee(await construitRomTraduite(rom))
    } catch (e) {
      // Mieux vaut jouer en anglais que ne pas jouer : on le dit, et on lance.
      setErreurPatch(e instanceof Error ? e.message : String(e))
      setRomLancee(rom)
    }
  }, [])

  return (
    <div className="zone-sure mx-auto max-w-3xl pt-10 sm:pt-16">
      <Entete total={total} termine={termine} />

      <main className="mt-12 space-y-8">
        <section id="lecteur" aria-labelledby="titre-lecteur" className="scroll-mt-8">
          {romLancee ? (
            <>
              {erreurPatch && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border-2 border-corail bg-corail-fond p-4 text-sm text-texte"
                >
                  La traduction n’a pas pu être appliquée ({erreurPatch}). Le jeu se lance en
                  anglais.
                </div>
              )}
              <h2 id="titre-lecteur" className="sr-only">
                Lecteur
              </h2>
              <Emulateur
                rom={romLancee}
                traduit={!erreurPatch}
                surQuitter={() => window.location.reload()}
              />
              {session && (
                <div className="mt-4">
                  <Synchro session={session} />
                </div>
              )}
            </>
          ) : (
            <DepotRom surRomPrete={(rom) => void lancer(rom)} />
          )}
        </section>

        {/* Le compte vient APRÈS le lecteur : ce qu'on vient chercher ici, c'est
            jouer. Une barrière de connexion en tête de page ferait croire qu'il
            faut un compte pour lancer le jeu, alors qu'il n'en faut pas. */}
        <Carte>
          <Titre sur="Votre partie">La retrouver sur tous vos appareils</Titre>
          <Compte session={session} pret={comptePret} />
          <p className="mt-5 border-t border-trait pt-5 text-sm text-texte-doux">
            Seule la <strong className="text-texte">sauvegarde</strong> voyage — quelques
            kilo-octets qui décrivent votre partie. Votre copie du jeu, elle, reste sur votre
            appareil et n’est jamais envoyée. Sur un appareil neuf, vous la redéposez une fois et
            vous reprenez où vous en étiez.
          </p>
        </Carte>

        <Carte>
          <Titre sur="Avancement">Où en est la traduction</Titre>
          <div className="space-y-5">
            {LOTS.map((lot) => (
              <div key={lot.titre}>
                <Barre part={lot.part} libelle={lot.titre} />
                <p className="mt-1.5 text-sm text-texte-doux">{lot.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-trait pt-5 text-sm text-texte-doux">
            Le script du jeu pèse{' '}
            <strong className="tabular-nums text-texte">393&nbsp;Kio</strong>, soit de l’ordre de{' '}
            <strong className="tabular-nums text-texte">67&nbsp;000 mots</strong>. Chaque lot est
            livré comme un patch utilisable, plutôt que d’attendre des mois un ensemble complet.
          </p>
        </Carte>

        <Carte>
          <Titre sur="Technique">Ce qu’on sait du jeu</Titre>
          <ul className="space-y-4">
            {ETAPES.map((etape) => (
              /* Au téléphone l'état passe au-dessus : une colonne d'étiquettes
                 mangeait 80 px sur 295, et leurs largeurs inégales décalaient
                 le début de chaque titre. À partir de sm, colonne à largeur
                 fixe — les titres s'alignent enfin. */
              <li key={etape.titre} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <span className="w-[5rem] shrink-0 sm:mt-0.5">
                  <Etiquette
                    bloc
                    ton={etape.etat === 'fait' ? 'vert' : etape.etat === 'bloque' ? 'corail' : 'neutre'}
                  >
                    {etape.etat === 'fait' ? 'résolu' : etape.etat === 'bloque' ? 'bloqué' : 'à venir'}
                  </Etiquette>
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold">{etape.titre}</h3>
                  <p className="mt-0.5 text-sm text-texte-doux">{etape.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-trait pt-5 text-sm text-texte-doux">
            Le détail complet, avec ce qui établit chaque affirmation, est dans{' '}
            <LienExterne
              href={`${DEPOT}/blob/main/docs/format.md`}
              className="font-semibold text-jaune underline underline-offset-4 hover:text-jaune-vif"
            >
              docs/format.md
            </LienExterne>
            .
          </p>
        </Carte>

        <Carte>
          <Titre sur="Le projet">Pourquoi ce chantier</Titre>
          <div className="space-y-4 text-texte-doux">
            <p>
              <strong className="text-texte" translate="no">
                Medabots: Metabee Version
              </strong>{' '}
              est sorti en Europe en anglais seulement. C’est un portage de{' '}
              <em translate="no">Medarot 2 Core</em>, jamais traduit en français — la demande a été
              faite en 2013 sur un forum, personne ne l’a reprise.
            </p>
            <p>
              Le dépôt contient les outils d’analyse, la documentation du format et, à terme, le
              patch. Il ne contient <strong className="text-texte">aucune ROM</strong>, et n’en
              contiendra jamais.
            </p>
          </div>
          <LienExterne
            href={DEPOT}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border-2
              border-trait-fort px-5 py-3 text-sm font-bold
              transition-[background-color,border-color,color] duration-150
              hover:bg-surface-haute hover:border-jaune hover:text-jaune"
          >
            Voir le dépôt sur GitHub <span aria-hidden="true">→</span>
          </LienExterne>
        </Carte>

        <OuVoirLaSerie />
      </main>

      <footer className="mt-12 border-t border-trait pt-6 text-sm leading-relaxed text-texte-doux">
        <p>
          Projet de traduction amateur, sans lien avec Imagineer, Natsume ou Ubisoft.{' '}
          <strong className="text-texte">Aucun jeu n’est distribué ici.</strong> Le lecteur
          fonctionne avec un fichier que vous fournissez et qui reste sur votre appareil.
        </p>
        <p className="mt-2">
          Émulation assurée par{' '}
          <LienExterne
            href="https://emulatorjs.org"
            className="font-semibold text-jaune underline underline-offset-4 hover:text-jaune-vif"
          >
            EmulatorJS
          </LienExterne>{' '}
          (cœur mGBA).
        </p>
      </footer>
    </div>
  )
}

function Entete({ total, termine }: { total: number; termine: boolean }) {
  return (
    <header className="monte">
      <div className="mb-5 flex flex-wrap gap-2">
        <Etiquette ton="jaune">Game Boy Advance</Etiquette>
        <Etiquette>Traduction française</Etiquette>
        <Etiquette ton={total > 0 ? 'vert' : 'corail'}>
          {total > 0 ? `${Math.round(total * 100)} % traduit` : 'Chantier ouvert'}
        </Etiquette>
        {termine && (
          <Etiquette ton="vert">Terminée · le reste est gardé en anglais par choix</Etiquette>
        )}
      </div>

      <h1 className="text-[2.75rem] font-black leading-[1.02] tracking-tight sm:text-6xl">
        Medabots
        <span className="block text-jaune">en français</span>
      </h1>

      <p className="mt-5 max-w-xl text-lg text-texte-doux">
        La première traduction française de{' '}
        <em translate="no">Medabots: Metabee Version</em>. Suivez l’avancement, lisez comment le
        jeu est démonté — et jouez-y ici même, ou emportez le fichier traduit sur votre
        émulateur. Toujours avec votre propre copie.
      </p>

      <a
        href="#lecteur"
        className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-jaune px-6 py-3.5
          text-sm font-black tracking-wide text-fond
          shadow-[0_6px_0_0_var(--color-jaune-ombre)]
          transition-[background-color,box-shadow,transform] duration-150 hover:bg-jaune-vif
          active:translate-y-[3px] active:shadow-[0_3px_0_0_var(--color-jaune-ombre)]"
      >
        <span aria-hidden="true">▶</span> Ouvrir le lecteur
      </a>
    </header>
  )
}
