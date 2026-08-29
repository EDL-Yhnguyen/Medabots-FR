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

### Le compte et la partie — en service depuis le 29/08/2026

La sauvegarde de cartouche suit le compte ; **la ROM ne quitte jamais
l'appareil**. Schéma `medabots` du projet Supabase personnel
`exovzmoygupllcdjbwtf`, partagé avec Mamakilo (`public`) et MamaLingo
(`mamalingo`) : `auth.users` est commun, donc **le compte est le même** dans
toute la suite.

Trois choses qu'on ne redécouvre pas :

- **Créer le schéma ne suffit pas : il faut l'EXPOSER à PostgREST.** Sans ça,
  toute requête répond `PGRST106 · Invalid schema`, et le message ne dit pas
  qu'il s'agit d'un réglage de projet. La liste est dans les réglages d'API, ou
  par l'API Management : `PATCH /v1/projects/<ref>/postgrest`, champ `db_schema`.
  **La renvoyer entière** — elle vaut remplacement, pas ajout.
- **`grant usage on schema` est indispensable en plus de RLS.** RLS filtre les
  lignes, elle n'ouvre pas le schéma. Sans le `grant`, tout répond
  `permission denied for schema medabots` — et un rôle `anon` qui reçoit cette
  erreur est le comportement voulu : seuls les comptes connectés écrivent.
- **Le projet Vercel n'est pas relié à GitHub.** Pousser sur `main` ne déploie
  rien ; le site est resté sur la version du 06/08 pendant que trois semaines de
  travail s'accumulaient dans le dépôt, sans qu'un seul message le signale. Le
  déploiement se fait à la main, depuis `site/` : `vercel deploy --prod`.

Éprouvé le 29/08 par deux bancs sur de vrais comptes — écriture, relecture,
cloisonnement entre deux comptes, refus d'écrire pour autrui, déclencheur
d'horodatage, bornes de taille, `oublie_ma_sauvegarde`, et l'upsert
`ON CONFLICT` que le code emploie réellement. Puis dans le navigateur, sur le
site en production : compte créé, session établie, lecture du schéma en `200`.

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
- **La police est à chasse variable**, trouvée à `0x4BFC64` par désassemblage
  après sept échecs de recherche statique.
- **Les accents français s'affichent, et c'est vérifié à l'écran** (29/08/2026,
  mGBA 0.10.5). La cartouche est européenne : les 45 glyphes accentués dormaient
  dans la police, juste après le 79e. Seules leurs largeurs manquaient, à zéro
  dans les deux tables de chasse — 90 octets écrits ont suffi.
  Les largeurs sont justes au pixel : sur un banc à deux lignes, `aeiouAE` et
  `àéîôûÀÉ` finissent au même endroit, à l'exception attendue du `î`, dont le
  glyphe occupe réellement deux pixels de plus que le `i`.

Détail complet et preuves : `docs/format.md`.

---

## Vérification

```
MEDABOTS_ROM="C:/chemin/vers/Medabots - Metabee (Europe).gba" npm run verifier
```

Enchaîne recherche de pointeurs → extraction → réinsertion → **test d'identité**.

**Le test d'identité est le seul qui compte vraiment** : extraire puis réinsérer
sans rien modifier doit rendre une ROM identique au bit près. S'il échoue,
l'outillage perd de l'information quelque part, et insérer une traduction
reviendrait à découvrir les dégâts trois cents dialogues plus tard.

Il est au vert sur 5 933 entrées / 679 381 octets.

**Le lancer après toute modification d'un outil.** Il a déjà rattrapé une
régression invisible : changer le rendu de `0x3F` faisait disparaître une table de
script entière, sans aucun message.
