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

```
0x45        :
0x4B        ♥
0x4C        £
0x4D        &
0x4E        %
```

`0x45` = `:` a été établi sur trois contextes (« Key: A Class », « Key: B Class »,
« It says: »). `0x4B` à `0x4E` ont été **lus directement dans la police** une fois
celle-ci trouvée (§ 4).

**Le jeu de caractères s'arrête à `0x4E` : 79 signes.** Les codes `0x4F` à `0xF7`
sont libres — c'est là que se logeront les accents français.

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

| Octet | Rôle |
|---|---|
| `0xF7` | vitesse d'affichage — suivi d'un paramètre |
| `0xF8` | **italique** — le jeu embarque deux polices (§ 4) |
| `0xF9` | insertion d'une variable depuis la RAM |
| `0xFA` | à établir |
| `0xFB` | portrait / locuteur — suivi de trois octets |
| `0xFC` | nouvelle boîte de dialogue |
| `0xFD` | saut de ligne |
| `0xFE` | fin d'entrée dans une liste |
| `0xFF` | fin de message — suivi d'un paramètre |

`0xFC`, `0xFD`, `0xFE` et `0xFF` avaient été déduits du script ; `0xF7`, `0xF8` et
`0xF9` viennent des [notes de Kimbles sur Medarot 2 Core](https://medarot.meowcorp.us/wiki/User:Kimbles/Medarot_2_Core_Hacking_Notes),
dont ce jeu est le portage. `0xF8` = italique explique ce qui encadre les
onomatopées des scènes cinématiques.

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

## 4. Police de caractères ✅ RÉSOLUE

Trouvée le 06/08/2026 **en remontant par le code**, après sept tentatives ratées
sur les données. Vérifiée visuellement : les 79 glyphes se lisent.

| | Adresse | Taille |
|---|---|---|
| Police romaine | `0x4BFC64` → `0x4C1024` | 79 glyphes × 64 o |
| Police italique | `0x4C59A4` → `0x4C6D64` | idem |
| Table de chasse romaine | `0x3B4E08` → `0x3B5008` | 256 × 2 o |
| Table de chasse italique | `0x3B5008` → `0x3B5208` | 256 × 2 o |

Deux polices, romaine et italique — ce qui explique le code de contrôle `0xF8`.

### Format

**4 bpp, 8×16 pixels, 64 octets par glyphe**, 4 octets par ligne, quartet bas =
pixel de gauche. Deux tuiles GBA empilées. Ligne de base en 11.

### Table de chasse : deux octets par caractère

```
0x040106  LSL r1,r2,#1      ; caractère × 2
0x040108  ADD r0,r1,r0      ; + 0x3B4E08
0x04010A  LDRB r4,[r0,#0]   ; octet 0 = largeur
```

Octet 0 = largeur : `M`=7, `W`=8, `I`=4, `i` et `l` et l'apostrophe=2,
la virgule=3, l'espace=4.

Octet 1 = classe verticale, vérifiée sur les 78 glyphes sans exception :
`0` = hampes, `1` = normal, `2` = virgule, `3` = jambages.

### Routines du moteur de texte

| Adresse | Rôle |
|---|---|
| `0x040040` | mesure de ligne (retour à la ligne automatique) |
| `0x0400EA`–`0x0401CE` | cœur : `LSL #6` puis `CpuSet` vers `0x02020000`, décalage de largeur×4 bits — c'est la chasse variable |
| `0x040B60` | efface la zone de texte, 52 tuiles en `0x06000280` |
| `0x040DB8` | mesure + alignement, émet un objet OAM par caractère |

Le moteur occupe `0x040000`–`0x041200`. Le code de la ROM tient dans
`0x000000`–`0x07F000` ; au-delà, tout est donnée.

### Pourquoi sept tentatives ont échoué

Trois erreurs, chacune suffisante à elle seule :

1. **Le fond n'est pas la couleur 0 mais la couleur 1.** Un glyphe vide est
   rempli de `0x11`, pas de `0x00`. La sonde « glyphe 0 entièrement vide » ne
   pouvait jamais se déclencher.
2. **La police est anticrénelée**, avec une rampe d'encre jusqu'à l'index 15.
   Aucune heuristique 1 bpp ne pouvait la reconnaître.
3. **La table de chasse fait deux octets par caractère**, pas un. La recherche de
   largeurs cherchait un pas de 1 et ne pouvait rien trouver.

Et l'hypothèse tirée de ces échecs — « l'indice du glyphe n'est pas la valeur de
table, donc il y a indirection » — **était fausse**. L'indice EST la valeur de
table.

C'est la leçon la plus chère du projet : un raisonnement juste appliqué à des
mesures fausses produit une conclusion fausse, et la conclusion avait l'air
solide parce qu'elle expliquait tous les échecs. Seul le désassemblage du code a
tranché.

### Ce que ça ouvre pour les accents

- Les codes `0x4F`–`0xF7` sont **libres dans les deux tables de chasse** :
  177 emplacements.
- Le dessin doit être relogé, l'espace voisin portant des graphismes. L'adresse
  de base ne vit que dans des mots de pool, faciles à réécrire : `0x084BFC64` en
  9 mots, `0x084C59A4` en 6. Les 47 100 o libres en `0x7F4464` valent
  735 glyphes.
- Place verticale disponible : lignes 0–2 au-dessus des capitales, 3–5 au-dessus
  des bas-de-casse. `é ê è à â î ô û` tiennent sans toucher au moteur ;
  `Ç` et `ç` prennent la classe verticale 3.

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
(402 705 octets) sans rien modifier rend une ROM **identique à l'originale au bit
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
