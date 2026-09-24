/**
 * Avancement de la traduction, par lot de livraison.
 *
 * Chiffres tenus à la main, et volontairement honnêtes : un pourcentage inventé
 * ne trompe que celui qui le lit. Tant que l'extraction du texte n'existe pas,
 * tout est à zéro et le site le dit.
 */

/**
 * Le compte réel, seule mesure honnête de l'avancement.
 *
 * L'en-tête affichait auparavant la MOYENNE des cinq lots — ce qui donnait
 * 40 % alors que « Histoire principale », à zéro, pèse à lui seul l'essentiel
 * des 67 000 mots. Une moyenne non pondérée flatte le chantier ; le nombre
 * d'entrées ne ment pas.
 */
export const ENTREES = {
  traduites: 4567,
  /**
   * Entrées volontairement gardées en anglais, ou jamais affichées : les
   * 120 noms de Medabots et les 97 noms de personnages (décision du 06/08/2026),
   * les 480 noms de Medaparts (décision du 24/09/2026, pour rester cohérent
   * avec les noms de Medabots), les 480 codes de pièces, et les emplacements
   * de débogage. Quand traduites + gardees == total, le chantier est clos.
   */
  gardees: 1366,
  total: 5933,
} as const

export type Lot = {
  titre: string
  detail: string
  part: number
}

export const LOTS: Lot[] = [
  {
    titre: 'Interface et menus',
    detail:
      'Boutique, sauvegarde et effacement traduits, ainsi que les 33 messages d’objet et d’équipement avec leurs variables.',
    part: 0.5,
  },
  {
    titre: 'Objets, pièces et médailles',
    detail:
      'Terminé : 64 objets et 34 médailles traduits. Les 480 noms de Medaparts restent en anglais, par décision du 24/09/2026, comme les noms de Medabots qu’ils désignent — les dialogues les citent tels quels.',
    part: 1,
  },
  {
    titre: 'Textes de combat',
    detail:
      'Terminé : 60 types d’attaque, 52 techniques, 27 familles de compétences, leurs 53 conseils de combinaison et les 122 messages de Robattle. Les 54 entrées restantes sont des emplacements de débogage, jamais affichés.',
    part: 1,
  },
  {
    titre: 'Histoire principale',
    detail:
      'Terminé : les quatorze tables de dialogue sont en français, soit 3 875 dialogues — le vol d’Eggy et la prise d’otages de Rosewood, le fantôme du mont Odoro, l’île Medabot et son tournoi, les enfants disparus et le repaire des égouts, les Ruines antiques et le royaume sous-marin de Kodine, le faux rendez-vous et la forteresse volante Fiyun, le retour sur l’île Medabot et le château de Milky, le Rallye Partsun, Salty et le fan-club de Karin, la seconde moitié du tournoi et le château de la Sorcière, le final dans le château du Dr Meta-Evil, l’après-jeu, la chute de Fiyun et les Antackers, les répliques éparses de toute l’aventure, et les messages système. Les noms de Medabots, de personnages et de Medaparts restent en anglais, par décision.',
    part: 1,
  },
  {
    titre: 'PNJ et contenu secondaire',
    detail:
      'Terminé : la Medaroad Race, les 192 répliques d’avant et d’après combat, les dialogues de ville et les quêtes annexes (Rallye Partsun, Kodine, parc Ninja, restaurant), et les répliques éparses de toute l’aventure.',
    part: 1,
  },
]

export type Etape = {
  titre: string
  /**
   * 'bloque' reste dans le type même quand aucune étape ne l'emploie.
   *
   * Le laisser tomber ferait disparaître l'étiquette « bloqué » de
   * l'affichage, et il faudrait la réécrire au prochain point d'arrêt — or un
   * site qui ne sait plus dire « bloqué » ne peut plus être honnête.
   */
  etat: 'fait' | 'attente' | 'bloque'
  detail: string
}

export const ETAPES: Etape[] = [
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
    etat: 'fait',
    detail:
      'Trouvée en remontant par le code, après sept recherches infructueuses dans les données. Deux polices, romaine et italique, de 8×16 pixels en 4 bpp anticrénelé, et leurs tables de largeurs. Les sept échecs venaient tous de la même chose : des mesures fausses, sur lesquelles un raisonnement juste ne pouvait que conclure faux.',
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
    titre: 'Guillemets français',
    etat: 'fait',
    detail:
      'Les seuls signes qui ont vraiment dû être dessinés. Aucune des quatre langues européennes de la cartouche n’emploie « », donc la police ne les portait pas : 68 occurrences se repliaient sur le guillemet droit ". Deux des onze emplacements de glyphe restés vides les accueillent depuis le 25 septembre 2026, dans la romaine comme dans l’italique — deux chevrons à 45°, cinq rangées, centrés sur la hauteur d’x, chasse de 6 pixels comme une lettre. Les 68 replis ont disparu et aucune ligne ne déborde : la mesure avant/après donne exactement la même liste.',
  },
  {
    titre: 'Accents français',
    etat: 'fait',
    detail:
      'Ils dormaient dans la ROM. C’est une cartouche européenne : les 45 glyphes des quatre langues du continent — é è ê à â ç î ï ô û ù œ Œ et leurs capitales — étaient dessinés juste après le 79e, mais leurs largeurs valaient zéro, si bien que le jeu ne pouvait jamais les employer. Écrire ces largeurs a suffi. Rien n’a été dessiné, rien n’a été relogé, et pas un mot de la traduction n’a eu à être réécrit.',
  },
]
