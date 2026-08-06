# Medabots FR

Traduction française de **Medabots: Metabee Version** (Game Boy Advance, Europe) —
portage de *Medarot 2 Core* d'Imagineer. Aucune traduction française n'a jamais
existé pour ce jeu.

**État : cadrage terminé, rien de traduit.** Voir [`REPRISE.md`](REPRISE.md).

## Ce que ce dépôt contient — et ne contient pas

Ce dépôt contient des **outils**, du **texte** et à terme un **patch**.

Il ne contient **pas** la ROM, et n'en contiendra jamais. Le jeu est une œuvre sous
droits ; le patch s'applique sur un fichier que vous possédez déjà.

## ROM de référence

Le patch ne vaudra que pour cette version exacte :

| | |
|---|---|
| Nom | `Medabots - Metabee (Europe)` |
| Taille | 8 388 608 octets |
| SHA1 | `CD3D674E88F40A0707B150C4293588A659001D29` |
| CRC32 | `50927F3E` |

Vérifier votre fichier avant d'appliquer le patch :

```bash
node outils/entete.mjs "chemin/vers/votre.gba"
```

## Outils

Node 18+, aucune dépendance externe.

| Script | Rôle |
|---|---|
| `outils/entete.mjs` | identité, en-tête GBA, type de sauvegarde, espace libre |
| `outils/table.mjs` | recherche relative de la table de caractères, blocs LZ77 |
| `outils/dump.mjs` | décodage du texte, cartographie des banques |
| `outils/trouve-police.mjs` | recherche de police par sondes de table (sans résultat — voir `docs/format.md`) |
| `outils/trouve-police-lz.mjs` | idem sur blocs décompressés (sans résultat) |

Les deux derniers sont conservés **parce qu'ils ont échoué** : ils documentent les
pistes déjà éliminées, pour ne pas les refaire.

## Documentation technique

[`docs/format.md`](docs/format.md) — table de caractères, codes de contrôle,
banques de texte, compression, et l'état exact de ce qui reste à résoudre.
