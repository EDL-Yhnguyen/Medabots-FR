# Reprise — Medabots FR

Dernière séance : 2026-09-24 · dernier commit : `698c100` Chapitre 13: patch
reconstruit, site a 4 311 entrees, narratif 3 619/3 875

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Treize chapitres sont en français : 4 311 entrées sur 5 933.** Le treizième
(`0x47DAD0`, 276, traduit le 24/09/2026) rassemble les répliques éparses de
toute l'aventure : PNJ de Riverview, conseils de jeu (Renverse, Repérage,
Camouflage), l'étang d'Odoro, les échanges de Medaparts, la boutique du
chercheur, Kodine et la Pierre sacrée, les majordomes, les médailles
ultra-rares, le parc Ninja, le Baron, Nae et le Dr Aki, Kirara et Henry, les
douze Medaparts du Rallye Partsun. Narratif mesuré : **3 619 sur 3 875,
soit 93,4 %**. Relogement : 2 451 entrées, 210 712 octets ; 8 225 908
octets libres. Déployé, SHA-1 identique. Le douzième
(`0x47D5C0`, 323 entrées dont 217 textes uniques et 40 vides, traduit le
24/09/2026) est la chute de Fiyun (l'huile du Dr Armond, Harvey, le choix
poursuite/équilibre, la capsule de secours, tout le monde aux commandes, les
Select 3 et le capitaine Awamori, l'atterrissage au sud de Riverview) puis
les Antackers et leur fausse Reine, Gillgirl et sa partie de chat, les
Ruines antiques. Narratif mesuré : **3 343 sur 3 875, soit 86,3 %**.
Relogement : 2 287 entrées, 196 200 octets ; 8 240 420 octets libres.
Déployé, SHA-1 identique. Le onzième
(`0x47D124`, 293, traduit le 24/09/2026) est l'après-jeu : le Rallye Partsun
à Rosewood (Hachiro, Koji, Karin), le "Robattle Royal", les Screws et leur
"Royaume des Néo-Enfants", le retour à Kodine (Margarita, Mockingbird et ses
cousins, Hachiro en vacances), Harvey à Fiyun et la "STONECLUSTER", le parc
Ninja (les 3 frères ninjas, l'entrepôt aux souris, le vieil homme qui écorche
« Robattle »), le Baron, le restaurant avec Karin et son père, "Medabots
Hebdo", l'endroit spécial d'Erika. Narratif mesuré : **3 020 sur 3 875,
soit 77,9 %**. Relogement : 2 124 entrées, 179 326 octets ; 8 257 294 octets
libres. Déployé, SHA-1 identique. Le dixième
(`0x47CD7C`, 233, traduit le 24/09/2026) est le final : le château du
Dr Meta-Evil, Seaslug et le lac d'eau gazeuse, Shrimplips, le chercheur
espion et Babbyblu, la Phantom Lady (Kirara) et le Phantom Renegade (Henry),
le Mega-Emperor et le Limiteur, l'autodestruction qui n'est qu'un pétard, le
Dr Aki et Nae, la mutinerie de Tokkuri, le retour sur le "Jaws", puis
l'épilogue (Erika embauche Koji, l'endroit spécial de Karin à Fiyun).
Narratif mesuré : **2 727 sur 3 875, soit 70,4 %**. Relogement : 1 931
entrées, 161 700 octets ; 8 274 920 octets libres. Déployé, SHA-1 identique.
Le neuvième
(`0x47C64C`, 277, traduit le 24/09/2026) est la suite de l'île Medabot : la
maison hantée avec Karin, la salle d'arcade, la seconde moitié du tournoi
(Kir, Shandy, Spumoni, Joe Swihan, Tequonic, Ryo, la finale contre Koji), le
Dr Armond, les montagnes russes "Spirit" avec Erika, les photos des
Rubberobos, la visite du château de la Sorcière (Milky, Rappy, le Maître des
Ténèbres, l'Armée Rubberobo), les enfants enfermés, Shrimplips, le retour en
ferry, Papa et Maman. Narratif mesuré : **2 494 dialogues sur 3 875, soit
64,4 %**. Relogement : 1 781 entrées, 144 856 octets ; 8 291 764 octets libres.
Déployé, SHA-1 du patch en ligne identique au local. Les huit précédents : tables
`0x479F0C` (237, le vol d'Eggy et Rosewood), `0x47A2C4` (303, le mont Odoro),
`0x47A784` (323, l'île Medabot), `0x47B110` (295, les enfants disparus et les
égouts), `0x47B5B0` (259, les Ruines antiques et le royaume de Kodine),
`0x47B9C0` (263, le faux rendez-vous et la forteresse volante Fiyun — Harvey,
l'huile « Spéciale Dr Meta-Evil », le Limiteur), `0x47BDE0` (281, la lettre
de Shrimplips, le retour sur l'île Medabot, le château de Milky, le Capitaine
et le lieutenant Tokkuri, la cantine des Rubberobos, les Screws et les quatre
mots-clés, Squidguts), puis `0x47C248` (256, l'après-Fiyun : Salty, le Rallye
Partsun et les Medaparts du Mega-Emperor, le téléachat, les indices de
Medashop, Shiratama, le professeur de musique, Kannie et Natsuko, les
Medaroad Race, Kawamura, le fan-club de Karin). Chaîne au vert, patch
reconstruit (250 065 octets) et vérifié par application, **déployé** : le
patch servi en ligne a le même SHA-1 que `patch/medabots-fr.bps`.

**Le narratif est mesuré, pas estimé : 2 217 dialogues sur 3 875, soit
57,2 %.** Le compte se refait à tout moment : nombre de lignes `@` dans
`travail/script/<table>.txt` contre `traduction/<table>.txt`, sur les
quatorze tables de dialogue (`0x479F0C` à `0x47DAD0`, plus `0x4144B4`).
C'est ce chiffre qui donne le `part` du lot « Histoire principale » (0,57),
pas une impression.

**Relogement après le chapitre 8** : 1 605 entrées relogées, 127 134 octets ;
il reste 8 309 486 octets libres sur 8 436 620.

**Deux sessions ont travaillé en même temps dans ce dépôt le 29/08**, sans
aucun moyen de se voir : toutes deux ont traduit `0x47B5B0`, et leurs
résultats se sont trouvés identiques (même patch, mêmes chiffres) — de la
chance, pas de la méthode. La seconde a ensuite écrit un `REPRISE.md`
(`7de578c`) que la première a écrasé sans le lire (`0609ada`) ; ses apports
sont réintégrés ici. **Les deux sessions écrivent aussi dans la même mémoire
de Claude** (`~/.claude/projects/…/memory/`).

**Le site remet la ROM traduite en fichier depuis le 29/08.** Bouton
« Télécharger la ROM traduite » dans la carte « Prête à lancer » : le patch est
appliqué à la copie déposée, dans le navigateur, et le fichier
`Medabots - Metabee (Europe) [FR].gba` (16 Mio) sort par une URL `blob:`.
Éprouvé dans Playwright : le fichier téléchargé est identique au bit près à
une application du même patch sous Node. **Le site ne sert toujours aucune
ROM** — la demande initiale était de la mettre en téléchargement, refusée,
et c'est cette forme-là qui a été livrée. Règle inscrite dans `CLAUDE.md`.

**Le relogement au-delà de 8 Mio n'a toujours pas été vu à l'écran.** C'est le
seul point du § 5 quater de `docs/format.md` marqué « non établi ». Deux
témoins sans progression : la scène d'ouverture (`0x48698C @0000`) et
l'inventaire (`0x483ED8 @0000`). Le pilotage automatique de mGBA a échoué le
29/08 (démo de 55 s, Start injecté sans effet) — **c'est à Yann, à la
manette** : lancer `mGBA.exe travail/medabots-fr.gba`, nouvelle partie, lire.

## La prochaine action

**Avant de commencer, faire `git log -1` et `git status` — et les relire
avant chaque commit.** Le 29/08, deux sessions ont traduit `0x47B5B0` en même
temps sans le savoir : la seconde a lu un arbre de travail à moitié écrit,
en a conclu qu'un lot avait été oublié, et a failli inscrire ce reproche
dans l'historique. Un dépôt qui bouge sous les pieds ne se devine pas — il
se regarde. Si `traduction/<table>.txt` existe déjà, non suivi ou commité,
**cette table est prise** : passer à la suivante.

**Traduire la table `0x4144B4` (256 entrées), la dernière table de dialogue.** Lire
toute la table, traduire d'un bloc, **commiter le fichier aussitôt écrit**
(pour qu'une autre session le voie), puis :

```
node outils/largeur.mjs <rom> traduction/4144B4.txt 212 --contre travail/script
MEDABOTS_ROM=<rom> npm run verifier
node outils/patch.mjs <rom> travail/medabots-fr.gba patch/medabots-fr.bps
cp patch/medabots-fr.bps site/public/  &&  cd site && npm run verifier && vercel deploy --prod --yes
```

Puis `site/src/donnees/avancement.ts` (`ENTREES.traduites`, le lot
« Histoire principale » : compte de dialogues, tables restantes, `part` =
dialogues traduits / total des dialogues). Vérifier le déploiement par le
SHA-1 du patch en ligne, pas en supposant.

Après elle, les quatorze tables de dialogue sont traduites ; restent les
décisions réservées à Yann (480 Medaparts, noms de Medabots et de
personnages) et les guillemets « ». La ROM d'origine est toujours à
`C:\Users\YHN\Documents\Git\Medabots - Metabee (Europe)_8586.gba`.

**Avant d'employer un signe, vérifier qu'il a un glyphe.** Le chapitre 8 a
failli partir avec des `°` (« n° 128 ») : jamais employé, absent de
`docs/format.md`, remplacé par « numéro ». Les noms de médailles et d'objets
se prennent dans `traduction/3B6590.txt` et `483ED8.txt` — « PHÉNIX », pas
« PHOENIX ».

**Compter les entrées d'une table ne dit pas combien il y a à traduire.**
`0x3C6744` en annonce 176 et n'en a que 122 de réelles ; `0x3C4B90` en annonce
128 et n'en a que 6. Toujours lire avant d'estimer.

### Deux chantiers courts, si l'envie prend

- **Les guillemets « ».** Onze emplacements de glyphe sont vides (`0x4F`, puis
  `0x7D`–`0x86`). Deux chevrons à dessiner, deux largeurs à écrire, et les 68
  derniers replis disparaissent. Tout l'outillage est en place.
- **Les 480 Medaparts**, toujours à trancher — voir ci-dessous.

### Les 480 Medaparts : à trancher avant de s'y mettre

Analyse faite : **480 entrées réelles, aucun emplacement de débogage, mais 347
mots finaux distincts** — les 22 plus fréquents ne couvrent que 25 % du total.
Aucune régularité exploitable : c'est 480 décisions individuelles.

Et ces noms sont adossés aux modèles de Medabots, dont les noms restent en
anglais par décision. Traduire « CHERUB BODY » en « CORPS CHÉRUBIN » pendant
que le Medabot s'appelle toujours « CHERUB » crée une incohérence à l'écran.

**Recommandation : les laisser en anglais**, comme les noms de Medabots — mais
c'est un choix de produit qui appartient à Yann, pas une évidence technique.
Le chapitre 6 les cite tels quels (COCKPIT, STABILIZER, WING, JET ENGINE pour
assembler le Femjet), ce qui va dans ce sens.

**Ne pas toucher — vérifié, ce sont des emplacements de débogage ou des
identifiants :**

| Table | Entrées | Pourquoi |
|---|---|---|
| `0x3C4B90` | @0006–@0127 | `Data06`…`Data7F`, jamais affichés |
| `0x3C6744` | @0122–@0175 | `Mess-0-122`…, jamais affichés |
| `0x3BCFEC` | les 480 | codes de pièces `BAT-11`, `ANG-11` |
| `0x3C40B8` | les 97 | noms de personnages, décision du 06/08 |
| `0x3BA658` | les 120 | noms de Medabots, décision du 06/08 |

## Décidé cette séance

- **Vocabulaire du chapitre 13 (24/09/2026).** Les compétences suivent
  3BE868.txt et 3B74B8.txt (Renverse, Repérage, Camouflage, esquive ;
  Berserk et Medaforce inchangés), les médailles 3B6590.txt ("CHAT", "?"),
  les objets 483ED8.txt ("Costume de chien", "Pile au citron"). Les
  Medabots rares (Sailormate, Brass, Moon Dragon, Natural Color, Betty
  Bear) et les douze Medaparts du Rallye restent en anglais ; "Medabot de
  type Ange/Crevette/Démon". Medabots AX cité tel quel.
- **Vocabulaire du chapitre 12 (24/09/2026).** La salle des machines, la
  salle de contrôle, le poste de pilotage, la zone d'atterrissage, la place,
  l'équilibre de Fiyun, le porte-bonheur, les Select 3 (Select Rouge, Bleu,
  Jaune ; la Tulipe rouge, bleue, jaune), la Reine des fourmis, les
  Antackers (Medabots fourmis, « nourriture »), « la fleur solitaire du
  mal » (Gillgirl), les attaques "Fonte" et "Napalm" (3BE868.txt),
  « Meda-boulette », « Meda-crêpe ». Les blocs répétés sont traduits à
  l'identique ; les 40 entrées vides ({FF} seul) sont conservées.
- **Vocabulaire du chapitre 11 (24/09/2026).** Le "Robattle Royal", la salle
  d'expérimentation, le "Royaume des Néo-Enfants", le jeu de la "Reine", le
  musée Medabot, la plaque d'égout, l'entrepôt, la petite île isolée, les
  3 frères ninjas (Goemon, Hanzo) et le parler ninja du chapitre 4, le Baron,
  Madame Karakuchi, Monsieur Jyunmai, "Medabots Hebdo", le Médaillon d'argent
  devenu fusée. Le vieil homme écorche « Robattle » (Bobattle, Rabottle,
  Tobrattle). Les Medabots de Kodine et la "STONECLUSTER" restent en anglais.
- **Vocabulaire du chapitre 10 (24/09/2026).** Le Limiteur, le Mega-Emperor
  et le Robo-Emperor (graphie de l'original, entrée par entrée), le
  Dr Meta-Evil, la Medabot Corporation, la "Mini grande roue" et le
  "Periscope" (objets), les Medaparts "Aim Shot" (en anglais), le tapis
  roulant, l'autodestruction, Riverview, le "Jaws", Babbyblu, l'"endroit
  spécial", la "journaliste du futur". « Robo retreat » = « Robo repli »,
  « Holy Medaroli » = « Nom d'un Medabot ! », la Phantom Lady reprend « la
  fleur de la justice » et « la mauvaise herbe du mal ». Armond et Aki se
  tutoient ; Henry vouvoie Armond.
- **Vocabulaire du chapitre 9 (24/09/2026).** Le château de la Sorcière
  (l'attraction ; Milky en est la sorcière, et « le château de Milky » du
  chapitre 7 reste), Milky Land de jour et de nuit, la Forêt perdue, le
  Maître des Ténèbres, l'Armée Rubberobo (les figurants), le Héros que Milky
  vouvoie, la peluche Rappy, le "Spirit" (montagnes russes), le "Shark"
  (ferry), le Royaume des Îles du Sud et le prince Kir, les manches 1re à 4e
  puis demi-finales et finale. Shandy parle italien, Tequonic un français
  cassé (« Le français, c'est vraiment dur ») ; Shrimplips garde ses « w »
  (« Shwimpwips ! »). « Big guy » et « big brother » deviennent « grand
  frère ». Boissons de `483ED8.txt` : jus d'orange, pack de citrons, huile
  de luxe ; 1,50 £ et 3 £.
- **La ROM traduite se télécharge fabriquée sur l'appareil, jamais servie.**
  Yann a demandé « mets la ROM disponible en téléchargement » ; héberger le
  fichier est une redistribution d'œuvre sous droits, et c'est la règle
  fondatrice du projet. Le bouton donne le même résultat à qui possède le
  jeu, sans que le serveur envoie autre chose que le patch. Un seul module
  construit la ROM patchée, pour le lecteur comme pour le fichier :
  `site/src/lib/romTraduite.ts`.
- **Vocabulaire du chapitre 8.** Le Rallye Partsun et le badge Partsun, le
  grand magasin (Medashop, Medamall), "Téléachat", le musée Medabot, la salle
  de musique, l'école publique Riverview, le lieu de réunion des Rubberobos,
  le parc Ninja et la maison Ninja, le fan-club de Karin (membre numéro 128),
  Monsieur l'Arbitre, le capitaine Awamori, Mademoiselle Natsuko. Sloan dit
  « Medaslips » pour « Medaparts » (Medapants). Salty : « Ouaf ouaf ! »,
  halètement en italique, « Reuse ici » pour « Rig rere ». La médaille
  « PHÉNIX » suit la liste des médailles. La livre £ (glyphe `0x4C`) est
  gardée : 5 £, 50 £, 5000 £.
- **Vocabulaire du chapitre 7.** Le Capitaine (des Select Corps) et le
  lieutenant Tokkuri, les Select 3, la Phantom Lady, les Screws — Samantha la
  Vis cruciforme, Spyke la Vis plate, Sloan le Boulon, « la Chef » quand ils
  parlent d'elle —, la cantine des Rubberobos, le Spice-A-Roni (Doux, Épicé,
  Bouche en enfer), le mot-clé, la gaine d'aération, la lampe-stylo, le
  château de Milky (« la sorcière la plus mignonne »), Monsieur Jyunmai,
  Monsieur le chercheur. Le cri « Deux, quatre, six, huit. Qui est-ce qu'on
  félicite ? » donne le mot-clé 2468. Les Medaparts (Periscope, SLIPPER,
  PLATE BEAM) restent en anglais. « Grandpa » de la lettre de Shrimplips
  devient « Papi ».
- **Vocabulaire du chapitre 6.** La forteresse volante Fiyun, la pierre
  Fiyun, le Limiteur, le Centre de recherche, la Medabot Corporation, le
  repaire secret, la statue de Bonaparte, la place de la gare, la serre,
  l'usine d'huile, la capsule de secours, l'huile « Spéciale Dr Meta-Evil ».
  Les objets prennent le nom de `483ED8.txt` : « Ailes du vent », « Pile au
  citron », « Huile de luxe ». Madame Amazake, Grand-père (Nae parlant du
  Dr Aki), la résidence Jyunmai. Les Medabots de Fiyun crient
  `{F8}Graaah !!{F8}` ; Armond rit « Gya ha ha ! » comme au chapitre 1 ;
  « Meda-mush » devient « de la bouillie de Medabot ».
- **Vocabulaire du chapitre 5.** Les Ruines antiques, le téléporteur, le
  royaume de Kodine, le temple de Kodine, la salle d'invocation, le champ de
  fleurs, le Grand Héros, le Chambellan, l'Oracle Jyozo, le Chancelier Ginjyo,
  la pierre Fiyun, la Pierre sacrée, les Medabots Cauchemar, Magie
  Arc-en-ciel. La reine Margarita, cinq ans, parle d'elle à la troisième
  personne comme dans l'original. Blue Hawaii, Cafe Ole et Gillgirl restent
  tels quels. `{45}` est le locuteur du Chambellan, conservé.
- **Vocabulaire des chapitres 1 à 4** : voir l'en-tête de chaque fichier
  `traduction/47xxxx.txt`, qui le fixe au moment où il est traduit.
- **La règle des 40 % de contexte ne s'applique pas à ce projet.** Demandé par
  Yann le 29/08. Ce qui reste dû : `REPRISE.md` à jour dans le dernier commit,
  rien de non commité en fin de séance.
- **Le streaming est refusé, la page légale est construite.** Les épisodes en
  dépôts de fans ne seront pas liés, même s'ils sont la seule copie existante.

## À ne pas refaire

- **Écrire un antislash dans un heredoc bash depuis Claude Code.** `\\`
  arrive en `\` dans le fichier, même entre `<<'EOF'` quotés : un script Node
  qui devait écrire `Documents\Git\` a reçu une chaîne invalide, et un `sed`
  a échoué sans un mot. Passer par l'outil d'écriture de fichiers, ou
  construire l'antislash par `String.fromCharCode(92)`.
- **`vite preview` n'écoute qu'en IPv6 sur ce poste** : `http://localhost:4173`
  répond `ERR_CONNECTION_REFUSED` depuis Playwright alors que le serveur
  tourne. Ouvrir `http://[::1]:4173/`.
- **Laisser le fichier téléchargé par un test Playwright.** Il atterrit dans
  `Documents\Git\.playwright-mcp\`, c'est une ROM : la supprimer après la
  mesure. Les captures d'écran, elles, tombent à la racine de `Documents\Git`.
- **Supposer qu'un `vercel deploy` a livré.** Vérifier par le SHA-1 du patch
  en ligne (`curl … | sha1sum`) et par `vercel ls medabots-fr`.
- **`mgba-sdl.exe -g` pour le stub GDB.** Le processus reste vivant, titre
  « mGBA », et n'écoute sur aucun port. Seul `mGBA.exe -g` (Qt) ouvre le 2345.
- **Prouver un mappage avec des zéros.** La zone étendue est à zéro, et le bus
  ouvert vaut aussi zéro à `0x08800000` exactement. Écrire un marqueur non nul
  et le relire ; lire au-delà de la taille pour voir le motif de bus ouvert.
- **Calibrer la largeur sur tout `travail/script`.** Les tables de listes n'ont
  pas de sauts de ligne : le maximum monte à 4 393 px et ne veut rien dire.
- **Compter les paramètres des codes de contrôle comme du texte.** `{FB}` porte
  trois octets, `{F9}` et `{F7}` un.
- **Croire un schéma Postgres joignable parce qu'il existe.** PostgREST ne sert
  que sa liste `db_schema`, et répond `PGRST106` aux autres.
- **Attendre 201 d'un upsert qui met à jour.** PostgREST rend `200`.
- **Injecter ALT pour voler le focus.** Il ouvre la barre de menu de Qt. **F24**.
- **Croire `SetForegroundWindow` et `AttachThreadInput` suffisants.** Il faut
  aussi `SPI_SETFOREGROUNDLOCKTIMEOUT` à 0 et une frappe à vide.
- **Redimensionner la fenêtre mGBA trop tôt.** `SetWindowPos` pendant le
  chargement est ignoré sans un mot.
- **Croire une table sur sa largeur déclarée.** Les typographes ont serré la
  ponctuation à la main.
- **Un garde d'exécution qui teste `process.argv[2]`.** Comparer
  `import.meta.url` à `pathToFileURL(process.argv[1])`.
- **`curseur.pos += litVarint(...)`.** `a += f()` lit `a` AVANT `f()`.
- **Borner une entrée par un plafond arbitraire.** Ça traverse la table de
  pointeurs voisine et défait le repointage sans que l'identité le voie.
- **Employer `+` dans une traduction** : pas de glyphe (ni `;`, `*`, `=`). `&`
  et `%` existent, en `0x4D` et `0x4E`.
- **Oublier l'octet après `0xFF`.** L'écrire `{FF}{00}` et non `{FF} `.
- **`winget install mGBA.mGBA`** : c'est `JeffreyPfau.mGBA`.
- **Lire la version GBA en `0xBD`** : elle est en `0xBC`.
- **Typer `Uint8Array` sans son paramètre** dans le site (TypeScript 5.7).
- **Deviner l'adresse d'une phrase.** `outils/trouver.mjs`.
