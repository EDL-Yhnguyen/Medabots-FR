import { Carte, Etiquette, LienExterne, Titre } from './ui'

/**
 * Où voir la série animée — et pourquoi cette carte ne fait que renvoyer.
 *
 * **Ce site ne diffuse pas les épisodes, et n'en diffusera pas.** C'est la même
 * règle que pour la ROM, appliquée à la série : posséder une œuvre autorise à en
 * avoir une copie, pas à la publier ni à en tenir l'annuaire. Un lecteur
 * d'épisodes sous droits ici démentirait la ligne que le pied de page tient
 * depuis le premier jour — « aucun jeu n'est distribué ici ».
 *
 * Ce qu'on peut faire, et qui est utile : dire où la série se trouve
 * légalement, et l'état réel de cette disponibilité, y compris quand il est
 * décevant.
 *
 * **Les faits, pas des estimations.** Chaque piste ci-dessous a été vérifiée le
 * 29/08/2026 ; la date est affichée parce qu'une page comme celle-ci vieillit
 * plus vite que le reste du site — les catalogues changent tous les mois. D'où
 * l'ordre choisi : l'agrégateur d'abord, qui dit l'état du jour, les pistes
 * particulières ensuite.
 */

const VERIFIE_LE = '29 août 2026'

interface Piste {
  nom: string
  url: string
  etat: 'à vérifier' | 'existe' | 'occasion'
  detail: string
}

const PISTES: Piste[] = [
  {
    nom: 'JustWatch',
    url: 'https://www.justwatch.com/fr/recherche?q=medabots',
    etat: 'à vérifier',
    detail:
      'Le premier réflexe : il liste, pour la France et au jour où vous le consultez, les plateformes qui proposent la série. Une page figée comme celle-ci ne peut pas le faire.',
  },
  {
    nom: 'Prime Video',
    url: 'https://www.primevideo.com/-/fr/detail/0MWRH6EHBJ1GQ795H3ZJFJK5Y5',
    etat: 'existe',
    detail:
      'Des saisons de la série y figurent. La langue et la disponibilité varient selon le pays et la période : à vérifier sur place avant de compter dessus.',
  },
  {
    nom: 'Les DVD français de 2002',
    url: 'https://catalogue.bnf.fr/ark:/12148/cb38587925h',
    etat: 'occasion',
    detail:
      'Une édition française en VF est bien parue, éditée par France Télévisions Distribution. Elle n’est plus pressée — le lien pointe la notice de la Bibliothèque nationale, qui l’atteste ; les disques se trouvent d’occasion.',
  },
]

const TONS: Record<Piste['etat'], 'jaune' | 'vert' | 'neutre'> = {
  'à vérifier': 'jaune',
  existe: 'vert',
  occasion: 'neutre',
}

export function OuVoirLaSerie() {
  return (
    <Carte>
      <Titre sur="La série animée">Où la voir, légalement</Titre>

      <div className="space-y-4 text-texte-doux">
        <p>
          Le jeu vient d’une série : <span translate="no">Medarot</span>, diffusée en France en
          français dès la fin 2001 sur Fox Kids, puis sur France 3 et Télétoon.
        </p>
        <p>
          <strong className="text-texte">
            Il n’existe aujourd’hui aucune offre de streaming en français pour cette série en
            France.
          </strong>{' '}
          Autant le dire franchement plutôt que de laisser chercher : les trois pistes ci-dessous
          sont tout ce qui existe, et la première est la seule à jour.
        </p>
        <p>
          La version française de 2001 est aujourd’hui considérée comme{' '}
          <strong className="text-texte">perdue</strong> : aucun ayant droit ne la conserve ni ne
          la distribue. Ce qui en circule sur les plateformes vidéo vient de cassettes numérisées
          par des fans — ce site ne renvoie pas vers ces envois, pour la même raison qu’il ne
          distribue pas le jeu.
        </p>
      </div>

      <ul className="mt-6 space-y-4">
        {PISTES.map((piste) => (
          <li key={piste.nom} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <span className="w-[6.5rem] shrink-0 sm:mt-0.5">
              <Etiquette ton={TONS[piste.etat]} bloc>
                {piste.etat}
              </Etiquette>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold">
                <LienExterne
                  href={piste.url}
                  className="text-jaune underline underline-offset-4 hover:text-jaune-vif"
                >
                  {piste.nom}
                </LienExterne>
              </h3>
              <p className="mt-0.5 text-sm text-texte-doux">{piste.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-trait pt-5 text-sm text-texte-doux">
        Vérifié le {VERIFIE_LE}. <strong className="text-texte">Les épisodes ne sont pas ici</strong>{' '}
        et ne le seront pas : ce site ne distribue pas le jeu, il ne distribuera pas davantage la
        série. Il vous dit où la regarder chez ceux qui en ont les droits.
      </p>
    </Carte>
  )
}
