# Format interne — Medabots: Metabee Version (GBA, Europe)

Tout ce qui suit a été **vérifié sur la ROM**, pas supposé. Ce qui reste incertain
est marqué comme tel.

---

## 1. Identité de la ROM de référence

Le patch ne vaudra que pour ce fichier exact. Toute autre révision donnera un
résultat indéfini.

| Champ | Valeur |
|---|---|
| Nom No-Intro | `Medabots - Metabee (Europe)` |
| Taille | 8 388 608 octets (64 Mbit), non tronquée |
| CRC32 | `50927F3E` |
| MD5 | `94CE0A59F8A6A0EC40B51EF13CFE0AA0` |
| SHA1 | `CD3D674E88F40A0707B150C4293588A659001D29` |

### En-tête GBA

| Offset | Champ | Valeur |
|---|---|---|
| `0x00` | point d'entrée | `0xEA00002E` (branchement ARM) |
| `0xA0` | titre | `MEDABOTSMTBV` |
| `0xAC` | code jeu | `A8BP` — `P` = Europe |
| `0xB0` | éditeur | `E9` |
| `0xB2` | valeur fixe | `0x96` ✅ |
| `0xBC` | version | `0x00` (1.0) |
| `0xBD` | checksum d'en-tête | `0x40` ✅ conforme au recalcul |

**Piège rencontré** : la version est en `0xBC` et le checksum en `0xBD`. Les
inverser fait conclure à tort que la ROM est corrompue. Elle ne l'est pas.

### Sauvegarde

Chaîne `EEPROM_V122` trouvée à `0x3ABE14`. Le jeu utilise donc une EEPROM
(512 o ou 8 Kio). À confirmer avant toute idée d'extension de sauvegarde :
l'EEPROM est le support le plus contraint de la GBA.

### Espace libre

Bourrage de `0x00` à partir de `0x7F4464` jusqu'à la fin : **47 100 octets**
(~46 Kio) utilisables pour du texte ou du code ajouté, sans agrandir la ROM.

---

## 2. Table de caractères ✅ RÉSOLUE

Trouvée par recherche relative (décalage `-70`, 1425 correspondances), puis
**confirmée par décodage de vrai texte**.

Source unique : [`outils/table-caracteres.mjs`](../outils/table-caracteres.mjs). Chaque
valeur y est justifiée par un contexte réel du script extrait.

```
0x00        espace
0x01–0x1A   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
0x1B–0x34   a b c d e f g h i j k l m n o p q r s t u v w x y z
0x35–0x3E   0 1 2 3 4 5 6 7 8 9
0x3F        .   point de suspension (s'emploie par trois)
0x40        .   point de fin de phrase
0x41        ,
0x42        '   apostrophe
0x43        -   trait d'union
0x44        /
0x46        ?
0x47        !
0x48        "   guillemet, ouvrant et fermant
0x49        (
0x4A        )
```

`0x45` = `:` — établi depuis, sur trois contextes (« Key: A Class », « Key: B
Class », « It says: »). La plage `0x4B`–`0xF7` reste à identifier ; c'est là que se
logeront les caractères accentués français.

### Correction du 06/08/2026

La première lecture annonçait `0x3F` = `?`. **C'était faux.** Le script extrait le
montre sans ambiguïté :

```
Is everyone alright{46}          →  Is everyone alright ?
Shouldn't you be studying{46}    →  Shouldn't you be studying ?
every now and th{3F}{3F}{3F}Zzz  →  every now and th...Zzz
```

`0x3F` est le point de suspension, employé par trois ; le point d'interrogation est
`0x46`. La leçon vaut pour la suite : **une table ne se valide pas sur des extraits
choisis, elle se valide sur le script entier.**

### Codes de contrôle

| Octet | Rôle observé |
|---|---|
| `0xFD` | saut de ligne dans une boîte de dialogue |
| `0xFE` | fin d'entrée dans une liste (objets, menus) |
| `0xFF` | fin de message ; souvent suivi d'un octet de paramètre |
| `0xF8`–`0xFC` | codes de contrôle divers — pause, portrait, insertion du nom du joueur (rôles exacts non encore établis) |

