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
    part: 0.1,
  },
  {
    titre: 'Objets, pièces et médailles',
    detail:
      '64 objets et 34 médailles traduits. Restent les 480 Medaparts. Les noms de Medabots ne se traduisent pas.',
    part: 0.3,
  },
  {
    titre: 'Textes de combat',
    detail: '60 types d’attaque et 27 familles de compétences traduits.',
    part: 0.25,
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
      'Introuvable après cinq méthodes statiques, dessins et table de largeurs comprises. L’échec prouve que l’indice du glyphe n’est pas la valeur de table : police à chasse variable, à localiser sous émulateur.',
  },
  {
    titre: 'Tables de pointeurs',
    etat: 'fait',
    detail:
      '33 tables, 5 933 entrées — vérifiées en décodant leurs cibles. 147 fausses pistes (code ARM) écartées.',
  },
  {
    titre: 'Extraction du script',
    etat: 'fait',
    detail:
      'Le script sort en fichiers texte éditables, chaque entrée bornée par son terminateur. Volume mesuré : 393 Kio, ~67 000 mots.',
  },
  {
    titre: 'Réinsertion',
    etat: 'fait',
    detail:
      'L’aller-retour identité passe : extraire puis réinsérer sans rien changer rend une ROM identique au bit près. Un garde-fou refuse toute entrée trop longue plutôt que d’écraser la suivante.',
  },
  {
    titre: 'Codes de contrôle',
    etat: 'attente',
    detail:
      'Repérés (0xF8–0xFF : saut de ligne, page suivante, fin de message) mais leurs paramètres — portrait, locuteur — restent à élucider.',
  },
  {
    titre: 'Accents français',
    etat: 'attente',
    detail:
      'é è ê à â ç ù û î ï ô ö œ « ». Une version espagnole du jeu existe, donc le moteur sait afficher des glyphes accentués.',
  },
] as const
