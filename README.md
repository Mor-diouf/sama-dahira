# Sama Dahira

Application mobile du Dahira : annonces, calendrier avec réponses de présence, projets avec totaux transparents, cotisations déclarées et confirmées par le trésorier, annuaire des membres, archives et documents.

Technologies : React 18, Vite, TypeScript, PWA (installable, fonctionne hors ligne), Supabase (base de données, connexion, stockage des reçus).

## Lancer l'application

```bash
npm install
npm run dev        # http://localhost:5173
```

Sans accès Supabase, l'application démarre en **mode démonstration** avec des données fictives. L'écran de connexion propose alors trois profils : Membre, Bureau et Trésorier.

## Brancher Supabase

1. Créez un projet sur supabase.com.
2. Ouvrez **SQL Editor**, collez le contenu de `supabase/migrations/001_schema.sql` et exécutez-le.
   Faites de même avec `supabase/migrations/002_droits.sql` (droits d'accès aux tables, indispensable sur les projets récents).
3. Facultatif : exécutez `supabase/seed.sql` après avoir remplacé les numéros par ceux des comptes officiels.
4. Dans **Authentication > Sign In / Providers**, désactivez « Allow new users to sign up ». Seul le bureau crée les comptes.
5. Copiez `.env.example` en `.env.local` et collez l'URL du projet, la clé `anon` et la clé `service_role` (Project Settings > API).
6. Relancez `npm run dev`. Le bandeau « Mode démonstration » disparaît.

> La clé `service_role` sert uniquement au script d'import. Elle ne doit jamais être publiée ni envoyée sur GitHub.

## Ajouter les membres depuis l'application

Le bureau ajoute les membres dans **Plus > Espace bureau > Membres** : création du compte, rôle, nouveau code, désactivation, envoi du code par WhatsApp.

Cet onglet utilise la fonction serveur `supabase/functions/gerer-membres` (elle seule détient la clé secrète). Pour l'installer :

1. Supabase > **Edge Functions** > **Deploy a new function** > **Via Editor**.
2. Nommez-la exactement `gerer-membres`, remplacez le code d'exemple par le contenu de `supabase/functions/gerer-membres/index.ts`, puis **Deploy function**.

Règles appliquées par le serveur : le bureau gère les membres et le bureau ; seuls le trésorier et le contrôleur attribuent ou modifient les rôles de trésorerie ; personne ne change son propre rôle ni ne se désactive.

Le tout premier compte du bureau doit être créé avec le script ci-dessous (ou dans le tableau de bord Supabase), puisque personne n'a encore accès à l'onglet.

## Ajouter les membres en masse (fichier CSV)

Remplissez un fichier CSV sur le modèle de `scripts/modele-membres.csv`. Vous pouvez l'exporter depuis Excel ou Google Sheets.

```bash
npm run import-membres -- scripts/membres.csv
```

Le script crée un compte par membre avec un code à 6 chiffres. Il produit le fichier `membres-codes-AAAA-MM-JJ.csv` avec un lien WhatsApp prêt à envoyer pour chaque membre. Supprimez ce fichier après la distribution des codes.

Pour un membre qui a perdu son code :

```bash
npm run import-membres -- --nouveau-code 771234567
```

Le membre se connecte ensuite avec son numéro et son code. Aucun e-mail ni SMS n'est nécessaire.

## Rôles

| Rôle | Droits |
|---|---|
| membre | Consulter, déclarer ses cotisations, répondre aux réunions et sorties, choisir d'afficher son numéro |
| bureau | Publier annonces, événements, projets, documents et archives ; voir qui vient aux réunions |
| tresorier | Droits du bureau, plus confirmer ou rejeter les cotisations et modifier les numéros officiels |
| controleur | Mêmes droits que le trésorier : c'est la deuxième personne qui contrôle |

Les droits sont appliqués dans la base de données elle-même, pas seulement dans l'application. Pour changer le rôle d'un membre, modifiez la colonne `role` dans la table `membres` depuis le tableau de bord Supabase, ou relancez l'import.

## Mettre en ligne

```bash
npm run build      # produit le dossier dist/
```

Déployez `dist/` sur Vercel ou Netlify. Les fichiers `vercel.json` et `public/_redirects` sont déjà prêts. Ajoutez les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les réglages de l'hébergeur.

## Générer l'APK avec PWABuilder

1. Ouvrez pwabuilder.com et collez l'adresse HTTPS de l'application en ligne.
2. Le manifeste, les icônes et le service worker sont déjà configurés.
3. Choisissez **Android**, puis téléchargez le paquet. Gardez précieusement le fichier de clé de signature fourni : il est nécessaire pour chaque mise à jour.
4. Pour supprimer la barre d'adresse dans l'APK, publiez le fichier `assetlinks.json` fourni par PWABuilder dans `public/.well-known/`, puis redéployez.

## Personnaliser

- Nom, sous-titre et ville : `src/config.ts`
- Couleurs : variables en haut de `src/styles/app.css`
- Logo : remplacez `scripts/logo-source.jpg` (logo rond sur fond noir), puis `npm run icons` pour regénérer le logo et les icônes
- Nom affiché sur le téléphone : `name` et `short_name` dans `vite.config.ts`
