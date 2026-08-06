# CLAUDE.md — Medabots FR

Traduction française de **Medabots: Metabee Version** (Game Boy Advance, Europe).

> ⚠️ Ce projet est **hors du workspace `C:\Users\YHN\Documents\Git`**. Les règles
> de ce workspace (Next.js, Supabase, Vercel, design system EDL) **ne s'appliquent
> pas ici**. C'est du reverse engineering sur binaire ARM, pas du développement web.

---

## Les règles qui ne se discutent pas

**La ROM n'entre jamais dans le dépôt.** `.gitignore` exclut `*.gba`. On ne
versionne que des outils, du texte et un patch. Un dépôt qui contient la ROM est
une redistribution d'œuvre sous droits — c'est non.

**On livre un patch, jamais une ROM modifiée.** Format BPS (ou IPS). L'utilisateur
applique le patch sur son propre fichier. Le patch se vérifie contre le SHA1 de
référence : `CD3D674E88F40A0707B150C4293588A659001D29`.

**Tout est reproductible depuis la ROM + les outils.** Le dossier `travail/` est
ignoré par git : rien de ce qu'il contient ne doit être irremplaçable. Si un
fichier de `travail/` ne peut pas être régénéré par un script de `outils/`, c'est
un défaut à corriger.

**On mesure, on ne suppose pas.** Ce projet a déjà coûté quatre méthodes en échec
sur la recherche de police parce qu'une heuristique plausible n'est pas une preuve.
Toute affirmation sur le format va dans `docs/format.md` avec ce qui l'établit, et
ce qui n'est pas établi est marqué comme tel.

---

## Périmètre : par étapes, jouable vite

Décision du 06/08/2026. Le script fait de l'ordre de **100 000 mots** — traduire
d'un bloc, c'est plusieurs mois sans rien de jouable, et un abandon en route ne
laisse rien. Donc on livre par lots, chacun étant un patch utilisable :

1. Interface, menus, options
2. Objets, pièces de Medabots, médailles
3. Textes de combat
4. Histoire principale
5. PNJ et secondaire

Les autres axes (graphismes, audio, confort de jeu) viennent **après** la
traduction : ils touchent les mêmes zones et les faire d'abord créerait du travail
à refaire.

---

## Structure

```
outils/     scripts Node d'analyse, extraction, réinsertion — versionnés
docs/       format.md = tout ce qu'on sait du binaire, avec les preuves
travail/    sorties régénérables (dumps, PNG, textes extraits) — ignoré par git
site/       le site public (Vite + React + Tailwind 4)
```

---

## Le site — https://medabots-fr.vercel.app

**Le site ne sert jamais la ROM, et ce point n'est pas négociable.** Posséder le
jeu autorise à en avoir une copie, pas à la publier. L'utilisateur dépose son
propre fichier ; il est vérifié par SHA-1, rangé en IndexedDB **sur son appareil**,
et jamais envoyé. Le patch lui sera appliqué en mémoire avant de passer la ROM à
l'émulateur par une URL `blob:`.

**Vite, pas Next.js.** Tout est côté client : il n'y a rien à rendre sur un
serveur, et un serveur qui ne sert rien est un serveur de trop. Déploiement
statique sur Vercel, projet `medabots-fr`.

**IndexedDB, pas localStorage** : une ROM GBA fait 8 Mio de binaire, localStorage
ne stocke que du texte et plafonne à quelques mégaoctets.

**L'avancement affiché doit rester honnête.** Un pourcentage inventé ne trompe que
celui qui le lit. Les chiffres vivent dans `site/src/donnees/avancement.ts`.

Vérification : `cd site && npm run verifier` (typecheck + build).

Limite connue : le moteur d'émulation vient d'un CDN externe, donc le lecteur ne
fonctionne pas hors connexion. Pour un vrai hors-ligne, il faudra héberger le
dossier `data/` d'EmulatorJS et le mettre en cache.

Les outils sont en **Node pur**, sans dépendance : lisibles, reproductibles,
scriptables. Pas d'éditeur hexadécimal manuel — un clic non reproductible n'est
pas un livrable.

---

## Ce qui est acquis

- **Table de caractères résolue** : `0x01–0x1A` = A–Z, `0x1B–0x34` = a–z,
  `0x35–0x3E` = chiffres, ponctuation en `0x3F+`. Vérifiée par décodage réel.
- **Le texte n'est pas compressé.** Aucune couche à casser pour les dialogues.
- **La police est à chasse variable** et n'est pas indexée par la valeur de table.
  Elle se localisera par dump VRAM sous mGBA, pas par recherche statique.

Détail complet et preuves : `docs/format.md`.

---

## Vérification

Aucune chaîne de vérification automatisée à ce stade. À mettre en place dès que
l'extraction/réinsertion existera : un aller-retour extraction → réinsertion sans
modification doit rendre une ROM **identique au bit près** à l'originale. Tant que
ce test ne passe pas, aucune traduction ne peut être insérée en confiance.
