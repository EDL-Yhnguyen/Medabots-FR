-- ═══════════════════════════════════════════════════════════════════════
--  Medabots FR — schéma Postgres
--
--  Ce fichier est idempotent : on peut le rejouer sans rien casser.
--
--  CE QUI N'EST PAS ICI, ET N'Y SERA JAMAIS : la ROM.
--
--  C'est la règle qui tient tout le projet. Posséder le jeu autorise à en
--  avoir une copie, pas à la publier ; une ROM déposée sur un serveur, fût-il
--  le sien, est une redistribution d'œuvre sous droits. Elle reste en
--  IndexedDB sur l'appareil. Sur un appareil neuf, on redépose son fichier
--  une fois — et on retrouve sa partie.
--
--  Ce qui voyage est la sauvegarde de cartouche : quelques kilo-octets
--  produits par la personne qui joue, et qui lui appartiennent.
--
--  Tout est cloisonné dans le schéma `medabots`. Le projet Supabase est
--  partagé avec les autres applications personnelles — Mamakilo dans
--  `public`, MamaLingo dans `mamalingo` — parce que le plan gratuit n'en
--  permet pas un de plus. Conséquence voulue : `auth.users` est commun, donc
--  le compte est LE MÊME dans toute la suite. On se connecte une fois.
-- ═══════════════════════════════════════════════════════════════════════

create schema if not exists medabots;

-- ── La sauvegarde ──────────────────────────────────────────────────────
--
--  UNE LIGNE PAR COMPTE, parce que la cartouche n'a qu'une sauvegarde. Le
--  jeu écrit toujours au même endroit ; empiler des versions ici inventerait
--  une notion que le jeu n'a pas.
--
--  `donnees` est du TEXTE en base64, pas du `bytea`. PostgREST rend un
--  `bytea` dans un encodage hexadécimal maison (`\x…`) qu'il faut décoder à
--  la main des deux côtés ; la base64 traverse la couche REST telle quelle,
--  se lit dans un tableau d'administration, et coûte 33 % sur des fichiers
--  de 8 Kio. Le format explicite vaut mieux que l'économie.
--
--  `precedente` garde l'avant-dernière sauvegarde. Un seul coup en arrière,
--  et il suffit : le cas à rattraper est l'écrasement accidentel par un
--  second appareil, qui se voit tout de suite. Un historique complet
--  demanderait une table, une purge et une interface — pour un incident qui
--  se répare en un clic.
create table if not exists medabots.sauvegardes (
  compte_id uuid primary key references auth.users (id) on delete cascade,

  donnees text not null,
  octets integer not null check (octets > 0 and octets <= 262144),
  -- Empreinte SHA-256 du contenu décodé. Comparer deux empreintes évite de
  -- réécrire une sauvegarde identique à chaque fin de partie.
  empreinte text not null,

  precedente text,
  precedente_octets integer check (precedente_octets is null or precedente_octets > 0),
  precedente_maj timestamptz,

  -- Horloge du client au moment où la partie a été jouée. Sert à dire
  -- « ta partie ici est plus ancienne que celle du serveur », donc à
  -- demander plutôt qu'à écraser en silence.
  jouee_le timestamptz not null default now(),
  maj timestamptz not null default now()
);

comment on table medabots.sauvegardes is
  'Sauvegarde de cartouche, une par compte. Ne contient jamais de ROM.';

-- ── Horodatage ─────────────────────────────────────────────────────────
create or replace function medabots.touche_maj()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.maj := now();
  return new;
end;
$$;

drop trigger if exists sauvegardes_maj on medabots.sauvegardes;
create trigger sauvegardes_maj
  before update on medabots.sauvegardes
  for each row execute function medabots.touche_maj();

-- ── Cloisonnement ──────────────────────────────────────────────────────
--
--  Une sauvegarde est une donnée personnelle : personne d'autre que son
--  auteur ne la lit ni ne l'écrit. Les quatre politiques sont explicites —
--  une politique manquante sur une table protégée n'échoue pas, elle refuse
--  tout en silence, ce qui se diagnostique très mal.
alter table medabots.sauvegardes enable row level security;

drop policy if exists sauvegardes_lecture on medabots.sauvegardes;
create policy sauvegardes_lecture on medabots.sauvegardes
  for select using ((select auth.uid()) = compte_id);

drop policy if exists sauvegardes_creation on medabots.sauvegardes;
create policy sauvegardes_creation on medabots.sauvegardes
  for insert with check ((select auth.uid()) = compte_id);

drop policy if exists sauvegardes_maj_ligne on medabots.sauvegardes;
create policy sauvegardes_maj_ligne on medabots.sauvegardes
  for update using ((select auth.uid()) = compte_id)
  with check ((select auth.uid()) = compte_id);

drop policy if exists sauvegardes_suppression on medabots.sauvegardes;
create policy sauvegardes_suppression on medabots.sauvegardes
  for delete using ((select auth.uid()) = compte_id);

-- ── Accès du rôle applicatif ───────────────────────────────────────────
--
--  RLS filtre les LIGNES, elle n'ouvre pas le schéma. Sans ces droits, tout
--  répond « permission denied for schema medabots » — une erreur qu'on met
--  du temps à rattacher à sa cause quand on vient de poser des politiques.
grant usage on schema medabots to authenticated;
grant select, insert, update, delete on medabots.sauvegardes to authenticated;

-- ── Effacer sa partie ──────────────────────────────────────────────────
--
--  On peut partir, et partir efface tout : `on delete cascade` s'en charge
--  quand le compte disparaît. Cette fonction répond à un besoin différent —
--  effacer la seule sauvegarde en gardant le compte, pour recommencer une
--  partie de zéro.
create or replace function medabots.oublie_ma_sauvegarde()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from medabots.sauvegardes where compte_id = (select auth.uid());
$$;

grant execute on function medabots.oublie_ma_sauvegarde() to authenticated;
