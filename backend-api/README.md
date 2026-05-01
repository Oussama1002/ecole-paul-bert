# Backend API — École Paul Bert

API REST Laravel 11 pour la base **`paulbert_base`**.

## Prérequis

- PHP 8.2+
- Composer
- MySQL / MariaDB (XAMPP)
- Base importée depuis [`../paulbert_base.sql`](../paulbert_base.sql)

## Installation

```bash
cd backend-api
composer install
copy .env.example .env
php artisan key:generate
```

Configurer **`.env`** : `DB_*` pointant vers la base `paulbert_base`.

Créer la table des tokens Sanctum (seule migration utilisée ; le schéma métier vient du SQL existant) :

```bash
php artisan migrate
```

## Démarrage

```bash
php artisan serve
```

- Santé : `GET http://localhost:8000/api/v1/health`
- Auth : `POST http://localhost:8000/api/v1/auth/login` (JSON : `email`, `password`)
- Permissions : `php artisan db:seed` (remplit `permissions` et `role_permissions`)

### Endpoints principaux (Phase 1)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/v1/auth/login` | Connexion (retourne `token`, `permission_codes`) |
| POST | `/api/v1/auth/logout` | Déconnexion (Bearer) |
| GET | `/api/v1/auth/me` | Profil + permissions effectives |
| POST | `/api/v1/auth/change-password` | Changer le mot de passe (révoque les autres tokens) |
| POST | `/api/v1/auth/forgot-password` | Demande de lien de réinitialisation |
| POST | `/api/v1/auth/reset-password` | Réinitialiser avec `email`, `token`, `password` |
| GET | `/api/v1/roles` | Liste des rôles (`users.view`) |
| GET | `/api/v1/users` | Liste paginée / filtres (`users.view`) |
| GET | `/api/v1/users/{id}` | Détail (soi-même ou `users.view`) |
| POST | `/api/v1/users` | Création (`users.create`) |
| PATCH | `/api/v1/users/{id}` | Mise à jour (`users.edit`, `users.deactivate` si passage inactif/suspendu) |

Middleware `permission:{code}` sur les routes sensibles ; politiques Laravel sur les actions utilisateur.

## Structure

- `routes/api.php` — préfixe automatique `/api`, routes versionnées `v1`
- `app/Http/Controllers/Api/V1` — contrôleurs API
- `app/Http/Requests/Api/V1` — validation
- `app/Http/Resources` — réponses JSON
- `app/Services` — logique métier (modules à venir)
- `app/Policies` — autorisations

Réponses au format défini dans la spécification (`success`, `message`, `data` / `errors`).

## Premier utilisateur de test

Le fichier SQL ne contient pas de comptes dans `users`. Créer un utilisateur (ex. rôle `super_admin` = id `1`) via Tinker :

```bash
php artisan tinker
```

```php
\App\Models\User::query()->create([
    'role_id' => 1,
    'first_name' => 'Admin',
    'last_name' => 'Test',
    'email' => 'admin@example.test',
    'password_hash' => \Illuminate\Support\Facades\Hash::make('password'),
    'status' => 'active',
]);
```

## Documentation

- [Mapping BDD / modèles](../docs/BDD_MAPPING.md)
- [Guide de développement](../docs/GUIDE_DEVELOPPEMENT.md)
