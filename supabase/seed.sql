-- Données de départ (facultatif) : à exécuter après 001_schema.sql
-- Remplacez les numéros par ceux des comptes OFFICIELS du Dahira.

insert into public.infos_cotisation (numero, operateur, titulaire, ordre) values
  ('221700000000', 'Wave', 'Dahira (compte officiel)', 1),
  ('221770000000', 'Orange Money', 'Dahira (compte officiel)', 2);

insert into public.annonces (titre, texte, important, auteur_nom) values
  ('Bienvenue sur l''application du Dahira',
   'Retrouvez ici les annonces, le calendrier, les projets et les numéros officiels de cotisation. Pour toute question, contactez un membre du bureau.',
   true, 'Le bureau');
