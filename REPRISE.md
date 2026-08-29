# Reprise — Medabots FR

Dernière séance : 2026-08-29

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Les accents ont été vus à l'écran.** C'était la prochaine action depuis deux
séances, et elle est faite : mGBA 0.10.5, ROM de démonstration, premier écran de
dialogue du jeu. `Éçàèêîôûùïë ÀÇÎ` s'affiche, les quinze glyphes sont nets et
corrects.

**Les largeurs sont justes, et c'est mesuré, pas estimé.** Un second banc écrit
`aeiouAE` sur une ligne et `àéîôûÀÉ` sur la suivante : mêmes lettres, accentuées
ou non, l'une sous l'autre. Les deux lignes finissent au même pixel — sauf le
`î`, plus large de deux pixels que le `i`, ce qui est exactement l'exception
documentée à la séance du 25/08 (son fût est décalé pour dégager le circonflexe).

**La chaîne reste au vert** : 33 tables, 5 933 entrées, test d'identité identique
au bit près. Le patch n'a pas bougé.

**Le compte et la sauvegarde synchronisée sont écrits, mais PAS ÉPROUVÉS.** Le
typage passe et le site se construit ; rien n'a encore tourné contre une vraie
base, parce que deux choses manquent et qu'elles n'appartiennent qu'à Yann.

## La prochaine action

**Mettre la synchronisation en service, dans cet ordre :**

1. **Exécuter `supabase/schema.sql`** dans le projet Supabase personnel
   (`exovzmoygupllcdjbwtf`, celui de Mamakilo et MamaLingo). Il crée le schéma
   `medabots`, la table `sauvegardes`, ses politiques RLS et les droits du rôle
   `authenticated`. Il est idempotent.
2. **Poser `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`** dans le projet
   Vercel `medabots-fr`. ⚠ **Coller les valeurs sans BOM** — voir
   `site/src/lib/variablesEnv.ts` : le piège est muet et a coûté vingt jours à
   Mamakilo. `nettoieVariable` en protège, mais autant ne pas l'éprouver.
3. **Parcourir la chaîne connecté** : créer un compte, jouer, sauvegarder dans
   le jeu, recharger la page, vérifier que la partie revient. Puis recommencer
   depuis un autre navigateur, ROM redéposée — c'est le vrai cas d'usage.

Tant que le point 3 n'est pas fait, **la synchronisation est du code non
vérifié**, exactement comme les accents l'étaient avant le 29/08.

## Ensuite

**Les dialogues, `0x47xxxx`, ~2 800 entrées** réparties en 14 tables de 233 à 323
entrées. C'est l'essentiel du volume restant et tout ce qui est vraiment visible
en jeu. Les prendre par tables complètes : une table entière livrée d'un bloc
vaut mieux qu'un chapitre à moitié français.

Pour situer une phrase vue à l'écran, `node outils/trouver.mjs <rom> "la phrase"`
donne son adresse et qui la pointe.

**Décision de produit en attente** : les 480 noms de Medaparts, anglais ou
français (voir plus bas). Elle bloque un lot entier.

### Deux chantiers courts, si l'envie prend

- **Les guillemets « ».** Onze emplacements de glyphe sont vides (`0x4F`, puis
  `0x7D`–`0x86`). Deux chevrons à dessiner, deux largeurs à écrire, et les 68
  derniers replis disparaissent. Tout l'outillage est en place.
- **Les 480 Medaparts**, toujours à trancher — voir ci-dessous.

### Les 480 Medaparts : à trancher avant de s'y mettre

Analyse faite : **480 entrées réelles, aucun emplacement de débogage, mais 347 mots
finaux distincts** — les 22 plus fréquents ne couvrent que 25 % du total. Aucune
régularité exploitable : c'est 480 décisions individuelles.

Et ces noms sont adossés aux modèles de Medabots, dont les noms restent en anglais
par décision. Traduire « CHERUB BODY » en « CORPS CHÉRUBIN » pendant que le Medabot
s'appelle toujours « CHERUB » crée une incohérence à l'écran.

**Recommandation : les laisser en anglais**, comme les noms de Medabots — mais
c'est un choix de produit qui appartient à Yann, pas une évidence technique.

**Ne pas toucher — vérifié, ce sont des emplacements de débogage ou des
identifiants :**

| Table | Entrées | Pourquoi |
|---|---|---|
| `0x3C4B90` | @0006–@0127 | `Data06`…`Data7F`, jamais affichés |
| `0x3C6744` | @0122–@0175 | `Mess-0-122`…, jamais affichés |
| `0x3BCFEC` | les 480 | codes de pièces `BAT-11`, `ANG-11` |
| `0x3C40B8` | les 97 | noms de personnages, décision du 06/08 |
| `0x3BA658` | les 120 | noms de Medabots, décision du 06/08 |

**Compter les entrées d'une table ne dit pas combien il y a à traduire.**
`0x3C6744` en annonce 176 et n'en a que 122 de réelles ; `0x3C4B90` en annonce
128 et n'en a que 6. Toujours lire avant d'estimer.

## Décidé cette séance

- **La sauvegarde suit le compte, la ROM jamais.** C'est la même règle que pour
  le site, appliquée à la base : une ROM déposée sur un serveur, fût-il le sien,
  est une redistribution. Sur un appareil neuf, on redépose son fichier une fois
  et on retrouve sa partie. La limite est énoncée à l'écran plutôt que subie.
