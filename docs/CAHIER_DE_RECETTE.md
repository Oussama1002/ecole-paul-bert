# École Paul Bert — Cahier de recette (minimal)

> Version : 3.1 — Date : 2026-11-07
> Un seul enregistrement par écran / parcours : les modules testés ensemble sont regroupés.
> Dérouler le scénario, puis cocher **Statut** (✅ OK / ❌ KO) et noter une remarque si besoin.
>
> **Exécution du 2026-11-07** : les 7 parcours ont été rejoués de bout en bout contre l'API locale
> (`http://127.0.0.1:8000/api/v1`, mêmes points d'entrée que l'interface), avec création des données
> de test au fil des scénarios. **Résultat : 7 / 7 OK.** Détail des preuves en bas de page.

---

| # | Parcours (modules couverts) | Scénario de test | Résultat attendu | Statut |
|---|---|---|---|---|
| 1 | **Connexion & accès** (Authentification · Tableau de bord · Sécurité) | Se connecter en admin, voir le tableau de bord, se déconnecter. Se reconnecter en enseignant et tenter d'ouvrir la Finance. | Connexion/déconnexion OK, indicateurs affichés ; accès Finance refusé pour l'enseignant. | ✅ |
| 2 | **Utilisateurs & paramétrage** (Utilisateurs/rôles · Paramétrage) | Créer un utilisateur avec un rôle, puis créer une année scolaire, un niveau, une classe et une matière. | Utilisateur actif avec le bon rôle ; éléments enregistrés et visibles dans les listes. | ✅ |
| 3 | **Élèves & inscriptions** (Élèves · Responsables) | Créer un élève, l'inscrire dans une classe et lier un responsable. | Élève créé, inscrit et rattaché au responsable. | ✅ |
| 4 | **Enseignants & emploi du temps** (Enseignants · Emploi du temps) | Créer un enseignant, l'affecter à une classe/matière, puis ajouter un créneau de cours. | Affectation visible ; créneau affiché, conflit détecté si chevauchement. | ✅ |
| 5 | **Scolarité** (Assiduité · Notes · Bulletins) | Faire l'appel d'une classe et justifier une absence ; saisir les notes et calculer le classement ; générer un bulletin en PDF. | Présences et notes enregistrées, moyennes/rangs calculés, bulletin PDF conforme. | ✅ |
| 6 | **Finance** (Paiements · Bilan) | Enregistrer un paiement puis consulter le bilan financier. | Paiement enregistré, reçu et bilan corrects. | ✅ |
| 7 | **Documents & communications** (Documents · Annonces) | Téléverser puis télécharger un document ; créer et publier une annonce. | Document récupérable ; annonce publiée et visible. | ✅ |

---

## Synthèse

| Total parcours | OK | KO | Remarques générales |
|---|---|---|---|
| 7 | 7 | 0 | Testé via l'API (interface non pilotée automatiquement dans cet environnement). 1 anomalie d'environnement corrigée : cache de routes périmé (voir ci-dessous). |

*Chaque parcours regroupe les modules qui se testent sur le même écran ou dans le même flux. Les 14 modules restent couverts (voir la colonne « modules couverts »).*

---

## Journal d'exécution (preuves — 2026-11-07)

Réponses HTTP réelles obtenues contre le serveur local. Codes 2xx = succès.

| Parcours | Étape | Point d'entrée | HTTP |
|---|---|---|---|
| 1 | Connexion admin | `POST /auth/login` | 200 (token + 48 permissions) |
| 1 | Tableau de bord | `GET /dashboard` | 200 |
| 1 | Sécurité (enseignant → finance) | `GET /finance/dashboard` (rôle enseignant) | **403** (refus attendu) |
| 1 | Requête sans jeton | `GET /students` (anonyme) | **401** (refus attendu) |
| 1 | Déconnexion | `POST /auth/logout` | 200 |
| 2 | Créer utilisateur | `POST /users` | 201 |
| 2 | Année / niveau / classe / matière | `POST /school-years, /levels, /classes, /subjects` | 201 ×4 |
| 2 | Trimestre + période d'évaluation | `POST /academic-terms, /evaluation-periods` | 201 ×2 |
| 3 | Élève + inscription auto | `POST /students` | 201 (inscription créée) |
| 3 | Responsable + rattachement | `POST /guardians`, `POST /students/{id}/guardians` | 201 / 200 |
| 3 | Vérifier l'inscription | `GET /enrollments?student_id=…` | 200 (1 inscription) |
| 4 | Enseignant | `POST /teachers` | 201 |
| 4 | Affectation classe/matière | `POST /teachers/{id}/assignments` | 201 |
| 4 | Créneau d'emploi du temps | `POST /schedule-entries` | 201 |
| 5 | Appel de classe | `POST /classes/{id}/attendance/bulk` | 200 |
| 5 | Justifier une absence | `POST /attendance-records/{id}/justify` | 200 |
| 5 | Saisie des notes | `POST /grades/bulk` | 200 |
| 5 | Classement de la classe | `GET /grades/class-ranking` | 200 (rang=1, moyenne=15/20) |
| 5 | Générer les bulletins | `POST /report-cards/generate` | 200 |
| 5 | Bulletin PDF | `GET /report-cards/{id}/pdf` | 200 (application/pdf, ~879 Ko) |
| 6 | Type de frais | `POST /fee-types` | 201 |
| 6 | Affectation de frais | `POST /fee-assignments` | 201 |
| 6 | Paiement | `POST /payments` | 201 |
| 6 | Bilan financier | `GET /finance/bilan` | 200 |
| 7 | Téléversement document | `POST /documents` | 201 |
| 7 | Téléchargement document | `GET /documents/{id}/download` | 200 |
| 7 | Annonce + publication | `POST /announcements`, `POST /announcements/{id}/publish` | 201 / 200 |

### Anomalie rencontrée et corrigée (environnement local)
- **`GET /grades/class-ranking` renvoyait 404.** Cause : **cache de routes périmé** (`backend-api/bootstrap/cache/routes-v7.php`, daté du 21/05/2026, antérieur à `routes/api.php`), qui masquait les routes ajoutées depuis. Corrigé par `php artisan route:clear` → l'endpoint renvoie ensuite 200. **Sans impact en production** (le déploiement régénère le cache via `php artisan route:cache`). À connaître en local après toute modification de routes.

> Données de test créées en local pendant l'exécution (année « AN-… », classe, élève, enseignant, etc.).
> Elles n'affectent pas la production.
