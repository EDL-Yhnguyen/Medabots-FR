# Reprise — Medabots FR

Dernière séance : 2026-09-24 · dernier commit : `8c3cf61` Histoire principale
terminee: patch reconstruit, site a 4 567 entrees, narratif 3 875/3 875

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Les quatorze tables de dialogue sont en français : 4 567 entrées sur
5 933, narratif 3 875 sur 3 875.** La séance du 24/09/2026 a traduit d'un
trait les six dernières (`0x47C64C` la suite de l'île Medabot et le château
de la Sorcière, `0x47CD7C` le final chez le Dr Meta-Evil et l'épilogue,
`0x47D124` l'après-jeu, `0x47D5C0` la chute de Fiyun et les Antackers,
`0x47DAD0` les répliques éparses de toute l'aventure, `0x4144B4` les messages
système) après les huit du 29/08. Chaque table a été commitée dès l'écriture,
mesurée (`largeur.mjs`, 212 px), passée par `npm run verifier`, reconstruite
en patch, recopiée dans `site/public/`, déployée (`vercel deploy --prod`) et
contrôlée par le SHA-1 du patch en ligne. Relogement final : 2 556 entrées,
210 978 octets ; 8 225 642 octets libres sur 8 436 620. Patch : 383 363 octets.

**Ce qui n'est pas traduit, et pourquoi.** Quatre tables sur 33 :
`0x3BA658` (120 noms de Medabots) et `0x3C40B8` (97 noms de personnages), par
décision du 06/08 ; `0x3BCFEC` (480 codes de pièces `BAT-11`) qui sont des
identifiants ; et `0x3BBB4C`, les **480 noms de Medaparts**, gardés en anglais
par décision de Yann du 24/09. Dans `0x4144B4`, le débogage (« Face 00 »,
« Item X,sorry ») et les huit pointeurs décodés en texte (@0248–@0255) sont
recopiés à l'identique : les modifier relogerait la table de pointeurs.

**Le relogement au-delà de 8 Mio n'a toujours pas été vu à l'écran.** C'est le
seul point du § 5 quater de `docs/format.md` marqué « non établi ». Témoins :
la scène d'ouverture (`0x48698C @0000`) et l'inventaire (`0x483ED8 @0000`).
Le pilotage automatique de mGBA a échoué le 29/08 — **c'est à Yann, à la
manette** : lancer `mGBA.exe travail/medabots-fr.gba`, nouvelle partie, lire.

## La prochaine action

**Le chantier de traduction est clos.** Yann a tranché le 24/09/2026 : les
480 noms de Medaparts (`0x3BBB4C`) restent en anglais, comme les noms de
Medabots et de personnages. Le site le dit (étiquette « Terminée », lots
« Objets » et « PNJ » à 1, `ENTREES.gardees` = 1 366 entrées gardées en
anglais par choix ou jamais affichées).

Ce qui reste est de la vérification et du confort, pas de la traduction :

1. **La relecture en jeu**, à la manette : les chapitres 9 à 13 n'ont jamais
   été vus à l'écran, ni le texte relogé au-delà de 8 Mio (témoins :
   `0x48698C @0000`, `0x483ED8 @0000`). Toute coquille se corrige dans
   `traduction/<table>.txt`, puis le cycle habituel.
2. **Les guillemets « »** : onze emplacements de glyphe vides (`0x4F`, puis
   `0x7D`–`0x86`). Deux chevrons à dessiner, deux largeurs à écrire, et les 68
   derniers replis disparaissent. Tout l'outillage est en place.
