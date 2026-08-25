# Reprise — Medabots FR

Dernière séance : 2026-08-25

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Le français s'écrit avec ses accents, et ils s'affichent.** C'était la dernière
limite connue du projet ; elle est tombée le 25/08 sans qu'un seul glyphe soit
dessiné. La cartouche est **européenne** : les 45 signes des quatre langues du
continent dormaient dans la police, juste après le 79e glyphe. Ce qui les rendait
inatteignables, ce sont les deux tables de chasse, à **zéro** sur ces codes — une
largeur nulle n'avance pas le curseur, donc le jeu ne pouvait pas les employer.

Écrire ces largeurs a suffi. **90 octets.** Les ~700 replis d'accents sont tombés
à **68**, et ces 68 ne sont que les guillemets « », que la police n'a réellement
pas. Pas un mot de la traduction n'a eu à être réécrit : écrire les accents dès
le premier jour, en acceptant qu'ils ne s'affichent pas encore, aura été le bon
choix.

**Le patch est régénéré** : `patch/medabots-fr.bps`, 692 entrées traduites,
20 996 octets modifiés, vérifié par réapplication.

**La chaîne est au vert** : 33 tables, 5 933 entrées, test d'identité identique
au bit près.

## La prochaine action

**Lancer le jeu et regarder.** C'est la même action qu'à la séance précédente, et
elle n'a toujours pas été faite. Les octets sont bons, le rendu simulé par
`outils/apercu-texte.mjs` est net, mais **personne n'a encore vu un accent à
l'écran d'un vrai émulateur**. Tout le reste attend cette vérification.

Les outils sont là : `outils/chasse-dialogue.mjs` amène le jeu à un écran de
texte, `outils/ecran.mjs` capture, `outils/gdb.mjs` parle à mGBA.

Ensuite, les **dialogues** (`0x47xxxx`, ~2 800 entrées) : l'essentiel du volume et
tout ce qui reste de vraiment visible. Les prendre par petites tables complètes,
comme `0x48521C` et `0x48698C` — une table entière livrée d'un bloc vaut mieux
qu'un chapitre à moitié français.

### Deux chantiers courts, si l'envie prend

- **Les guillemets « ».** Onze emplacements de glyphe sont vides (`0x4F`, puis
  `0x7D`–`0x86`). Deux chevrons à dessiner, deux largeurs à écrire, et le repli
  disparaît. Tout l'outillage est en place.
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

- **On lit l'anglais avec la table d'origine, on n'écrit le français qu'avec la
  table étendue.** Ce n'est pas une précaution de style : décoder avec la table
  complète rend lisibles des octets qui ne sont pas du texte. Au premier essai, le
  détecteur de tables est passé de 33 à 35 tables et de 5 933 à 6 047 entrées —
  deux zones de données avaient franchi le seuil par les seuls codes
  `0x50`–`0x7C`. D'où `TABLE_LECTURE`, employée par `pointeurs.mjs`,
  `extraire.mjs` et `lister.mjs`.
- **Les largeurs des accents s'écrivent APRÈS le test d'identité**, jamais avant.
  Ouvrir les accents est une modification volontaire de la ROM, pas une
  réinsertion de texte ; les mêler ferait échouer le seul contrôle qui prouve que
  l'outillage ne perd rien.
- **La largeur d'un accentué est la plus grande de deux mesures** : celle de sa
  lettre de base, et la place réellement occupée. Elles concordent partout sauf
  pour `î`, `ï` et `í`, dont le fût est décalé pour dégager le diacritique.
- **Le site garde son état « bloqué »** dans le type `Etape`, même sans étape qui
  l'emploie : un site qui ne sait plus dire « bloqué » ne peut plus être honnête.

## À ne pas refaire

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