### Vérification

Décodage brut, sans retouche, depuis la ROM :

```
0x3B53D2  Set Medals for an Auto Robattle.
0x3B528A  Control Pad (Up/Down) moves cursor, A Button gives explanation.
0x452708  Let's continue with the award.
0x483D1E  Big Key / Manhole Key / Silver Locket / Wings of Wind / Lemon Battery
```

**Le texte n'est pas compressé.** Aucune couche de compression à casser pour les
dialogues — c'est le meilleur scénario possible.

---

## 3. Banques de texte

Cartographie par tranches de 4 Kio contenant plus de 45 % d'octets dans la plage
des lettres. 106 blocs, ~1,6 Mio au total — mais ce chiffre **surestime** :
du code ARM peut passer le filtre.

Noyau à haute confiance :

| Plage | Taille | Densité | Contenu probable |
|---|---|---|---|
| `0x414000`–`0x47A000` | 408 Kio | 70 % | dialogues principaux |
| `0x772000`–`0x786000` | 80 Kio | 66 % | à identifier |
| `0x0B0000`–`0x0C5000` | 84 Kio | 61 % | à identifier |
| `0x3FA000`–`0x404000` | 40 Kio | 54 % | à identifier |
| `0x3BD000`–`0x3C6000` | 36 Kio | 59 % | à identifier |
| `0x3B5000`–`0x3BC000` | 28 Kio | 67 % | aide / tutoriels |
| `0x3AC000`–`0x3B0000` | 16 Kio | 56 % | listes, noms de pièces |

> **Chiffre périmé, conservé pour mémoire.** Cette cartographie estimait 500 à
> 700 Kio. L'extraction par tables de pointeurs a tranché : **393 Kio, ~67 000
> mots** (§ 5). L'écart venait de blocs de code ARM qui franchissaient le filtre.

---

## 4. Police de caractères ❌ NON RÉSOLUE

Cinq méthodes tentées, toutes en échec :

1. **Recherche 1bpp non compressée** par heuristique d'encre → uniquement du bruit.
   L'heuristique était trop permissive : sur 8 Mio, elle produit des faux positifs
   garantis.
2. **Décompression LZ77** (2136 blocs valides) + score de ressemblance → 554
   candidats, tous des graphismes 4bpp au rendu visuel.
3. **Sondes de table sur ROM en clair** — glyphe 0 vide, glyphes 1–26 encrés,
   glyphe `0x40` = point de 1 à 8 pixels en bas, `I` plus fin que `M` et `W`.
   Une seule correspondance sur 8 Mio (`0x08A1C0`), invalidée au rendu.
4. **Sondes de table sur les 1880 blocs décompressés**, à tous les offsets
   internes alignés → **zéro correspondance**.
5. **Recherche de la table de largeurs** ([`outils/trouve-largeurs.mjs`](../outils/trouve-largeurs.mjs))
   — une chasse variable a forcément un octet de largeur par caractère, indexé par
   la valeur de table puisque c'est ce que le moteur lit pour avancer le curseur.
   Dix candidats, tous périodiques (`1 1 3 3 2 2 2 2`) : de la donnée structurée,
   pas des largeurs.

### Ce que ces échecs prouvent

Le point (`0x40`) ne se trouve jamais 64 glyphes après un glyphe vide, nulle part,
ni en clair ni décompressé. Donc :

> **L'indice du glyphe n'est pas la valeur de la table.** Il existe une
> indirection entre l'encodage du texte et la position du dessin.

C'est la signature d'une **police à chasse variable** : glyphes empaquetés sans
alignement fixe, accompagnés d'une table de largeurs. Conséquences pour le projet :

- ✅ **Favorable** : le texte français, plus long que l'anglais, sera bien moins
  contraint qu'avec une chasse fixe.
- ⚠️ **Coûteux** : ajouter `é è ê à â ç ù û î ï ô ö œ « »` demande de toucher à la
  fois aux dessins et à la table de largeurs.

