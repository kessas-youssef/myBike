# MyBike Djo

Application de gestion complète pour le shop **MyBike Djo** (location, réparation et accessoires de vélos et trottinettes électriques) à la forêt de Canastel, Oran.

Le site public, le portail client et le tableau de bord Djo sont réunis dans une seule application **SvelteKit** déployable sur **Netlify**, avec **MongoDB Atlas** comme base partagée.

## Fonctionnalités

### Site public
- Page d’accueil éditable : textes, photos, couleurs, services, galerie, coordonnées, carte.
- Catalogue des véhicules (prix/heure, prix/jour, caution, couleur, équipements, disponibilité).
- Catalogue des accessoires et pièces.
- Bandeau de promotion et codes de réduction.
- Réservation en ligne et demande de réparation.

### Espace client
- Connexion / inscription.
- Réservations, locations à venir, historique et réparations.
- Profil modifiable.
- Contrat et coordonnées du shop.
- Suivi de position pendant une location active, avec file d’attente GPS hors ligne.

### Tableau de bord Djo
- Vue d’ensemble : chiffre d’affaires du jour, locations actives, alertes, stock bas, activité récente.
- Locations : départ, retour, prolongation, caution, pièce d’identité retenue, contrat imprimable, suivi GPS.
- Réservations : confirmation, annulation, conversion en location.
- Réparations : statuts, devis, montant facturé, dates.
- Véhicules et accessoires : ajout, modification, photos compressées, stock, visibilité.
- Clients : coordonnées, notes, historique, appel/WhatsApp.
- Promotions : codes, remises en % ou montant fixe, dates de validité.
- Éditeur de page d’accueil.
- Réglages : position du shop, zone de suivi, cautions, conditions de contrat, mot de passe, sauvegarde/restauration.
- **Fonctionne hors ligne** après une première connexion, puis synchronise automatiquement avec MongoDB Atlas.

## Stack

- SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS 4
- MongoDB Atlas + driver `mongodb`
- Authentification JWT en cookie `httpOnly`
- IndexedDB + outbox locale pour le mode hors ligne
- Service worker + manifest PWA
- `@sveltejs/adapter-netlify` 6 (Netlify Functions)

## Démarrage local

```sh
npm install
cp .env.example .env
# renseigner MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run dev
```

Ouvrir `http://localhost:5173`.

Le serveur accepte `MONGODB_URI` ou l’ancienne variable `DB_STRING`. La base utilisée est, dans l’ordre : `MONGODB_DB`, le nom présent dans la chaîne de connexion, puis `myBike`.

### Compte administrateur initial

Au premier démarrage, si aucun administrateur n’existe, le seed crée :

- email : `ADMIN_EMAIL` (par défaut `djo@mybike.dz`)
- mot de passe : `ADMIN_PASSWORD` (par défaut `admin123`)

**Changez ce mot de passe dans Réglages → Compte administrateur dès la mise en production.**

## Déploiement Netlify + MongoDB Atlas

### 1. MongoDB Atlas

1. Créer un cluster gratuit (M0).
2. Créer un utilisateur de base de données avec un mot de passe fort.
3. Dans **Network Access**, autoriser `0.0.0.0/0` (Netlify Functions n’ont pas d’IP fixe sur l’offre gratuite).
4. Récupérer la chaîne de connexion `mongodb+srv://…` et ajouter le nom de la base, par exemple `/myBike`. Vous pouvez aussi laisser la base dans la chaîne et définir `MONGODB_DB` sur Netlify.

### 2. Netlify

1. Pousser le dépôt sur GitHub/GitLab.
2. Sur Netlify : **Add new site → Import an existing project**.
3. Build command : `npm run build` — publish directory : `build` (déjà dans `netlify.toml`).
4. Ajouter les variables d’environnement :
   - `MONGODB_URI`
   - `MONGODB_DB` (optionnel, `myBike` par défaut)
   - `JWT_SECRET` (longue chaîne aléatoire)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
5. Déployer. Le premier appel initialise les index, les données par défaut et le compte Djo.

Le projet n’a pas besoin de Railway, Render ou d’un serveur Node séparé : les routes `/api/*` et le rendu SvelteKit sont exécutés par les Netlify Functions.

## Mode hors ligne

- Le tableau de bord (`/admin`) et le portail client (`/dashboard`) sont rendus côté client (`ssr = false`).
- Les données du shop sont copiées dans **IndexedDB**.
- Chaque modification crée une opération dans une **outbox** locale, puis `POST /api/sync` l’envoie à Atlas.
- En cas de coupure, l’interface continue de fonctionner. La synchronisation reprend au retour du réseau, au focus de la page et toutes les 30 secondes.
- Les opérations de l’outbox sont rejouées dans l’ordre chronologique ; les suppressions sont logiques (`_deleted`). Les écritures sont envoyées par lots pour rester sous la limite de taille des Netlify Functions.
- Les images sont compressées (environ 1200 px, JPEG) en base64 et stockées dans le document. Gardez la galerie raisonnable : chaque document doit rester sous 8 Mo, et un lot de synchronisation sous la limite Netlify.
- Le service worker met en cache l’app shell, les images et la dernière version de `/api/public`.

