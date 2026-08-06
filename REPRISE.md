# Reprise — Medabots FR

Dernière séance : 2026-08-06 · dépôt et site en ligne

- Dépôt : https://github.com/EDL-Yhnguyen/Medabots-FR (public)
- Site : https://medabots-fr.vercel.app

## Où on en est

**L'aller-retour identité PASSE.** Extraire puis réinsérer sans rien modifier rend
une ROM identique à l'originale au bit près. C'est le jalon qui autorise à traduire :
l'outillage ne perd rien. Chaîne exécutable :

```
MEDABOTS_ROM="C:/chemin/vers/rom.gba" npm run verifier
```

**Tables de pointeurs résolues et script extrait** : **33 tables, 5 933 entrées,
663 Kio, ~113 000 mots**. `outils/extraire.mjs` sort le tout en fichiers texte
éditables dans `travail/script/`, chaque entrée délimitée par le pointeur suivant.
147 fausses pistes (pools de littéraux ARM) écartées.

Le contenu des premiers lots est déjà identifié : 120 noms de Medabots
(`0x3BA658`), 97 personnages (`0x3C40B8`), 64 objets (`0x483ED8`), 60 types
d'attaque (`0x3BE868`), 34 médailles (`0x3B6590`), 480 Medaparts (`0x3BBB4C`).

**La table de caractères a été corrigée** : `0x3F` n'est pas `?` mais le point de
suspension, et `0x46` est le point d'interrogation. `0x43` = `-`, `0x48` = `"`.
Elle vit maintenant dans `outils/table-caracteres.mjs`, importée par tous les
outils — elle était recopiée dans trois scripts.


**Analyse.** La ROM est identifiée et saine (`Medabots - Metabee (Europe)`, SHA1
`CD3D674E...`). **La table de caractères est résolue et vérifiée** par décodage de
vrai texte, et **le texte des dialogues n'est pas compressé** — le plus gros risque
du projet est écarté.

La **police reste introuvable** après quatre méthodes statiques. L'échec est
concluant : le glyphe du point n'est jamais 64 glyphes après un glyphe vide, donc
l'indice du glyphe n'est pas la valeur de table — police à chasse variable.

**Site.** En ligne et vérifié sur mobile. Vitrine, avancement, documentation, et
lecteur GBA intégré (EmulatorJS, cœur mGBA). Conception : le site n'héberge pas la
ROM — l'utilisateur dépose son fichier, vérifié par SHA-1, gardé en IndexedDB sur
l'appareil, jamais envoyé. L'application de patch IPS/BPS en mémoire est écrite et
compile, mais **n'a jamais été exercée sur un vrai patch** : il n'en existe aucun.

Rien n'est extrait, rien n'est traduit. Tous les compteurs d'avancement sont à zéro
et le site l'affiche.

## La prochaine action

**Traduire le lot 1** en commençant par les listes courtes et sans risque de
longueur : `0x3B6590` (34 médailles), `0x3B66EC` (27 compétences), `0x3BE868`
(60 types d'attaque). Ces entrées tiennent dans la place existante ou presque, ce
qui permet de livrer un premier patch **sans avoir à repointer**.

Attention : tant que le repointage n'existe pas, `reinserer.mjs` écrit à l'adresse
d'origine et **écraserait l'entrée suivante** si le français était plus long. Il
faut lui ajouter un garde-fou qui refuse une entrée trop longue, avant toute
traduction — sinon la corruption sera silencieuse.

Ensuite : installer mGBA (`winget install mGBA.mGBA`), lancer le jeu
jusqu'à une boîte de dialogue, vider la VRAM `0x06000000`–`0x06017FFF` pour y
retrouver le glyphe, puis poser un point d'arrêt en lecture afin de remonter à
l'adresse ROM de la police et de sa table de largeurs.

## Décidé cette séance

- **Périmètre : traduction par lots**, chacun livré comme patch utilisable
  (interface → objets → combat → histoire → secondaire). ~100 000 mots au total ;
  un livrable unique serait plusieurs mois sans rien de jouable.
- **Projet hors du workspace `Documents\Git`**, réservé aux applications EDL.
- **On part de la ROM anglaise européenne**, pas de la ROM espagnole du projet
  brésilien : traduire depuis l'espagnol serait une traduction de traduction.
- **Dépôt public**, sans aucune ROM. Patch uniquement.
- **Le site ne sert jamais la ROM.** Posséder le jeu n'autorise pas à le publier.
  L'utilisateur apporte son fichier ; tout se passe dans son navigateur.
- **Vite plutôt que Next.js** pour le site : tout est côté client, il n'y a rien à
  rendre sur un serveur.

## À ne pas refaire

- **Chercher la police par heuristique d'encre** sur la ROM en clair. Sur 8 Mio,
  toute heuristique permissive produit des faux positifs ; deux essais, du bruit.
- **Chercher la police par sondes de table**, en clair ou décompressé. Zéro
  correspondance sur 1880 blocs LZ77 décompressés à tous les offsets. Inutile d'y
  revenir : la police n'est pas indexée par la valeur de table.
- **Lire la version GBA en `0xBD`.** Elle est en `0xBC`, le checksum est en `0xBD`.
  Les inverser fait conclure à tort que la ROM est corrompue.
- **Typer `Uint8Array` sans son paramètre de tampon** dans le site : depuis
  TypeScript 5.7 il est générique, et `Uint8Array<ArrayBufferLike>` n'est pas
  assignable à `Uint8Array<ArrayBuffer>`. Le build casse.
