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

```
0x00        espace
0x01–0x1A   A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
0x1B–0x34   a b c d e f g h i j k l m n o p q r s t u v w x y z
0x35–0x3E   0 1 2 3 4 5 6 7 8 9
0x3F        ?
0x40        .
0x41        ,
0x42        '  (apostrophe)
0x44        /
0x47        !
0x49        (
0x4A        )
```

`0x43`, `0x45`, `0x46`, `0x48`, et la plage `0x4B`–`0xF7` restent à identifier.
C'est probablement là que se logeront les caractères accentués français.

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

**Estimation du script réel : 500 à 700 Kio**, soit de l'ordre de 100 000 mots.
À confirmer par extraction via tables de pointeurs — non encore localisées.

---

## 4. Police de caractères ❌ NON RÉSOLUE

Quatre méthodes tentées, toutes en échec :

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

## 5. Tables de pointeurs ❌ NON RÉSOLUES

Non recherchées à ce stade. Nécessaires avant toute réinsertion : le texte français
n'ayant pas la même longueur que l'anglais, les dialogues devront être relogés et
tous les pointeurs recalculés.

Les pointeurs GBA sont des adresses absolues de 32 bits commençant par `0x08` ou
`0x09` (la ROM est mappée en `0x08000000`). Une table de pointeurs se repère comme
une suite d'entiers 32 bits croissants dont l'octet de poids fort vaut `0x08`.

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
