-- Sama Dahira : droits d'accès aux tables (à exécuter après 001_schema.sql)
-- Les projets Supabase récents n'accordent plus automatiquement l'accès aux tables.
-- Ces droits ouvrent la porte ; la Row Level Security (déjà active sur chaque table)
-- décide ensuite, ligne par ligne, ce que chaque membre peut lire ou modifier.
-- Les visiteurs non connectés (anon) n'ont toujours accès à rien.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.membres,
  public.annonces,
  public.projets,
  public.evenements,
  public.presences,
  public.archives,
  public.cotisations,
  public.infos_cotisation,
  public.documents
to authenticated;

-- Le script d'import des membres utilise la clé secrète (rôle service_role)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
