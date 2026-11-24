-- =============================================================================
-- Sama Dahira : schéma complet de la base de données Supabase
-- À exécuter une seule fois dans Supabase > SQL Editor > New query
-- =============================================================================

-- ---------- Types ----------
create type public.role_membre as enum ('membre', 'bureau', 'tresorier', 'controleur');
create type public.statut_projet as enum ('idee', 'en_cours', 'termine');
create type public.type_evenement as enum ('reunion', 'religieux', 'collecte', 'sortie');
create type public.statut_cotisation as enum ('en_attente', 'confirme', 'rejete');
create type public.type_document as enum ('compte_rendu', 'reglement', 'affiche', 'autre');

-- ---------- Tables ----------
create table public.membres (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  prenom text not null,
  nom text not null,
  telephone text unique,                       -- format 221771234567
  quartier text,
  commission text,
  role public.role_membre not null default 'membre',
  telephone_visible boolean not null default false,  -- accord du membre
  date_adhesion date default current_date,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.annonces (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  texte text not null,
  important boolean not null default false,
  auteur_id uuid references public.membres (id) on delete set null,
  auteur_nom text,
  publie_le timestamptz not null default now()
);

create table public.projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  responsable text,
  statut public.statut_projet not null default 'idee',
  objectif numeric(14, 0) not null default 0,
  montant_depense numeric(14, 0) not null default 0,
  date_debut date,
  date_fin date,
  a_la_une boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.evenements (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  type public.type_evenement not null,
  debut timestamptz not null,
  lieu text,
  description text,
  created_at timestamptz not null default now()
);
create index on public.evenements (debut);

create table public.presences (
  evenement_id uuid not null references public.evenements (id) on delete cascade,
  membre_id uuid not null references public.membres (id) on delete cascade,
  reponse boolean not null,
  repondu_le timestamptz not null default now(),
  primary key (evenement_id, membre_id)
);

create table public.archives (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  annee int not null,
  resume text,
  lien_photos text,
  lien_compte_rendu text,
  created_at timestamptz not null default now()
);

create table public.cotisations (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid not null constraint cotisations_membre_fk references public.membres (id) on delete restrict,
  montant numeric(14, 0) not null check (montant > 0),
  date_paiement date not null,
  moyen text,
  reference text,
  projet_id uuid references public.projets (id) on delete set null,
  recu_path text,
  statut public.statut_cotisation not null default 'en_attente',
  confirme_par uuid constraint cotisations_confirme_par_fk references public.membres (id) on delete set null,
  confirme_par_nom text,
  confirme_le timestamptz,
  note text,
  created_at timestamptz not null default now()
);
create index on public.cotisations (membre_id);
create index on public.cotisations (projet_id, statut);

create table public.infos_cotisation (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  operateur text not null,
  titulaire text not null,
  ordre int not null default 0,
  actif boolean not null default true
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  type public.type_document not null default 'autre',
  lien text not null,
  date_doc date,
  created_at timestamptz not null default now()
);

-- ---------- Fonctions d'aide aux droits ----------
create or replace function public.mon_membre_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from membres where user_id = auth.uid() and actif
$$;

create or replace function public.mon_role() returns public.role_membre
language sql stable security definer set search_path = public as $$
  select role from membres where user_id = auth.uid() and actif
$$;

create or replace function public.est_membre() returns boolean
language sql stable as $$ select public.mon_membre_id() is not null $$;

create or replace function public.est_bureau() returns boolean
language sql stable as $$ select coalesce(public.mon_role() in ('bureau', 'tresorier', 'controleur'), false) $$;

create or replace function public.est_tresorerie() returns boolean
language sql stable as $$ select coalesce(public.mon_role() in ('tresorier', 'controleur'), false) $$;

-- ---------- Sécurité : Row Level Security ----------
alter table public.membres enable row level security;
alter table public.annonces enable row level security;
alter table public.projets enable row level security;
alter table public.evenements enable row level security;
alter table public.presences enable row level security;
alter table public.archives enable row level security;
alter table public.cotisations enable row level security;
alter table public.infos_cotisation enable row level security;
alter table public.documents enable row level security;

-- Membres : chacun voit sa fiche, le bureau voit tout.
-- Les modifications passent par le tableau de bord Supabase ou le script d'import
-- (personne ne peut changer son propre rôle depuis l'application).
create policy membres_lecture on public.membres for select to authenticated
  using (user_id = auth.uid() or public.est_bureau());

-- Contenus publics pour les membres, publiés par le bureau
create policy annonces_lecture on public.annonces for select to authenticated using (public.est_membre());
create policy annonces_ecriture on public.annonces for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

create policy projets_lecture on public.projets for select to authenticated using (public.est_membre());
create policy projets_ecriture on public.projets for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

create policy evenements_lecture on public.evenements for select to authenticated using (public.est_membre());
create policy evenements_ecriture on public.evenements for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

create policy archives_lecture on public.archives for select to authenticated using (public.est_membre());
create policy archives_ecriture on public.archives for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

create policy documents_lecture on public.documents for select to authenticated using (public.est_membre());
create policy documents_ecriture on public.documents for all to authenticated using (public.est_bureau()) with check (public.est_bureau());

-- Numéros officiels : modifiables seulement par le trésorier et le contrôleur
create policy infos_lecture on public.infos_cotisation for select to authenticated using (public.est_membre());
create policy infos_ecriture on public.infos_cotisation for all to authenticated using (public.est_tresorerie()) with check (public.est_tresorerie());

-- Présences : tout le monde voit les réponses, chacun ne modifie que la sienne
create policy presences_lecture on public.presences for select to authenticated using (public.est_membre());
create policy presences_ajout on public.presences for insert to authenticated with check (membre_id = public.mon_membre_id());
create policy presences_modif on public.presences for update to authenticated
  using (membre_id = public.mon_membre_id()) with check (membre_id = public.mon_membre_id());
create policy presences_suppr on public.presences for delete to authenticated using (membre_id = public.mon_membre_id());

-- Cotisations : chacun voit les siennes, la trésorerie voit tout.
-- Un membre ne peut déclarer que pour lui-même, toujours « en attente ».
-- La confirmation passe uniquement par la fonction valider_cotisation().
create policy cotisations_lecture on public.cotisations for select to authenticated
  using (membre_id = public.mon_membre_id() or public.est_tresorerie());
create policy cotisations_declaration on public.cotisations for insert to authenticated
  with check (membre_id = public.mon_membre_id() and statut = 'en_attente' and confirme_par is null and confirme_le is null and confirme_par_nom is null);
create policy cotisations_annulation on public.cotisations for delete to authenticated
  using (membre_id = public.mon_membre_id() and statut = 'en_attente');

-- ---------- Vues ----------
-- Totaux par projet (transparence) : seul le cumul est exposé, pas le détail des membres
create or replace view public.projets_bilan as
  select p.*,
         coalesce(sum(c.montant) filter (where c.statut = 'confirme'), 0)::numeric(14, 0) as montant_collecte
  from public.projets p
  left join public.cotisations c on c.projet_id = p.id
  where public.est_membre()
  group by p.id;

create or replace view public.presences_compte with (security_invoker = true) as
  select evenement_id,
         count(*) filter (where reponse) as nb_oui,
         count(*) filter (where not reponse) as nb_non
  from public.presences
  group by evenement_id;

revoke all on public.projets_bilan from anon, public;
grant select on public.projets_bilan to authenticated;
revoke all on public.presences_compte from anon, public;
grant select on public.presences_compte to authenticated;

-- ---------- Fonctions appelées par l'application ----------
-- Annuaire : le numéro n'apparaît que si le membre a donné son accord (ou pour le bureau)
create or replace function public.annuaire()
returns table (id uuid, prenom text, nom text, telephone text, quartier text, commission text,
               role public.role_membre, telephone_visible boolean, date_adhesion date)
language sql stable security definer set search_path = public as $$
  select m.id, m.prenom, m.nom,
         case when m.telephone_visible or public.est_bureau() or m.user_id = auth.uid() then m.telephone end,
         m.quartier, m.commission, m.role, m.telephone_visible, m.date_adhesion
  from membres m
  where m.actif and public.est_membre()
  order by m.prenom, m.nom
$$;

-- Le membre choisit lui-même d'afficher ou non son numéro
create or replace function public.changer_visibilite(p_visible boolean) returns void
language sql security definer set search_path = public as $$
  update membres set telephone_visible = p_visible where user_id = auth.uid()
$$;

-- Confirmation / rejet d'une cotisation par le trésorier ou le contrôleur (trace de qui a validé)
create or replace function public.valider_cotisation(p_id uuid, p_statut public.statut_cotisation, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_moi membres;
begin
  select * into v_moi from membres where user_id = auth.uid() and actif;
  if v_moi.id is null or v_moi.role not in ('tresorier', 'controleur') then
    raise exception 'Action réservée au trésorier et au contrôleur';
  end if;
  update cotisations set
    statut = p_statut,
    note = coalesce(p_note, note),
    confirme_par = case when p_statut = 'en_attente' then null else v_moi.id end,
    confirme_par_nom = case when p_statut = 'en_attente' then null else v_moi.prenom || ' ' || v_moi.nom end,
    confirme_le = case when p_statut = 'en_attente' then null else now() end
  where id = p_id;
  if not found then raise exception 'Cotisation introuvable'; end if;
end
$$;

revoke execute on function public.annuaire() from public, anon;
revoke execute on function public.changer_visibilite(boolean) from public, anon;
revoke execute on function public.valider_cotisation(uuid, public.statut_cotisation, text) from public, anon;
grant execute on function public.annuaire() to authenticated;
grant execute on function public.changer_visibilite(boolean) to authenticated;
grant execute on function public.valider_cotisation(uuid, public.statut_cotisation, text) to authenticated;

-- ---------- Stockage des reçus (privé) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recus', 'recus', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy recus_depot on storage.objects for insert to authenticated
  with check (bucket_id = 'recus' and (storage.foldername(name))[1] = auth.uid()::text);
create policy recus_lecture on storage.objects for select to authenticated
  using (bucket_id = 'recus' and ((storage.foldername(name))[1] = auth.uid()::text or public.est_tresorerie()));
