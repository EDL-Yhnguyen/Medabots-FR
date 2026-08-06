# Reprise — Medabots FR

Dernière séance : 2026-08-06 · premier commit du projet

## Où on en est

Séance de cadrage et d'analyse. La ROM est identifiée et saine
(`Medabots - Metabee (Europe)`, SHA1 `CD3D674E...`, en-tête conforme). **La table
de caractères est résolue et vérifiée** par décodage de vrai texte : le texte des
dialogues n'est pas compressé, ce qui retire le plus gros risque du projet.

La **police reste introuvable** après quatre méthodes statiques. L'échec est
concluant : le glyphe du point n'est jamais 64 glyphes après un glyphe vide, donc
l'indice du glyphe n'est pas la valeur de table — police à chasse variable.

Rien n'est encore extrait, rien n'est traduit, aucun patch n'existe.

## La prochaine action

Installer mGBA (`winget install mGBA.mGBA`), lancer le jeu jusqu'à une boîte de
dialogue, vider la VRAM `0x06000000`–`0x06017FFF` et y retrouver le glyphe, puis
poser un point d'arrêt en lecture pour remonter à l'adresse ROM de la police et de
sa table de largeurs.

## Décidé cette séance

- **Périmètre : traduction par lots**, chacun livré comme patch utilisable
  (interface → objets → combat → histoire → secondaire). Le script fait ~100 000
  mots ; un livrable unique serait plusieurs mois sans rien de jouable.
- **Projet hors du workspace `Documents\Git`**, qui est réservé aux applications
  EDL. Les règles de son CLAUDE.md ne s'appliquent pas ici.
- **On part de la ROM anglaise européenne**, celle que Yann possède — pas de la
  ROM espagnole du projet brésilien. Traduire depuis l'espagnol serait une
  traduction de traduction.
- **Patch uniquement, ROM jamais versionnée ni redistribuée.**

## À ne pas refaire

- **Chercher la police par heuristique d'encre sur la ROM en clair.** Sur 8 Mio,
  n'importe quelle heuristique permissive produit des faux positifs ; les deux
  essais n'ont rendu que du bruit.
- **Chercher la police par sondes de table**, en clair ou décompressé. Zéro
  correspondance sur les 1880 blocs LZ77 décompressés à tous les offsets : la
  police n'est pas indexée par la valeur de table. Inutile d'y revenir.
- **Lire la version GBA en `0xBD`.** Elle est en `0xBC`, le checksum est en `0xBD`.
  Les inverser fait conclure à tort que la ROM est corrompue.
