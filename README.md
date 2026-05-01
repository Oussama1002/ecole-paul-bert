# École Paul Bert — monorepo

Projet de gestion scolaire (API Laravel + interface React), connecté à la base **`paulbert_base`**.

## Contenu

| Dossier / fichier | Description |
|-------------------|-------------|
| [`backend-api/`](backend-api/) | API REST Laravel 11 (Sanctum, `/api/v1`) |
| [`frontend-admin/`](frontend-admin/) | Interface d’administration (Vite, React, TypeScript, Tailwind) |
| [`docs/BDD_MAPPING.md`](docs/BDD_MAPPING.md) | Audit SQL, contraintes, mapping tables → modèles |
| [`docs/GUIDE_DEVELOPPEMENT.md`](docs/GUIDE_DEVELOPPEMENT.md) | Normes d’équipe (Git, API, erreurs, permissions) |
| [`paulbert_base.sql`](paulbert_base.sql) | Schéma et données de référence (rôles) |

## Démarrage rapide

1. Importer `paulbert_base.sql` dans MySQL/MariaDB.
2. Backend : suivre [`backend-api/README.md`](backend-api/README.md) (`composer install`, `.env`, `php artisan migrate`).
3. Frontend : suivre [`frontend-admin/README.md`](frontend-admin/README.md) (`npm install`, `npm run dev`).

En développement : backend sur le port **8000**, frontend sur **5173** (proxy `/api` vers l’API).

## Phase 0 (livré)

- Audit BDD et document de mapping.
- Backend initialisé (auth par token, santé, format JSON spec).
- Shell frontend (layout, navigation, routes protégées).
- Guide de développement interne.

Spécification fonctionnelle / technique : fichier `SPÉCIFICATION TECHNIQUE DÉVELOPPEURS` à la racine.
