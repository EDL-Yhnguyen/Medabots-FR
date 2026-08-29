# Reprise — Medabots FR

Dernière séance : 2026-08-29

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Le premier chapitre est en français.** Table `0x479F0C`, 237 dialogues — le
vol d'Eggy au Medashop, l'école privée Rosewood, Hachiro, la prise d'otages,
Seaslug, Squidguts et Gillgirl. Traduite d'un bloc, chaîne au vert, patch
reconstruit et vérifié par application, recopié sur le site. **929 entrées
traduites sur 5 933.**

**Deux contraintes que la chaîne ne voyait pas sont maintenant outillées.**
`outils/largeur.mjs` mesure chaque ligne en pixels avec les deux tables de
chasse (romaine et italique) et compare la structure des boîtes à l'original.
Plafond **212 px, mesuré** sur la ligne anglaise la plus large des treize
tables de dialogue ; **deux lignes par boîte** au plus, sauf là où l'original en
avait davantage. La table traduite culmine à 180 px, aucune boîte n'a gagné de
ligne. Le détail est dans le `CLAUDE.md`.

**La synchronisation est en service, éprouvée au banc et au navigateur.**
Détail dans le commit `516706e` et le `CLAUDE.md`.

**Le site a une page « Où la voir, légalement ».** Trois pistes vérifiées le
29/08 — JustWatch, Prime Video, les DVD de 2002 par la notice BnF — et un
constat honnête : la VF de 2001 est perdue, aucun ayant droit ne la conserve,
et ce qui circule sur YouTube et Dailymotion vient de cassettes numérisées par
des fans. **Le site n'y renvoie pas**, pour la même raison qu'il ne distribue
pas le jeu.

**Le site et son patch étaient restés à la version du 06/08.** Le projet Vercel
n'est pas relié à GitHub. Déployé deux fois cette séance ; règle dans le
`CLAUDE.md`.

## La prochaine action

**Décider comment loger les 3 400 dialogues restants avant d'ouvrir la table
suivante.** L'espace libre en fin de ROM (`0x7F4464`, 48 Kio) est le seul
endroit où le relogement écrit, et **il n'en reste que 19 Kio** après 929
entrées. Les 13 tables restantes en demanderont de l'ordre de 100 Kio.

