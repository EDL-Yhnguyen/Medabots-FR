# Reprise — Medabots FR

Dernière séance : 2026-08-06

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Le patch français existe et fonctionne.** `patch/medabots-fr.bps` traduit
**596 entrées** : 64 objets, 34 médailles, 60 types d'attaque, 52 techniques,
27 familles de compétences et leurs 53 conseils, 33 messages d'objet, 6 états de
pièce, les 122 messages de Robattle, la boutique et les sauvegardes, les 12 scènes cinématiques la Medaroad Race et les 96 répliques d’ouverture de Robattle. Vérifié de bout en bout dans un
navigateur — ROM déposée, SHA-1 contrôlé, patch appliqué en mémoire, jeu qui
démarre.

**Le lot « textes de combat » est terminé.** Tout ce qui s'affiche pendant un
Robattle est en français.

**Toute la chaîne est outillée et vérifiable d'une commande :**

```
MEDABOTS_ROM="C:/chemin/vers/rom.gba" npm run verifier
```

Elle enchaîne pointeurs → extraction → **test d'identité** → ROM traduite. Le test
d'identité est celui qui compte : réinsérer sans rien changer rend une ROM
identique au bit près.

**Chiffres mesurés** : 33 tables de texte, 5 933 entrées, **393 Kio, ~67 000 mots**.
Le repointage reloge dans les 48 Kio libres de fin de ROM ce qui ne tient pas dans
la place d'origine — 388 entrées à ce jour, il reste 33,9 Kio.

**Deux limites connues, ni l'une ni l'autre bloquante :**

- **La police reste introuvable** après cinq méthodes statiques. L'indice du glyphe
  n'est pas la valeur de table : chasse variable, à localiser par dump VRAM sous
  mGBA (installé).
- **Les accents ne s'affichent donc pas encore** : environ 700 remplacements signalés à
  l'insertion. Les fichiers de `traduction/` gardent le français correct et
  deviendront justes sans réécriture le jour où la police portera les glyphes.

## La prochaine action

**Vérifier le patch en jeu, à l'œil.** Le jeu démarre et les octets sont bons, mais
personne n'a encore ouvert l'inventaire pour voir « Plan de la ville » à l'écran.
C'est la seule vérification qui manque.

Ensuite, les **dialogues** (`0x47xxxx`, ~2 800 entrées) : c'est l'essentiel du
volume et tout ce qui reste de vraiment visible. Les attaquer par petites tables
complètes, comme `0x48521C` et `0x48698C` — une table entière livrée d'un bloc vaut
mieux qu'un chapitre à moitié français.

### Les 480 Medaparts : à trancher avant de s'y mettre

Analyse faite : **480 entrées réelles, aucun emplacement de débogage, mais 347 mots
finaux distincts** — les 22 plus fréquents ne couvrent que 25 % du total. Il n'y a
donc **aucune régularité exploitable** : c'est 480 décisions individuelles.

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

## Décidé

- **Traduction par lots**, chacun livré comme patch utilisable.
- **Noms de personnages et de Medabots conservés** (06/08) — comme la VF de l'anime.
  Les codes de pièces (`0x3BCFEC` : `BAT-11`, `ANG-11`) non plus, ce sont des
  identifiants.
- **Projet hors du workspace `Documents\Git`**, réservé aux applications EDL.
- **On part de la ROM anglaise européenne**, pas de l'espagnole du projet brésilien :
  ce serait une traduction de traduction.
- **Le site ne sert jamais la ROM.** L'utilisateur apporte son fichier ; tout se
  passe dans son navigateur. Vite plutôt que Next.js : rien à rendre sur un serveur.
- **Les accents s'écrivent quand même.** Appauvrir le vocabulaire pour contourner
  une limite de l'outillage laisserait cette limite décider du texte français.

## À ne pas refaire

- **`curseur.pos += litVarint(...)`.** En JavaScript, `a += f()` lit `a` AVANT
  d'évaluer `f()`. Le curseur recule d'un octet et le décodeur lit une action
  fantôme. A fait croire une heure que le patch BPS était corrompu — il était juste.
- **Borner une entrée de texte par un plafond arbitraire.** La dernière entrée d'une
  table n'a pas de suivante ; lire 2048 octets « au cas où » traverse la table de
  pointeurs voisine, et la réécrire restaure les pointeurs d'origine. Ça défait le
  repointage **sans que le test d'identité voie quoi que ce soit**, puisque ces
  octets sont justement identiques.
- **Chercher la police**, cinq fois pour rien : heuristique d'encre (×2), sondes de
  table en clair puis sur 1880 blocs LZ77 décompressés, table de largeurs. Les dix
  candidats de largeurs sont périodiques (`1 1 3 3 2 2 2 2`) — de la donnée
  structurée. Passer par l'émulateur.
- **Employer `+` dans une traduction** : la police n'en a pas le glyphe (ni `&`, `%`,
  `;`, `*`, `=`). « Gain puissance », pas « Puissance + ».
- **Oublier l'octet de paramètre après `0xFF`.** L'écrire `{FF}{00}` et non `{FF} ` :
  une espace en fin de ligne se fait supprimer par n'importe quel éditeur.
- **`winget install mGBA.mGBA`** : ce paquet n'existe pas, c'est `JeffreyPfau.mGBA`.
- **Lire la version GBA en `0xBD`** : elle est en `0xBC`, le checksum est en `0xBD`.
- **Typer `Uint8Array` sans son paramètre de tampon** dans le site : depuis
  TypeScript 5.7 il est générique, et le build casse.