### La méthode qui aboutira

La recherche statique est le mauvais outil. La bonne méthode :

1. Lancer le jeu dans **mGBA** avec une boîte de dialogue affichée.
2. Vider la VRAM (`0x06000000`–`0x06017FFF`) : le glyphe y est forcément.
3. Poser un **point d'arrêt en lecture** sur la source pour remonter à la routine
   d'affichage, et de là à l'adresse ROM de la police et de la table de largeurs.

Preuve indirecte que c'est faisable : une **version espagnole** existe
(`Medabots - Metabee (Spain)`, CRC `7E907EC8`) et un projet portugais brésilien y
a déjà ajouté des accents. Le moteur sait afficher des glyphes accentués.

---

## 5. Tables de pointeurs ✅ RÉSOLUES

Outil : [`outils/pointeurs.mjs`](../outils/pointeurs.mjs).

Un pointeur GBA est une adresse absolue de 32 bits, la ROM étant mappée en
`0x08000000`. Une suite de tels entiers, alignée sur 4 octets, est une table
candidate. **Mais ce critère seul ne suffit pas** : les pools de littéraux du code
ARM produisent exactement la même signature — 180 suites détectées, dont 159 ne
sont pas du texte.

### Ce qui tranche vraiment

Trois filtres empilés, chacun ayant écarté ce que le précédent laissait passer :

1. **La cible se décode-t-elle en texte lisible ?** Élimine la majorité du code.
   Insuffisant seul : des données binaires structurées atteignent 86-87 %.
2. **Le texte contient-il des mots anglais courants ?** Élimine les faux positifs
   restants (`0x412E60`, `0x3D1D94`).
3. **…sauf pour les listes.** Le filtre 2 rejetait à tort la table des 480
   Medaparts : « PSYCHO MISSILE | ELECTO MISSILE » ne contient aucun mot courant.
   Une seconde voie accepte les entrées séparées par `0xFE`.

Il y a **deux natures de texte** dans ce jeu — des phrases et des listes — et un
critère unique en manque forcément une.

### Résultat

| | |
|---|---|
| Tables de texte | **33** |
| Entrées | **5 933** |
| Volume | **402 705 octets** (393 Kio) |
| Estimation | ~67 000 mots |

Dialogues : `0x47A784` (323 entrées), `0x47A2C4` (303), `0x47B110` (295),
`0x47D124` (293), `0x47BDE0` (281).

Listes, qui forment le contenu des premiers lots de traduction :

| Adresse | Entrées | Contenu |
|---|---|---|
| `0x3BBB4C` | 480 | Medaparts |
| `0x3BA658` | 120 | noms de Medabots |
| `0x3C40B8` | 97 | personnages (Ikki, Erika, Karin, Koji…) |
| `0x483ED8` | 64 | objets |
| `0x3BE868` | 60 | types d'attaque |
| `0x3B74B8` | 52 | techniques |
| `0x3B6590` | 34 | médailles |
| `0x3B66EC` | 27 | compétences |

### Une régression rattrapée par la chaîne de vérification

En rendant `0x3F` par `·` au lieu de `.`, une table de script entière est passée
sous le seuil et a disparu **sans le moindre signal** : la fonction de lisibilité
listait les caractères acceptés **en dur**, au lieu de les déduire de la table.
Pire, elle utilisait déjà `·` pour marquer les codes de contrôle — collision
directe.

Corrigé : la liste se déduit de `TABLE`, et le marqueur de contrôle est passé à
`¤`. Le compte est remonté de 21 à 33 tables — dont les huit listes ci-dessus, qui
n'avaient jamais été vues.

**Leçon :** un seuil qui dépend d'une constante recopiée casse en silence dès que
la source bouge.

Le récapitulatif machine est régénéré dans `travail/pointeurs.json`.

---

## 5 bis. Extraction ✅ EN PLACE

Outil : [`outils/extraire.mjs`](../outils/extraire.mjs) → `travail/script/*.txt`.