### Première utilisation hors ligne

Le mode hors ligne de l’administration nécessite **une première connexion avec internet** pour :
1. installer le service worker,
2. enregistrer la session Djo dans `localStorage`,
3. remplir IndexedDB avec les données du shop.

Ensuite, l’application reste utilisable sans réseau sur le même appareil et le même navigateur.

## Suivi de position des locations

- Le locataire active le partage depuis son portail, pendant une location **active**.
- Le navigateur envoie un point GPS à `/api/tracking` (intervalle réglable, 30 s par défaut).
- Djo voit la dernière position, l’historique, la distance au shop et les sorties de zone.
- Les points GPS sont mis en file d’attente hors ligne puis envoyés au retour du réseau.
- La zone par défaut est centrée sur `35.7256, -0.585` avec un rayon de `1 500 m` (modifiable dans Réglages).

### Limite importante

Un site web **ne peut pas suivre un téléphone en arrière-plan** lorsque l’écran est éteint ou que le navigateur est fermé. Le suivi fonctionne uniquement tant que la page du portail client reste ouverte. Pour un suivi continu, il faudrait une application mobile native avec les permissions « localisation en arrière-plan ». Cette limite est affichée dans l’interface et doit être expliquée au locataire.

Le suivi doit être présenté comme un outil de sécurité et de transparence, avec l’accord du locataire. Vérifiez les obligations locales relatives à la géolocalisation et à la conservation des données personnelles.

## Pièce d’identité et cautions

- Djo peut saisir le type et le numéro de pièce d’identité, et indiquer si la pièce physique est retenue au shop.
- La caution est enregistrée séparément du prix de location.
- Le contrat imprimable reprend les informations du locataire, du véhicule, de la caution, de la pièce d’identité et les conditions de location.
- Les données d’identité sont sensibles : limitez l’accès au compte Djo, utilisez un mot de passe fort et sauvegardez la base de façon sécurisée.

## Scripts

```sh
npm run dev      # développement
npm run build    # build de production (Netlify)
npm run preview  # prévisualiser le build
npm run lint     # vérification Prettier
npm run format   # formatage
```

## Structure utile

```
src/
  routes/
    +page.svelte              # site public
    reserver/                 # réservation client
    reparer/                  # demande de réparation
    login/, register/         # authentification
    dashboard/                # portail client
    admin/                    # tableau de bord Djo (ssr=false)
    offline/                  # page de secours hors ligne
    api/
      public/                 # données publiques
      auth/                   # login, register, me, logout, password
      my/                     # données du client connecté
      profile/                # profil client
      reservations/           # réservations
      repairs/                # réparations
      tracking/               # positions GPS
      sync/                   # synchronisation admin <-> Atlas
  lib/
    client/store.svelte.js    # IndexedDB, outbox, synchronisation
    client/idb.js             # accès IndexedDB
    client/tracking.svelte.js # file d’attente GPS
    components/admin/         # onglets du tableau de bord
    server/                   # db, auth, ids, seed
  service-worker.js           # PWA / cache hors ligne
```

## Sauvegarde

Dans **Réglages → Synchronisation & données** :

- **Exporter** télécharge un JSON complet des données locales.
- **Importer** restaure un JSON et le remet dans la file d’envoi vers Atlas.
- **Effacer les données locales** ne supprime pas Atlas ; cela réinitialise seulement l’appareil.

Une sauvegarde MongoDB Atlas régulière reste recommandée (Atlas → Backup ou `mongodump`).

## Sécurité

- `JWT_SECRET` doit être défini et gardé secret en production.
- Le cookie de session est `httpOnly`, `sameSite=lax` et `secure` en production.
- Les API admin vérifient le rôle `admin`.
- Les routes client vérifient la propriété de la location avant d’accepter une position.
- Ne commitez jamais `.env` (déjà ignoré par Git) et ne mettez jamais de vrais identifiants dans `.env.example`.
- Le mot de passe admin par défaut doit être changé immédiatement.

## Améliorations possibles

- Notifications WhatsApp/SMS automatiques (rappel de retour, réparation prête).
- Application mobile native pour le suivi GPS en arrière-plan.
- Génération PDF du contrat et envoi par email.
- Gestion multi-employés avec rôles.
- Stockage d’images sur un CDN (Cloudinary, Bunny) si la galerie devient volumineuse.