La voie classique : **étendre la ROM à 16 Mio** (`LIBRE_DEBUT` reste, la fin
recule ; le GBA accepte jusqu'à 32 Mio, mGBA et les cartouches flash aussi).
À vérifier avant de s'y engager : que le jeu ne lit pas sa propre taille
quelque part, et que le BPS tient une cible plus grande que la source — le
format le permet, `patch.mjs` suppose aujourd'hui des tailles égales.

Ensuite, la table suivante par ordre d'adresse : **`0x47A2C4`, 303 entrées.**
Même méthode — lire toute la table, traduire d'un bloc, puis :

```
node outils/largeur.mjs <rom> traduction/47A2C4.txt 212 --contre travail/script
MEDABOTS_ROM=<rom> npm run verifier
node outils/patch.mjs <rom> travail/medabots-fr.gba patch/medabots-fr.bps
cp patch/medabots-fr.bps site/public/  &&  cd site && vercel deploy --prod
```

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

- **Vocabulaire des dialogues.** Les termes de la franchise restent en anglais
  (Medabot, Medapart, Robattle, Medafighter, Medawatch, Medashop, Medalink,
  Rubberobo, Select Corps) et tous les noms propres. « Principal » → le
  directeur ; « young master » → le jeune maître ; « Rosewood Private School »
  → l'école privée Rosewood, ou l'école Rosewood quand la ligne serre ;
  « extra-study / make-up classes » → le soutien / le rattrapage ;
  « Weirdo / Freak » → détraqué. Espace avant `!` `?` `:`, et le nom du joueur
  `{F9} ` suivi de ` !` — deux espaces, c'est voulu.
- **La règle des 40 % de contexte ne s'applique pas à ce projet.** Demandé par
  Yann le 29/08. Ce qui reste dû : `REPRISE.md` à jour dans le dernier commit,
  rien de non commité en fin de séance.
- **Le streaming est refusé, la page légale est construite.** Yann a dit oui à
  la page ; les épisodes en dépôts de fans ne seront pas liés, même s'ils sont
  la seule copie existante — surtout parce qu'ils le sont.
- **Un banc doit exercer le verbe exact du code.** Le premier banc Supabase
  couvrait `insert` et `update` là où le code fait un `upsert`.
- **Le déploiement du site est manuel.** Constaté deux fois : le site ET son
  patch servaient la version du 06/08.

## À ne pas refaire

- **Calibrer la largeur sur tout `travail/script`.** Les tables de listes n'ont
  pas de sauts de ligne : une « ligne » y vaut l'entrée entière, le maximum
  monte à 4 393 px et ne veut rien dire. Mesurer sur les tables `0x47xxxx`.
- **Compter les paramètres des codes de contrôle comme du texte.** `{FB}` porte
  trois octets, `{F9}` et `{F7}` un : les additionner ajoute trois lettres
  fantômes à chaque changement de locuteur.
- **Croire un schéma Postgres joignable parce qu'il existe.** PostgREST ne sert
  que sa liste `db_schema`, et répond `PGRST106` aux autres.
- **Attendre 201 d'un upsert qui met à jour.** PostgREST rend `200` sur un
  `merge-duplicates` qui écrase.
- **Injecter ALT pour voler le focus.** Il ouvre la barre de menu de Qt et
  avale toutes les touches en silence. **F24** fait le même office.
- **Croire `SetForegroundWindow` et `AttachThreadInput` suffisants.** Il faut
  les trois gestes : `SPI_SETFOREGROUNDLOCKTIMEOUT` à 0, une frappe à vide,
  puis l'attachement.
- **Prendre le titre de fenêtre de mGBA pour un diagnostic.** Il affiche « Une
  erreur est survenue » pendant le chargement, alors que le jeu démarre.
- **Redimensionner la fenêtre mGBA trop tôt.** `SetWindowPos` pendant le
  chargement est ignoré sans un mot.
- **Chercher la police, puis planifier de dessiner des accents.** Neuf
  tentatives pour du travail inutile : **REGARDER CE QU'IL Y A JUSTE APRÈS LA
  DONNÉE QU'ON VIENT DE TROUVER.** Les 45 glyphes étaient à 64 octets de là.
- **Croire une table sur sa largeur déclarée.** « Dernière colonne encrée + 2 »
  n'est pas une loi ; les typographes ont serré la ponctuation à la main.
- **Un garde d'exécution qui teste `process.argv[2]`.** Comparer
  `import.meta.url` à `pathToFileURL(process.argv[1])`.
- **`curseur.pos += litVarint(...)`.** `a += f()` lit `a` AVANT `f()`.
- **Borner une entrée par un plafond arbitraire.** Lire 2048 octets « au cas
  où » traverse la table de pointeurs voisine et défait le repointage sans que
  le test d'identité voie quoi que ce soit.
- **Employer `+` dans une traduction** : pas de glyphe (ni `;`, `*`, `=`). `&`
  et `%` existent, en `0x4D` et `0x4E`.
- **Oublier l'octet après `0xFF`.** L'écrire `{FF}{00}` et non `{FF} `.
- **`winget install mGBA.mGBA`** : c'est `JeffreyPfau.mGBA`.
- **Lire la version GBA en `0xBD`** : elle est en `0xBC`.
- **Typer `Uint8Array` sans son paramètre** dans le site : générique depuis
  TypeScript 5.7.
- **Deviner l'adresse d'une phrase.** La ROM contient DEUX « Good afternoon! »
  ; celle qui s'affiche est la seconde. `outils/trouver.mjs`.
