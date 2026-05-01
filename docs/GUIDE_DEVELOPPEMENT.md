# Guide de développement — École Paul Bert

Document interne pour l’équipe (PHASE 0 — normes techniques).

## Architecture

- **Backend** : [`backend-api/`](../backend-api) — Laravel 11, API REST préfixe `/api/v1`.
- **Frontend** : [`frontend-admin/`](../frontend-admin) — React, Vite, TypeScript.
- **Base** : `paulbert_base` (MySQL/MariaDB), schéma défini par [`paulbert_base.sql`](../paulbert_base.sql).

Le client ne parle **jamais** directement à la base : tout passe par l’API.

---

## Conventions de nommage

| Zone | Convention | Exemples |
|------|------------|----------|
| PHP classes | `PascalCase` | `StudentController`, `EnrollmentService` |
| PHP methods / vars | `camelCase` | `findActiveEnrollment` |
| DB tables | `snake_case` pluriel | `student_class_assignments` |
| API JSON | `snake_case` pour coller à la BDD et aux Resources Laravel | `first_name`, `school_year_id` |
| Routes API | kebab-case dans l’URL si segments libres | `/expense-categories` |
| React composants | `PascalCase` | `AdminLayout.tsx` |
| React hooks / fichiers utilitaires | `camelCase` | `useAuth.ts` |
| Constantes TS | `UPPER_SNAKE` ou `as const` | `TOKEN_KEY` |

**Modèle Laravel** : pour la table `classes`, utiliser un nom de classe PHP éviter le mot-clé `class`, par ex. `SchoolClass` avec `protected $table = 'classes';`.

---

## Git — branches et commits

### Branches

- `main` (ou `master`) : prête pour déploiement / recette.
- `develop` : intégration continue des features (optionnel si petite équipe).
- `feature/<module>-<court-sujet>` : exemple `feature/students-crud`, `fix/attendance-duplicate`.
- `hotfix/<sujet>` : correctifs prod urgents.

### Commits

Format recommandé (Conventional Commits, en français ou anglais cohérent sur le projet) :

```
<type>(<scope>): <description courte>

[corps optionnel]
```

Types : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Exemples :

- `feat(api): ajoute liste paginée des élèves`
- `fix(auth): collation MySQL pour MariaDB`

---

## Format API (contrat)

Aligné sur la spécification technique :

**Succès**

```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {}
}
```

**Erreur**

```json
{
  "success": false,
  "message": "Message lisible",
  "errors": {}
}
```

Les erreurs de validation Laravel sont normalisées pour les routes `api/*` (champ → liste de messages).

**Pagination** (à appliquer sur les listes) : `page`, `per_page`, `search`, `sort_by`, `sort_order`, filtres métier en query string.

---

## Gestion des erreurs

### Backend

- Validation : `FormRequest` + réponses JSON structurées.
- Métier : services qui lèvent des exceptions contrôlées ou retournent des résultats typés ; pas de logique métier lourde dans les contrôleurs.
- Journal : `storage/logs` ; actions sensibles aussi dans `audit_logs` (cf. spec).

### Frontend

- **Axios** : intercepter les erreurs réseau et HTTP ; afficher `message` utilisateur quand présent.
- **React Query** : gérer `isError`, `error`, états de chargement ; pas de duplication massive d’état serveur hors cache.
- **401** : déconnexion locale + redirection login (déjà amorcé dans `api/client.ts`).
- L’UI ne remplace pas les contrôles serveur : masquer un bouton selon le rôle est UX seulement.

---

## Permissions et rôles

- **Source de vérité** : backend (Sanctum + policies / middleware de permissions à étendre).
- **Modèle BDD** : `users.role_id`, tables `roles`, `permissions`, `role_permissions`, `user_role_permissions` (voir [BDD_MAPPING.md](./BDD_MAPPING.md)).
- **Stratégie** :
  1. Définir des codes de permissions stables (`students.view`, `grades.enter`, …).
  2. Les peupler en base et les lier aux rôles.
  3. Exposer au frontend les permissions du user connecté (ex. champ dans `/auth/me` ou endpoint dédié) pour l’UI.
  4. Vérifier systématiquement côté API chaque action.

---

## Environnements

Variables principales (cf. `backend-api/.env.example` et `frontend-admin/.env.example`) :

| Variable | Rôle |
|----------|------|
| `DB_*` | Connexion à `paulbert_base` |
| `DB_COLLATION` | Compatibilité MariaDB (`utf8mb4_unicode_ci`) |
| `FRONTEND_URL` / `CORS_ALLOWED_ORIGINS` | CORS et Sanctum |
| `VITE_API_BASE_URL` | URL absolue du backend si build front séparé du proxy Vite |

En local : `php artisan serve` (8000) + `npm run dev` (5173) avec proxy `/api`.

---

## Qualité et revue

- PR petites et revue avant merge sur `main`.
- Tester au minimum : santé API, login, une route protégée.
- Respecter PSR-12 (PHP) et ESLint (front) une fois la config posée.

---

## Références

- [Spécification technique](../SPÉCIFICATION%20TECHNIQUE%20DÉVELOPPEURS)
- [Mapping BDD](./BDD_MAPPING.md)
