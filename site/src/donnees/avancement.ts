/**
 * Avancement de la traduction, par lot de livraison.
 *
 * Chiffres tenus à la main, et volontairement honnêtes : un pourcentage inventé
 * ne trompe que celui qui le lit. Tant que l'extraction du texte n'existe pas,
 * tout est à zéro et le site le dit.
 */

export type Lot = {
  titre: string
  detail: string
  part: number
}

export const LOTS: Lot[] = [
  {
    titre: 'Interface et menus',
    detail: 'Écrans de titre, options, navigation, messages système.',
    part: 0,
  },
  {
    titre: 'Objets, pièces et médailles',
    detail: 'Noms et descriptions de tout l’équipement des Medabots.',
    part: 0,
  },
  {
    titre: 'Textes de combat',
    detail: 'Attaques, effets, commentaires de Robattle.',
    part: 0,
  },
  {
    titre: 'Histoire principale',
    detail: 'Le scénario, de la première scène à la fin.',
    part: 0,
  },
  {
    titre: 'PNJ et contenu secondaire',
    detail: 'Dialogues de ville, quêtes annexes, textes optionnels.',
    part: 0,
  },
]

export const ETAPES = [
  {
    titre: 'Table de caractères',
    etat: 'fait',
    detail:
      'Trouvée par recherche relative, puis vérifiée en décodant du vrai texte. A–Z en 0x01–0x1A, a–z en 0x1B–0x34.',
  },
  {
    titre: 'Compression du texte',
    etat: 'fait',
    detail:
      'Il n’y en a pas. Les dialogues sont en clair dans la ROM — c’était le plus gros risque du projet, il est écarté.',
  },
  {
    titre: 'Police de caractères',
    etat: 'bloque',
    detail:
      'Introuvable après quatre méthodes statiques. L’échec prouve que l’indice du glyphe n’est pas la valeur de table : police à chasse variable, à localiser sous émulateur.',
  },
  {
    titre: 'Tables de pointeurs',
    etat: 'attente',
    detail:
      'Indispensables avant toute réinsertion : le français n’a pas la longueur de l’anglais, les textes devront être relogés.',
  },
  {
    titre: 'Accents français',
    etat: 'attente',
    detail:
      'é è ê à â ç ù û î ï ô ö œ « ». Une version espagnole du jeu existe, donc le moteur sait afficher des glyphes accentués.',
  },
] as const