3. **L'interface** reste affichée à 0,5 sur le site : ce qui manque n'est pas
   dans les 33 tables de script (menus dessinés en tuiles, à établir avant
   d'y toucher).

Avant tout : `git log -1` et `git status`. Deux sessions ont déjà travaillé
en même temps dans ce dépôt (29/08) sans se voir ; si un fichier de
`traduction/` existe, non suivi ou commité, la table est prise.

La ROM d'origine est toujours à
`C:\Users\YHN\Documents\Git\Medabots - Metabee (Europe)_8586.gba` ; les
commandes du cycle (largeur → verifier → patch → cp → site verifier →
deploy → avancement.ts → SHA-1 en ligne) sont dans les messages de commit du
24/09 et dans `CLAUDE.md`.

**Ne pas toucher — vérifié, ce sont des emplacements de débogage ou des
identifiants :**

| Table | Entrées | Pourquoi |
|---|---|---|
| `0x3C4B90` | @0006–@0127 | `Data06`…`Data7F`, jamais affichés |
| `0x3C6744` | @0122–@0175 | `Mess-0-122`…, jamais affichés |
| `0x4144B4` | @0000–@0030, @0136–@0255 | débogage et pointeurs décodés en texte |
| `0x3BCFEC` | les 480 | codes de pièces `BAT-11`, `ANG-11` |
| `0x3BBB4C` | les 480 | noms de Medaparts, décision de Yann du 24/09 : anglais |
| `0x3C40B8` | les 97 | noms de personnages, décision du 06/08 |
| `0x3BA658` | les 120 | noms de Medabots, décision du 06/08 |

## Décidé cette séance

- **Les 480 noms de Medaparts restent en anglais** (Yann, 24/09/2026), pour
  rester cohérent avec les noms de Medabots qu'ils désignent et avec les
  dialogues qui les citent tels quels. Le chantier de traduction est clos ;
  le site affiche « Terminée » et compte 1 366 entrées gardées par choix.
- **Le vocabulaire de chaque chapitre est fixé dans l'en-tête de son fichier**
  `traduction/<table>.txt`, au moment où il est traduit. C'est là qu'on le
  cherche, pas ici. Points transverses du 24/09 : les compétences suivent
  `3BE868.txt` et `3B74B8.txt` (Renverse, Repérage, Camouflage, Fonte,
  Napalm ; Berserk et Medaforce inchangés), les médailles `3B6590.txt`
  (« PHÉNIX », « CHAT »), les objets `483ED8.txt` (« Pack de citrons »,
  « Huile de luxe », « Pile au citron », « Costume de chien », « Mini grande
  roue », « Peluche Rappy »). « Holy Medaroli » = « Nom d'un Medabot ! »,
  « Robo retreat » = « Robo repli ». Les Medaparts, les Medabots et les noms
  propres restent en anglais ; Shrimplips garde ses « w », les ninjas leur
  parler télégraphique, Tequonic son français cassé, Shandy son italien.
- **Le Chambellan et Milky vouvoient le Héros ; Armond et Aki se tutoient ;
  Henry vouvoie Armond.** Les enfants disent « grand frère » au joueur.
- **Une table qui répète ses blocs se traduit à l'identique** (`0x47D5C0` :
  323 entrées, 217 textes uniques, 40 vides) ; le relogement dédoublonne.
- **Les 40 entrées vides et les pointeurs décodés en texte restent
  intacts.** `largeur.mjs` les signale à 4 393 px : c'est attendu, ils ne
  s'affichent jamais.
- **Avant d'employer un signe, vérifier qu'il a un glyphe** : pas de `°`, ni
  `+`, `;`, `*`, `=` ; `:` s'écrit `{45}` ou `:` (même octet), `&` et `%`
  existent. Les accents et `œ` s'affichent.
- **La ROM traduite se télécharge fabriquée sur l'appareil, jamais servie**
  (29/08) : `site/src/lib/romTraduite.ts`, règle inscrite dans `CLAUDE.md`.
- **La règle des 40 % de contexte ne s'applique pas à ce projet** (29/08).

## À ne pas refaire

- **Écrire un antislash dans un heredoc bash depuis Claude Code.** `\\`
  arrive en `\` dans le fichier, même entre `<<'EOF'` quotés. Passer par
  l'outil d'écriture de fichiers, ou `String.fromCharCode(92)`.
- **Un `sed` de remplacement plus long que l'original** pour ramener une ligne
  sous 212 px : remesurer avant de commiter (24/09, `47D124 @0257`).
- **`vite preview` n'écoute qu'en IPv6 sur ce poste** : ouvrir
  `http://[::1]:4173/`.
- **Laisser le fichier téléchargé par un test Playwright** dans
  `Documents\Git\.playwright-mcp\` : c'est une ROM, la supprimer.
- **Supposer qu'un `vercel deploy` a livré.** Vérifier par le SHA-1 du patch
  en ligne (`curl … | sha1sum`).
- **`mgba-sdl.exe -g` pour le stub GDB.** Seul `mGBA.exe -g` (Qt) ouvre le 2345.
- **Prouver un mappage avec des zéros.** Écrire un marqueur non nul et le relire.
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
- **Oublier l'octet après `0xFF`.** L'écrire `{FF}{00}` et non `{FF} `.
- **`winget install mGBA.mGBA`** : c'est `JeffreyPfau.mGBA`.
- **Lire la version GBA en `0xBD`** : elle est en `0xBC`.
- **Typer `Uint8Array` sans son paramètre** dans le site (TypeScript 5.7).
- **Deviner l'adresse d'une phrase.** `outils/trouver.mjs`.
