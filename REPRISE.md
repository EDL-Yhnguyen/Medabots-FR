# Reprise — Medabots FR

Dernière séance : 2026-08-29

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**La synchronisation est en service, et elle est éprouvée.** C'était la prochaine
action de la séance précédente, où elle n'était que du code non vérifié. Les
trois points sont faits : schéma `medabots` créé dans le projet Supabase
personnel, variables posées sur les trois environnements Vercel, et la chaîne
parcourue pour de bon.

**Deux bancs sur de vrais comptes**, pas des simulations. Le premier :
écriture, relecture, cloisonnement entre deux comptes, refus d'écrire pour
autrui (403), déclencheur d'horodatage, bornes de taille, `oublie_ma_sauvegarde`.
Le second, ajouté parce que le premier ne le couvrait pas : **l'upsert
`ON CONFLICT` que `envoyerAuCompte` emploie réellement** — c'est ce cas précis
qui avait piégé EDL Admin sous RLS. Les deux au vert, les comptes de banc
supprimés, la table à zéro ligne.

**Puis dans le navigateur, sur le site en production** : compte créé, « Partie
synchronisée » affiché, lecture du schéma `medabots` en `200` avec le rôle
`authenticated`. Le bundle en ligne porte l'URL et la clé, **sans BOM** — le
piège de Mamakilo était le seul risque muet de la manœuvre, il est écarté.

**Le site était resté sur sa version du 06/08.** Le projet Vercel n'est pas
relié à GitHub : trois semaines de travail — les accents, le compte, la
synchro — étaient dans le dépôt sans avoir jamais été déployées. C'est corrigé,
et la règle est passée dans le `CLAUDE.md` : le déploiement se fait à la main.

**La chaîne de traduction n'a pas bougé** : 33 tables, 5 933 entrées, test
d'identité au bit près.

## La prochaine action

**Ouvrir la première table de dialogues de `0x47xxxx` et la traduire entière.**
C'est l'essentiel du volume restant et tout ce qui se voit vraiment en jeu :
~2 800 entrées réparties en 14 tables de 233 à 323 entrées.

Prendre **une table complète d'un bloc** — un chapitre à moitié français est
pire que rien. Commencer par lister les tables et leur volume réel :

```
MEDABOTS_ROM="…/Medabots - Metabee (Europe).gba" node outils/lister.mjs
```

Pour situer une phrase vue à l'écran, `node outils/trouver.mjs <rom> "la phrase"`
donne son adresse et qui la pointe.

**Compter les entrées d'une table ne dit pas combien il y a à traduire.**
`0x3C6744` en annonce 176 et n'en a que 122 de réelles ; `0x3C4B90` en annonce
128 et n'en a que 6. Toujours lire avant d'estimer.

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

## Décidé cette séance

- **La règle des 40 % de contexte ne s'applique pas à ce projet.** Demandé par
  Yann le 29/08. Elle vaut pour le workspace `Documents\Git` ; ici les séances
  sont faites de longues passes d'analyse binaire qu'un arrêt à mi-chemin oblige
  à refaire. Ce qui reste dû : `REPRISE.md` à jour dans le dernier commit, et
  rien de non commité en fin de séance.
- **Le streaming d'épisodes et de films est refusé, une seconde fois.** Redemandé
  le 29/08, cette fois avec des films « comme sur tosnov.com ». La réponse ne
  change pas : un annuaire d'œuvres sous droits est exactement ce que le projet
  refuse pour la ROM elle-même, et le site dit noir sur blanc qu'aucun jeu n'y est
  distribué. **Alternative proposée, en attente de réponse :** une page « Où voir
  Medabots légalement » renvoyant vers les diffuseurs qui en ont les droits.
- **Le déploiement du site est manuel.** Constaté en voyant que le site servait
  la version du 06/08. Passé dans le `CLAUDE.md`, avec les deux autres pièges
  Supabase (schéma à exposer, `grant usage`).
- **Un banc doit exercer le verbe exact du code, pas un verbe voisin.** Le premier
  banc couvrait `insert` et `update` séparément et disait « RLS vérifiée » ; le
  code, lui, fait un `upsert`. Deux chemins différents dans PostgreSQL, deux jeux
  de politiques évalués.

## À ne pas refaire

- **Croire un schéma Postgres joignable parce qu'il existe.** Créer `medabots`,
  ses politiques et ses `grant` ne suffit pas : PostgREST ne sert que les schémas
  de sa liste `db_schema`, et répond `PGRST106` aux autres. Le détail est dans le
  `CLAUDE.md`.
- **Attendre 201 d'un upsert qui met à jour.** PostgREST rend `201` à la création
  et `200` sur un `merge-duplicates` qui écrase. Le banc a annoncé un échec sur un
  code parfaitement correct — une assertion fausse coûte le même temps qu'un vrai
  défaut.
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
- **On cherche une phrase, on ne devine pas son adresse.** `demo-accents.mjs`
  écrivait son banc d'essai en dur à `0x4148BE`, et l'écran restait anglais : la
  ROM contient DEUX copies de « Good afternoon! », et celle qui s'affiche est la
  seconde, `0x474C87`. D'où `outils/trouver.mjs`.
