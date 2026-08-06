# Reprise — Medabots FR

Dernière séance : 2026-08-06

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**Le patch français existe et fonctionne.** `patch/medabots-fr.bps` (12 234 octets)
traduit **408 entrées** : 64 objets, 34 médailles, 60 types d'attaque, 52
techniques, 27 familles de compétences et leurs 27 conseils, 33 messages d'objet,
116 messages de Robattle et 6 états de pièce.
Vérifié de bout en bout dans un navigateur — ROM déposée, SHA-1 contrôlé, patch
appliqué en mémoire, jeu qui démarre.

**Toute la chaîne est outillée et vérifiable d'une commande :**

```
MEDABOTS_ROM="C:/chemin/vers/rom.gba" npm run verifier
```

Elle enchaîne pointeurs → extraction → **test d'identité** → ROM traduite. Le test
d'identité est celui qui compte : réinsérer sans rien changer rend une ROM
identique au bit près.

**Chiffres mesurés** : 33 tables de texte, 5 933 entrées, **393 Kio, ~67 000 mots**.
Le repointage reloge dans les 48 Kio libres de fin de ROM ce qui ne tient pas dans
la place d'origine — 247 entrées à ce jour, il reste 41,3 Kio.

**Deux limites connues, ni l'une ni l'autre bloquante :**

- **La police reste introuvable** après cinq méthodes statiques. L'indice du glyphe
  n'est pas la valeur de table : chasse variable, à localiser par dump VRAM sous
  mGBA (installé).
- **Les accents ne s'affichent donc pas encore** : 421 remplacements signalés à
  l'insertion. Les fichiers de `traduction/` gardent le français correct et
  deviendront justes sans réécriture le jour où la police portera les glyphes.

## La prochaine action

**Vérifier le patch en jeu, à l'œil.** Le jeu démarre et les octets sont bons, mais
personne n'a encore ouvert l'inventaire pour voir « Plan de la ville » à l'écran.
C'est la seule vérification qui manque.

Ensuite, par ordre de valeur : les **60 messages de combat restants**
(`0x3C6744`, entrées @0116 à @0175), puis les 480 Medaparts (`0x3BBB4C`).

Ne pas toucher : `0x3C4B90` @0006–@0127 (`Data06`…`Data7F`, emplacements de
débogage jamais affichés) ni `0x3BCFEC` (codes de pièces `BAT-11`, `ANG-11`).

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
