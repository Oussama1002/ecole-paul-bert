# QA — Phase 1 (auth, utilisateurs, permissions)

## Prérequis

- Base `paulbert_base` importée, migrations Laravel exécutées (`personal_access_tokens`, `password_reset_tokens`).
- `php artisan db:seed` (permissions + liaison aux rôles).
- Compte utilisateur de test (rôle avec `users.view`, ex. **Administrateur** id `2`).
- Backend : `php artisan serve` ; frontend : `npm run dev` (port 5173).

## 1. Authentification API

| Test | Action attendue |
|------|-------------------|
| Login correct | `POST /api/v1/auth/login` avec email/mot de passe valides → 200, `token`, `user`, `permission_codes`. |
| Login incorrect | Mauvais mot de passe → 401, message d’erreur. |
| Compte inactif | Utilisateur `status` ≠ `active` → 403. |
| Profil | `GET /api/v1/auth/me` avec header `Authorization: Bearer {token}` → 200, `user` + `permission_codes`. |
| Déconnexion | `POST /api/v1/auth/logout` avec token → 200 ; token invalide ensuite. |
| Changement mot de passe | `POST /api/v1/auth/change-password` avec `current_password`, `password`, `password_confirmation` → 200 ; autres tokens révoqués. |
| Mot de passe oublié | `POST /api/v1/auth/forgot-password` `{ "email": "..." }` → 200 (message neutre). Vérifier les logs mail si `MAIL_MAILER=log`. |
| Réinitialisation | Depuis le lien généré (`FRONTEND_URL/reinitialiser-mot-de-passe?token=...&email=...`), `POST /api/v1/auth/reset-password` → 200 ; connexion avec le nouveau mot de passe. |

## 2. Sessions / tokens (Sanctum)

| Test | Vérification |
|------|----------------|
| Sans token | `GET /api/v1/users` → 401. |
| Token invalide | Header Bearer incorrect → 401. |
| Expiration (optionnel) | Définir `SANCTUM_EXPIRATION_MINUTES` dans `.env`, recréer un token et attendre l’expiration pour constater un refus. |

## 3. Permissions par rôle

Après seed, exemples (voir `PermissionSeeder`) :

- **Super administrateur / Administrateur** : toutes les permissions listées.
- **Enseignant** : `dashboard.view` uniquement (pas `users.view`).
- **Scolarité** : gestion utilisateurs + désactivation.

Contrôles :

- Utilisateur **enseignant** : `GET /api/v1/users` → **403** ; navigation « Utilisateurs » absente dans le shell.
- Utilisateur **admin** : liste utilisateurs OK, CRUD selon droits.

## 4. Frontend

| Écran | Vérification |
|-------|----------------|
| `/login` | Formulaire, lien « Mot de passe oublié ». |
| `/mot-de-passe-oublie` | Envoi (message de confirmation). |
| `/reinitialiser-mot-de-passe` | Formulaire avec jeton dans l’URL. |
| `/utilisateurs` | Liste, filtres recherche / rôle / statut, pagination. |
| `/utilisateurs/nouveau` | Création (si droit `users.create`). |
| `/utilisateurs/:id/editer` | Édition (si `users.edit`). |
| Activer / désactiver | Boutons si `users.deactivate`. |
| `/mot-de-passe` | Changement de mot de passe connecté. |
| `/acces-refuse` | Accès direct à une route protégée sans permission (ex. URL manuelle). |

## 5. Tests automatisés (backend)

```bash
cd backend-api && php artisan test
```

Inclut des tests basiques (validation login, `/auth/me` et `/users` sans authentification).
