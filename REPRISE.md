# Reprise — Medabots FR

Dernière séance : 2026-08-29

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Quatre chapitres sont en français : 1 850 entrées sur 5 933.** Table
`0x479F0C` (237 dialogues, le vol d'Eggy et la prise d'otages de Rosewood),
`0x47A2C4` (303, le mont Odoro, Kannie, Yanagi, le Phantom Renegade),
`0x47A784` (323, l'île Medabot, le tournoi du bloc B, le Dr Armond, la maison
hantée), puis `0x47B110` (295, les enfants disparus, le repaire des égouts, le
mot de passe chanté, l'Académie Woodrose, l'élection du sous-chef). Chaîne au
vert, patch reconstruit et vérifié par application, recopié sur le site.

**La ROM traduite fait 16 Mio, et c'est éprouvé.** Les 48 Kio d'espace libre
d'origine ne suffisaient plus ; `reinserer.mjs` étend en `0x00` à chaque
construction traduite, jamais en mode identité. Ce qui l'établit : rien dans
le binaire ne référence sa propre fin ; le jeu démarre dans mGBA sur la ROM
étendue ; un marqueur écrit à `0x800100` et `0xFFFF00` se relit à travers le
bus par le stub GDB, alors qu'au-delà de 16 Mio le stub rend le motif de bus
ouvert. Le patch BPS encode les 8 Mio ajoutés en 10 octets (`TargetCopy`), et
l'applicateur du site reconstruit la ROM de 16 Mio à l'identique — vérifié en
important le vrai `patch.ts` sous Node 24. Détail : `docs/format.md` § 5 quater.

**Le relogement a franchi les 8 Mio.** 893 entrées relogées, 57 332 octets,
dont 7 709 au-delà de `0x800000` (jusqu'à `0x802457`). Six tables y ont des
entrées : `0x47A784` (61), `0x483ED8` (32), `0x47E388` (28), `0x485F88` (20),
`0x48521C` (12), `0x48698C` (10). **Aucune n'a encore été vue à l'écran** —
c'est le seul point du § 5 quater de `docs/format.md` marqué « non établi ».

**`outils/largeur.mjs`** mesure chaque ligne en pixels (plafond 212 px,
mesuré) et la structure des boîtes contre l'original. Les deux chapitres
culminent à 180 et 185 px, aucune boîte n'a gagné de ligne.

## La prochaine action

**Voir à l'écran un texte relogé au-delà de 8 Mio.** Le témoin le plus
accessible : `0x47E388 @0000`, « Vous ne pouvez plus rien porter ! », le
message d'équipement — il s'affiche dès qu'on surcharge un Medabot dans le
menu, sans avancer dans l'histoire. Il faut une sauvegarde ou une partie menée
jusqu'au premier menu d'équipement, `mGBA.exe -g travail/medabots-fr.gba`, puis
`outils/ecran.mjs` sur un dump VRAM pris par le stub GDB (`outils/gdb.mjs`,
`lire(0x06000000, 0x18000)` + IO + palette, comme dans `banc-16mio`). Une fois
vu, passer le § 5 quater de `docs/format.md` en « établi ».

**Puis la table suivante par ordre d'adresse : `0x47B5B0`, 259 entrées.**
Même méthode — lire toute la table, traduire d'un bloc, puis :

```
node outils/largeur.mjs <rom> traduction/47B5B0.txt 212 --contre travail/script
MEDABOTS_ROM=<rom> npm run verifier
node outils/patch.mjs <rom> travail/medabots-fr.gba patch/medabots-fr.bps
cp patch/medabots-fr.bps site/public/  &&  cd site && npm run verifier && vercel deploy --prod
```

Puis mettre `site/src/donnees/avancement.ts` à jour (`ENTREES.traduites` et le
lot « Histoire principale »).

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
Les dialogues du chapitre 2 les citent tels quels (« BATTLE RIFLE »,
« PSYCHO MISSILE », « HEAVYWEIGHTER »), ce qui va dans ce sens.

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

- **La ROM traduite fait 16 Mio, toujours en mode traduction.** Une taille qui
  changerait à la première table trop grosse serait une surprise de plus. Le
  bourrage ajouté est en `0x00`, comme celui d'origine.
- **Vocabulaire du chapitre 2.** Mont Odoro, marais d'Odoro, étang d'Odoro, la
  sorcière de la montagne, le Centre de recherche, le Dr Aki, « Medabots
  Hebdo », le passeur à 1 £ (le glyphe `£` existe, `0x4C`). Kannie dit « mon
  petit » et « Hi hi hi » ; les Rubberobos crient « Robo repli ! ». Types
  d'attaque selon la table `3B66EC` : anti-air, anti-mer, gravité.
- **Vocabulaire du chapitre 4.** Le sous-chef, « Chef Médaille », la salle de
  recherche du Mal, l'expérience du soda, la Medabot Corporation, la série
  Élémentaire, la plateforme de combat, le snack, la Reine des fourmis,
  Sidecar, la statue du noble chien Bonaparte, l'Académie Woodrose. Le gag du
  mot de passe est adapté sur des chansons françaises : « Montagne ! / Elle
  descend de la montagne à cheval ! » et « Rivière ! / Bateau sur l'eau, la
  rivière au bord de l'eau », refrain « Ohé ohé ».
- **Vocabulaire du chapitre 3.** L'île Medabot, le site Surprise, la salle du
  tournoi, l'infirmerie, la salle d'arcade, la Fédération Medabot,
  Mademoiselle Sammy, Mademoiselle Nae, le Hopmart, Rappy. Shrimplips remplace
  ses « r » par des « w » (« wecwuter », « Gwand-pèwe ») ; les étrangers du
  tournoi parlent un français cassé (« Moi pas perdre ! »). Les noms
  d'attaques étrangères restent en anglais (Rolling Needle Bomber).
- **Vocabulaire du chapitre 1**, rappel : le directeur, le jeune maître,
  l'école privée Rosewood, le soutien / le rattrapage, détraqué. Espace avant
  `!` `?` `:`, et le nom du joueur `{F9} ` suivi de ` !` — deux espaces.
- **La règle des 40 % de contexte ne s'applique pas à ce projet.** Demandé par
  Yann le 29/08. Ce qui reste dû : `REPRISE.md` à jour dans le dernier commit,
  rien de non commité en fin de séance.
- **Le streaming est refusé, la page légale est construite.** Les épisodes en
  dépôts de fans ne seront pas liés, même s'ils sont la seule copie existante.

## À ne pas refaire

- **`mgba-sdl.exe -g` pour le stub GDB.** Le processus reste vivant, titre
  « mGBA », et n'écoute sur aucun port. Seul `mGBA.exe -g` (Qt) ouvre le 2345.
  Le titre « Une erreur est survenue » pendant le chargement est la fausse
  alerte déjà connue.
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
- **Chercher la police, puis planifier de dessiner des accents.** REGARDER CE
  QU'IL Y A JUSTE APRÈS LA DONNÉE QU'ON VIENT DE TROUVER.
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