**Chaque entrée est délimitée par le pointeur suivant, pas par un octet de fin.**
C'est sans perte et ça n'exige pas de connaître tous les codes de contrôle — ce
qui compte, puisqu'ils ne sont pas tous élucidés. Les tables étant triées, l'entrée
*i* occupe `[cible(i), cible(i+1))`.

Les octets non identifiés sortent en `{XX}` : visibles, et réversibles à la
réinsertion.

Exemple de sortie :

```
@0000 [0x449CFB]
{FB}A AMom, Dad, I'm home!{FD}Is everyone alright?{FC}{FB} {50}AWhat kind of
nonsense are you{FD}talking about now!?{FC}Shouldn't you be studying?{FF}
```

**Attention à une fausse alerte** : une extraction brute signale ~185 « octets
inconnus ». Ce ne sont pas des lettres manquantes — ce sont pour l'essentiel les
**paramètres des codes de contrôle** (l'octet qui suit `0xFB` porte le portrait ou
le locuteur). Les élucider demande la sémantique des codes, pas la table.

---

## 5 ter. Réinsertion ✅ EN PLACE, test d'identité au vert

Outil : [`outils/reinserer.mjs`](../outils/reinserer.mjs). Chaîne complète :

```
MEDABOTS_ROM="C:/chemin/vers/rom.gba" npm run verifier
```

**L'aller-retour identité passe** : extraire puis réinsérer 5 933 entrées
(679 381 octets) sans rien modifier rend une ROM **identique à l'originale au bit
près**. L'outillage ne perd rien — c'est ce qui autorise à traduire.

### Deux pièges levés en chemin

**La table doit être sans ambiguïté.** `0x3F` et `0x40` se rendaient tous deux par
`.`. À la réinsertion, rien n'aurait pu dire lequel réécrire. `0x3F` prend donc le
point médian `·` ; `…` est accepté comme raccourci pour trois `0x3F`. Le
réinsérateur **refuse de démarrer** si deux octets rendent le même caractère.

**L'extraction doit purger sa sortie.** Le premier test d'identité a échoué sur
1 910 octets : `travail/script/` contenait encore 49 fichiers d'une extraction
antérieure, produits avec l'ancienne table. `extraire.mjs` purge désormais ses
`.txt` avant d'écrire.

### Garde-fou de débordement

Sans repointage, une entrée traduite s'écrit à son adresse d'origine. Si le
français est plus long que l'anglais, elle **écrase l'entrée suivante** — et rien
dans la ROM ne le signale. Le réinsérateur calcule donc la place réelle de chaque
entrée et refuse ce qui déborde :

```
❌ 1 entrée(s) trop longue(s), NON écrite(s) :
   3B6590.txt @0001 : 46 octets pour 7 disponibles (39 de trop).
```

Vérifié en rallongeant volontairement une entrée : refus, sortie en erreur, ROM
intacte. Un garde-fou qui n'a jamais déclenché ne prouve rien.

### Ce qui reste

- La sémantique des codes `0xF8`–`0xFF` et de leurs paramètres.
- Le **repointage**, qui lèvera la contrainte de longueur.
- La **police** et les glyphes accentués.

---

## 6. Compression

2136 blocs LZ77 (format BIOS Nintendo : `0x10` + taille sur 3 octets) décompressés
avec succès. Ils contiennent des **graphismes**, pas du texte. Blocs notables :
`0x01BB30` (37 080 o), `0x023F00` (35 144 o).

---

## 7. État de l'art

- **Aucun patch français n'existe.** Demandé sur romhack.org en 2013, jamais entrepris.
- Projet **portugais brésilien** à ~25 % (v0.9 bêta), parti de la ROM espagnole,
  livrant un `.ips`. Outil réutilisable : `gba-global-repointer` (recalcul de pointeurs).
- Le jeu est un portage de **Medarot 2 Core** (Imagineer, Japon). La localisation
  anglaise est connue pour être assez libre — utile à recouper pour les termes clés.