- **Medabots rejoint la suite d'applications**, il ne s'embarque pas dedans.
  Même projet Supabase, donc même `auth.users`, donc **le même compte** que
  Mamakilo et MamaLingo — cloisonné dans le schéma `medabots`. Un émulateur de
  jeu commercial monté dans une application de nutrition ou de science pour
  enfants aurait été un contresens de produit autant qu'un risque.
- **On n'écrase jamais une partie sans demander.** Deux appareils, deux parties :
  rien dans les octets ne dit laquelle compte. On montre la date et on laisse
  choisir. L'envoi, lui, est automatique — il ne détruit rien, l'ancienne valeur
  restant dans `precedente`.
- **Les liens vers des épisodes d'animés sont refusés.** Demandé le 29/08 pour
  Medabots et Digimon en VF. Un annuaire d'épisodes sous droits est exactement
  ce que le projet refuse pour la ROM. Reste possible : renvoyer vers les
  diffuseurs légaux.
- **On cherche une phrase, on ne devine pas son adresse.** `demo-accents.mjs`
  écrivait son banc d'essai en dur à `0x4148BE`, et l'écran restait anglais :
  la ROM contient DEUX copies de « Good afternoon! », et celle qui s'affiche est
  la seconde, `0x474C87`. D'où `outils/trouver.mjs`, qui encode un texte avec la
  table et le retrouve dans les 8 Mio, avec la liste de ses pointeurs.
- **Le banc d'essai est paramétrable.** Une fois l'affichage acquis, la question
  devient la chasse, et la mesurer demande un autre motif. Cinquième argument de
  `demo-accents.mjs`, en octets hex. La contrainte : exactement quinze octets,
  la longueur de la phrase remplacée, pour qu'aucun pointeur ne bouge.
- **Mesurer une chasse, c'est comparer deux bords**, pas juger « ça a l'air
  serré ». Deux lignes séparées par `{FD}`, mêmes lettres avec et sans accent :
  l'œil compare deux extrémités au lieu d'estimer des espacements.

## À ne pas refaire

- **Injecter ALT pour voler le focus.** Il donne bien le premier plan, mais il
  ouvre la barre de menu de Qt : toutes les touches envoyées ensuite vont au
  menu, `fenetre.ps1` annonce « touches envoyees », et l'écran-titre ne bouge
  pas. Le seul indice était le « F » de Fichier souligné sur la capture. **F24**
  fait le même office et n'existe sur aucun clavier.
- **Croire `SetForegroundWindow` et `AttachThreadInput` suffisants.** Avec deux
  terminaux ouverts, la fenêtre restait derrière. Il faut les trois gestes :
  `SPI_SETFOREGROUNDLOCKTIMEOUT` à 0, une frappe à vide, puis l'attachement.
- **Prendre le titre de fenêtre de mGBA pour un diagnostic.** Il affiche « Une
  erreur est survenue » pendant les premières secondes du chargement, alors que
  le jeu démarre normalement. Capturer avant de conclure.
- **Redimensionner la fenêtre mGBA trop tôt.** `SetWindowPos` appelé pendant le
  chargement est ignoré sans un mot.
- **Chercher la police, puis planifier de dessiner des accents.** Neuf tentatives
  au total, dont la neuvième — un plan complet de relogement, de réécriture de
  quinze mots de pool et de dessin de trente glyphes — pour du travail entièrement
  inutile. **REGARDER CE QU'IL Y A JUSTE APRÈS LA DONNÉE QU'ON VIENT DE TROUVER.**
  Les 45 glyphes étaient à 64 octets de là.
- **Croire une table sur sa largeur déclarée.** « Dernière colonne encrée + 2 »
  tient à 74/78 en romaine et à 25/78 en italique. Ce n'est pas une loi, c'est une
  tendance ; les typographes ont serré la ponctuation à la main.
- **Un garde d'exécution qui teste `process.argv[2]`.** `reinserer.mjs` importe
  `accents.mjs` ET reçoit un chemin de ROM en argv[2] : le tableau de contrôle
  sortait au milieu de la réinsertion. Comparer `import.meta.url` à
  `pathToFileURL(process.argv[1])`.
- **`curseur.pos += litVarint(...)`.** En JavaScript, `a += f()` lit `a` AVANT
  d'évaluer `f()`. Le curseur recule d'un octet et le décodeur lit une action
  fantôme. A fait croire une heure que le patch BPS était corrompu — il était juste.
- **Borner une entrée de texte par un plafond arbitraire.** La dernière entrée d'une
  table n'a pas de suivante ; lire 2048 octets « au cas où » traverse la table de
  pointeurs voisine, et la réécrire restaure les pointeurs d'origine. Ça défait le
  repointage **sans que le test d'identité voie quoi que ce soit**, puisque ces
  octets sont justement identiques.
- **Employer `+` dans une traduction** : la police n'en a pas le glyphe (ni `;`,
  `*`, `=`). « Gain puissance », pas « Puissance + ». En revanche `&` et `%`
  existent bien, en `0x4D` et `0x4E`.
- **Oublier l'octet de paramètre après `0xFF`.** L'écrire `{FF}{00}` et non `{FF} ` :
  une espace en fin de ligne se fait supprimer par n'importe quel éditeur.
- **`winget install mGBA.mGBA`** : ce paquet n'existe pas, c'est `JeffreyPfau.mGBA`.
- **Lire la version GBA en `0xBD`** : elle est en `0xBC`, le checksum est en `0xBD`.
- **Typer `Uint8Array` sans son paramètre de tampon** dans le site : depuis
  TypeScript 5.7 il est générique, et le build casse.
