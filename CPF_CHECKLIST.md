# CPF — Checklist de progression fonctionnelle (ERP scolaire)

Ce document sert de **checklist de suivi** des fonctionnalités attendues par le cahier des charges, et de **tableau d’avancement** (Backend / Frontend / QA).  
Statuts utilisés :

- **DONE** : réalisé et utilisable
- **PARTIAL** : présent mais incomplet / à durcir / à finaliser
- **TODO** : non réalisé

> **Périmètre évalué** : code actuel du workspace `ecole-paul-bert` (Frontend admin React + Backend Laravel API).

---

## 1) Socle système (auth, rôles, sécurité)

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Authentification (login/logout) | **DONE** | **DONE** | **PARTIAL** | `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, Sanctum Bearer |
| Profil connecté (`me`) + permissions | **DONE** | **DONE** | **PARTIAL** | `GET /api/v1/auth/me` + `permission_codes` |
| Rate limiting login / forgot-password | **DONE** | n/a | **PARTIAL** | `throttle:login`, `throttle:forgot-password` |
| Rate limiting API globale | **DONE** | n/a | **PARTIAL** | `throttle:api` (par user/ip) |
| Gestion rôles & permissions (RBAC) | **DONE** | **DONE** | **PARTIAL** | middleware `permission:*`, seeder `PermissionSeeder` |
| Super-admin (accès total) | **DONE** | **DONE** | **TODO** | Bypass backend + UI (super_admin) |
| Réinitialisation mot de passe | **DONE** | **DONE** | **TODO** | forgot/reset/change password |
| Historique de connexion | **PARTIAL** | n/a | **TODO** | `last_login_at` existe, tracking complet à compléter |
| Journalisation actions sensibles (audit) | **DONE** | **DONE** | **PARTIAL** | table `audit_logs`, endpoint `GET /api/v1/audit-logs` |

---

## 2) LOT 1 — Tableau de bord (pilotage)

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Dashboard “intelligent” par rôle | **DONE** | **DONE** | **PARTIAL** | `GET /api/v1/dashboard` |
| KPIs (élèves/enseignants/classes) | **DONE** | **DONE** | **TODO** | présent dans payload `kpis` |
| Indicateurs pédagogiques (moyennes, etc.) | **PARTIAL** | **PARTIAL** | **TODO** | dépend des données grades/terms/périodes |
| Absences du jour / courbe 7 jours | **DONE** | **DONE** | **TODO** | `attendance_last_7_days` |
| Alertes contextualisées (impayés, absences, etc.) | **PARTIAL** | **PARTIAL** | **TODO** | liste `alerts` à enrichir selon cahier |
| Raccourcis action | **DONE** | **DONE** | **TODO** | `shortcuts` filtrés permissions |
| Annonces importantes visibles | **DONE** | **DONE** | **TODO** | `recent_announcements` + tolérance schéma |

---

## 3) LOT 2 — Gestion des élèves

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| CRUD élève (fiche) | **DONE** | **DONE** | **PARTIAL** | `GET/POST/PATCH/DELETE /api/v1/students` |
| Recherche + filtres (classe/niveau/année/statut) | **DONE** | **DONE** | **TODO** | index + query params |
| Historique scolaire (inscriptions + affectations) | **PARTIAL** | **PARTIAL** | **TODO** | `GET /students/{id}/history` |
| Tuteurs / responsables (guardians) | **DONE** | **DONE** | **TODO** | attach/detach + pivot |
| Inscription / réinscription annuelle | **PARTIAL** | **PARTIAL** | **TODO** | via enrollments + règles à formaliser |
| Import élèves (CSV/Excel) | **DONE** | **DONE** | **TODO** | `POST /students/import` |
| Export liste élèves (CSV) | **DONE** | **DONE** | **TODO** | `GET /students/export` |
| Export liste élèves (Excel) | **DONE** | **DONE** | **TODO** | `GET /students/export.xlsx` |
| Règles métier “1 classe principale / an” | **PARTIAL** | n/a | **TODO** | à verrouiller côté API |
| Blocage inscription si dossier incomplet | **TODO** | **TODO** | **TODO** | pièces obligatoires + workflow |

---

## 4) LOT 3 — Gestion des enseignants

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| CRUD enseignant | **DONE** | **DONE** | **TODO** | `GET/POST/PATCH/DELETE /api/v1/teachers` |
| Affectation matières/classes | **DONE** | **PARTIAL** | **TODO** | `teacher-class-subjects` endpoints |
| Planning enseignant | **DONE** | **DONE** | **TODO** | `GET /teachers/{id}/schedule` |
| Historique RH (contrats, docs) | **PARTIAL** | **PARTIAL** | **TODO** | dépend documents + modèles RH |
| Règles métier (pas de double cours) | **PARTIAL** | n/a | **TODO** | contrôle conflits à renforcer |

---

## 5) LOT 4 — Notes et bulletins

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Saisie notes (unitaire) | **DONE** | **DONE** | **TODO** | `POST /api/v1/grades` |
| Saisie notes (bulk) | **DONE** | **DONE** | **TODO** | `POST /api/v1/grades/bulk` |
| Recalcul moyennes / pondération | **DONE** | **PARTIAL** | **TODO** | `POST /api/v1/grades/recalculate` |
| Paramétrage évaluations / coefficients avancés | **PARTIAL** | **PARTIAL** | **TODO** | bases présentes, règles à enrichir |
| Classement classe (analytics) | **DONE** | **DONE** | **TODO** | `GET /api/v1/grades/class-ranking` |
| Génération bulletins | **DONE** | **DONE** | **TODO** | `POST /api/v1/report-cards/generate` |
| Publication / archivage bulletin | **DONE** | **DONE** | **TODO** | `POST publish`, `POST archive` |
| Export PDF bulletin | **DONE** | **DONE** | **TODO** | `GET /api/v1/report-cards/{id}/pdf` |
| Export Excel notes | **DONE** | **TODO** | **TODO** | `GET /api/v1/grades/export.xlsx` |
| Verrouillage périodes / override | **PARTIAL** | **PARTIAL** | **TODO** | permission `grades.override_lock` à appliquer finement |

---

## 6) LOT 5 — Absences et retards

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Marquage rapide par classe | **DONE** | **DONE** | **TODO** | bulk endpoint existant |
| CRUD absences/retards | **DONE** | **DONE** | **TODO** | `attendance-records` |
| Justification (après-coup) | **DONE** | **DONE** | **TODO** | justification logs |
| Statistiques assiduité | **DONE** | **DONE** | **TODO** | `GET /api/v1/attendance/stats` |
| Alertes automatiques (seuils) | **PARTIAL** | **PARTIAL** | **TODO** | `AttendanceAlertService` à compléter selon cahier |
| Export Excel absences | **DONE** | **TODO** | **TODO** | `GET /attendance-records/export.xlsx` |

---

## 7) LOT 6 — Emploi du temps

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Planification créneaux | **DONE** | **DONE** | **TODO** | schedule entries endpoints |
| Vue hebdo par classe | **DONE** | **DONE** | **TODO** | `GET /api/v1/schedule/weekly` |
| Vues par salle / prof / classe | **DONE** | **PARTIAL** | **TODO** | endpoints présents, UX à enrichir |
| Détection conflits (salle/prof) | **PARTIAL** | n/a | **TODO** | validations à durcir (chevauchements) |
| Exceptions ponctuelles | **TODO** | **TODO** | **TODO** | changements “one-off” non couverts |

---

## 8) LOT 7/8 — Finance, compta, facturation

### Entrées / paiements
| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Enregistrer paiement | **DONE** | **DONE** | **TODO** | `POST /api/v1/payments` |
| Reçu PDF paiement | **DONE** | **DONE** | **TODO** | `GET /api/v1/payments/{id}/receipt` |
| Annulation paiement | **DONE** | **DONE** | **TODO** | `POST /api/v1/payments/{id}/cancel` |
| Exports paiements (Excel) | **DONE** | **DONE** | **TODO** | `GET /finance/payments/export.xlsx` |

### Sorties / dépenses
| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| CRUD dépenses | **DONE** | **DONE** | **TODO** | `GET/POST/PATCH/DELETE /api/v1/expenses` |
| Catégories dépenses | **DONE** | **DONE** | **TODO** | expense categories |
| Export dépenses Excel | **DONE** | **DONE** | **TODO** | `GET /finance/expenses/export.xlsx` |

### Factures
| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Création facture + items | **DONE** | **PARTIAL** | **TODO** | `POST /api/v1/invoices` |
| Annulation facture | **DONE** | **PARTIAL** | **TODO** | `POST /api/v1/invoices/{id}/cancel` |
| PDF facture | **DONE** | **TODO** | **TODO** | `GET /api/v1/invoices/{id}/pdf` |

### Reporting finance
| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Dashboard finance | **DONE** | **DONE** | **TODO** | `GET /api/v1/finance/dashboard` |
| Courbe paiements par période | **DONE** | **PARTIAL** | **TODO** | `GET /api/v1/finance/payments-by-period` |
| Rapport synthèse PDF | **DONE** | **DONE** | **TODO** | `GET /api/v1/finance/summary/report.pdf` |

### Comptabilité (écritures, journaux)
| Fonction | Backend | Frontend | QA | Notes |
|---|---:|---:|---:|---|
| Écritures comptables / plan comptable | **TODO** | **TODO** | **TODO** | non implémenté |
| Rapprochement / ventilation | **TODO** | **TODO** | **TODO** | non implémenté |

---

## 9) LOT 9 — Documents (GED)

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| Upload documents (contraintes mime/taille) | **DONE** | **DONE** | **TODO** | `POST /api/v1/documents` + config `documents.upload.*` |
| Téléchargement sécurisé | **DONE** | **DONE** | **TODO** | endpoint download + access log |
| Liens entités (élève/prof/facture/paiement/dépense) | **DONE** | **DONE** | **TODO** | 1 seule entité par doc |
| Traçabilité accès (access logs) | **PARTIAL** | n/a | **TODO** | existant côté backend |
| Versioning / suppression logique renforcée | **TODO** | **TODO** | **TODO** | non implémenté |
| Documents obligatoires (workflow) | **TODO** | **TODO** | **TODO** | non implémenté |

---

## 10) Annonces, notifications, traçabilité (transverse)

| Fonction | Backend | Frontend | QA | Notes / preuves |
|---|---:|---:|---:|---|
| CRUD annonces + audience | **DONE** | **DONE** | **PARTIAL** | `GET/POST/PATCH/DELETE /api/v1/announcements` |
| Statuts annonces draft/published/archived | **DONE** | **DONE** | **TODO** | colonnes garanties via migrations |
| Centre notifications + badge non lues | **DONE** | **DONE** | **TODO** | `GET /internal-notifications`, `/dashboard/indicators` |
| Marquer une notification lue | **DONE** | **DONE** | **TODO** | `POST /internal-notifications/{id}/read` |
| Marquer tout comme lu | **DONE** | **DONE** | **TODO** | `POST /internal-notifications/read-all` |
| Notifications système “modules critiques” | **PARTIAL** | n/a | **TODO** | paiements/factures/annonces OK, reste à compléter |
| Audit logs lisibles par admins | **DONE** | **DONE** | **TODO** | `GET /audit-logs` |

---

## 11) Paramétrage établissement

| Fonction | Backend | Frontend | QA | Notes |
|---|---:|---:|---:|---|
| Années scolaires | **DONE** | **DONE** | **TODO** | |
| Niveaux | **DONE** | **DONE** | **TODO** | |
| Classes | **DONE** | **DONE** | **TODO** | |
| Matières | **DONE** | **DONE** | **TODO** | |
| Périodes/terms & périodes d’évaluation | **DONE** | **DONE** | **TODO** | |
| Salles | **DONE** | **DONE** | **TODO** | |
| Horaires ouverture / jours ouvrables | **TODO** | **TODO** | **TODO** | non implémenté |
| Seuils alertes absences | **TODO** | **TODO** | **TODO** | non implémenté (à rendre configurable) |
| Paramètres financiers (modes paiement, frais, modèles) | **PARTIAL** | **PARTIAL** | **TODO** | fee types OK, reste à compléter |
| Branding (logo entête, signatures) | **TODO** | **TODO** | **TODO** | à définir pour PDF |

---

## 12) Reporting & exports attendus (récap)

| Domaine | Export Excel | Export PDF | Statut global |
|---|---:|---:|---|
| Élèves | **DONE** (`/students/export.xlsx`) | **TODO** (fiche élève) | **PARTIAL** |
| Absences | **DONE** (`/attendance-records/export.xlsx`) | **TODO** | **PARTIAL** |
| Notes | **DONE** (`/grades/export.xlsx`) | **DONE** (bulletins) | **PARTIAL** |
| Paiements | **DONE** (`/finance/payments/export.xlsx`) | **DONE** (reçu) | **DONE** |
| Dépenses | **DONE** (`/finance/expenses/export.xlsx`) | **TODO** | **PARTIAL** |
| Factures | n/a | **DONE** (`/invoices/{id}/pdf`) | **PARTIAL** |
| Synthèse finance | n/a | **DONE** (`/finance/summary/report.pdf`) | **DONE** |

---

## 13) Portail Parent/Élève (phase optionnelle)

| Fonction | Backend | Frontend | QA | Notes |
|---|---:|---:|---:|---|
| Accès parents/élèves | **TODO** | **TODO** | **TODO** | hors périmètre V1 actuel |
| Consultation notes/bulletins/absences/EDT | **TODO** | **TODO** | **TODO** | |
| Consultation factures/reçus | **TODO** | **TODO** | **TODO** | |

---

## 14) Checklist “flux métier” (acceptance)

### Flux inscription élève
- [ ] Préinscription + validation dossier (pièces obligatoires)
- [ ] Affectation classe (1 principale / année)
- [ ] Définition frais / échéancier
- [ ] Activation statut élève

### Flux saisie des notes
- [ ] Accès enseignant limité à ses classes/matières
- [ ] Grille saisie + validation + verrouillage période
- [ ] Génération bulletin après clôture

### Flux absences
- [ ] Marquage rapide + justificatif après-coup
- [ ] Seuils paramétrables + alertes automatiques

### Flux financier
- [x] Paiement → mise à jour statut → reçu PDF → audit/log
- [ ] Gestion complète factures périodiques (mensualités, etc.)
- [ ] Avoirs / régularisations (workflow)

### Flux emploi du temps
- [ ] Contrôle strict conflits (salle/prof) + exceptions ponctuelles

---

## 15) Prochaines priorités recommandées (pour passer de PARTIAL à DONE)

1. **Règles métier “strictes”** (EDT conflits, 1 classe principale/an, droits enseignant sur notes/absences)
2. **Paramétrage** (seuils alertes, horaires, modèles PDF, modes paiement)
3. **Reporting avancé** (imayés, performances, documents manquants/expirés)
4. **QA** : cas métier + tests permission (403) + tests génération PDF/Excel

---

## 16) Matrice de visibilité — Mode simple vs Mode avancé

Source de vérité pour masquer la complexité quand `SimpleModeContext.simpleMode === true`.
Tout ce qui est « ❌ simple » est masqué par rendu conditionnel (`!simpleMode`) ou gardé par `<RequireAdvancedMode>`.

### Navigation / layout

| Élément | Simple | Avancé | Mécanisme |
|---|:-:|:-:|---|
| Sidebar dédiée (`SimpleSidebar`) | ✅ | — | `AdminLayout` branche |
| Paramétrage / utilisateurs / audit / EDT / stats présence / classement | ❌ | ✅ | `RequireAdvancedMode` + sidebar |
| Toggle simple/avancé dans le header | ✅ (admins) | ✅ | `AppHeader` |
| Notifications dans le header | ✅ | ✅ | permission `notifications.view` |

### Dashboard (`/`)

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Page rendue | `SimpleDashboardPage` (hero, quick actions, KPI sobres) | `DashboardPage` (ERP complet) |

### Élèves

#### Liste `/eleves`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Recherche (nom / code) | ✅ | ✅ |
| Filtres statut / année / niveau / classe | ❌ | ✅ |
| Import CSV / Excel | ❌ | ✅ |
| Export CSV | ❌ | ✅ |
| Export Excel | ✅ (bouton « Exporter ») | ✅ |
| Colonnes : Code, Statut | ❌ | ✅ |
| Colonnes : Élève (avatar + lien), Actions | ✅ | ✅ |

#### Création / édition

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Formulaire rendu | `QuickStudentForm` (prénom, nom, naissance, code, 3 tél parents, adresse) | `StudentFormPage` (complet) |

#### Fiche `/eleves/:id`

| Onglet | Simple | Avancé |
|---|:-:|:-:|
| Infos générales | ✅ | ✅ |
| Inscription | ❌ | ✅ |
| Historique | ❌ | ✅ |
| Documents | ✅ | ✅ |
| Notes | ❌ | ✅ |
| Absences | ✅ | ✅ |
| Finance | ❌ | ✅ |

### Enseignants

#### Liste `/enseignants`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Recherche | ✅ | ✅ |
| Filtre Statut | ❌ | ✅ |
| Filtre Type de contrat | ❌ | ✅ |
| Colonne Matricule | ❌ | ✅ |
| Colonne Nom | ✅ | ✅ |
| Colonnes Statut / Contrat | ❌ | ✅ |
| Actions (Modifier / Supprimer) | ✅ | ✅ |

#### Fiche `/enseignants/:id`

| Onglet | Simple | Avancé |
|---|:-:|:-:|
| Profil | ✅ | ✅ |
| Matières | ❌ | ✅ |
| Classes | ❌ | ✅ |
| Planning | ❌ | ✅ |
| Documents | ✅ | ✅ |
| Observations | ❌ | ✅ |

### Assiduité

| Route | Simple | Avancé |
|---|:-:|:-:|
| `/assiduite/marquage` | `SimpleAttendancePage` (toggles géants, onglets Élèves/Enseignants) | `AttendanceQuickClassPage` |
| `/assiduite/stats` | ❌ (route bloquée `RequireAdvancedMode`) | ✅ |

### Finance

| Route | Simple | Avancé |
|---|:-:|:-:|
| `/finance` (défaut) | `SimpleFinancePage` (journal de caisse minimal) | `FinanceDashboardPage` (KPI, exports, PDF, impayés) |
| `/finance/paiements` | ❌ (route bloquée `RequireAdvancedMode`) | ✅ |
| Sidebar : entrée « Caisse » | ✅ | (n/a) |

### Documents `/documents`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Upload (fichier + titre) | ✅ | ✅ |
| Filtres Catégorie / Type | ❌ | ✅ |
| Colonnes Catégorie / Type / Mime | ❌ | ✅ |
| Colonnes Titre / Taille / Actions | ✅ | ✅ |
| Preview / Télécharger / Supprimer | ✅ | ✅ |

### Bulletins

#### Liste `/bulletins`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Filtres Année / Classe / Période | ✅ | ✅ |
| Filtre Statut | ❌ | ✅ |
| Bouton « 🎨 Modèle » (éditeur template) | ❌ | ✅ |
| Bouton Générer | ✅ | ✅ |
| Colonnes # id / Statut | ❌ | ✅ |
| Colonnes Élève / Moyenne / Rang / Abs-Ret / PDF | ✅ | ✅ |

#### Détail `/bulletins/:id`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Télécharger PDF | ✅ | ✅ |
| Publier / Archiver | ❌ | ✅ |
| Statut affiché | ❌ | ✅ |
| Table « Moyennes par matière (IDs) » | ❌ | ✅ |
| Cartes Moyenne / Rang / Abs / Retards | ✅ | ✅ |

### Communications

#### Annonces `/communications/annonces`

| Élément | Simple | Avancé |
|---|:-:|:-:|
| Colonnes Public / Statut / Période | ❌ | ✅ |
| Actions Publier / Archiver | ❌ | ✅ |
| Actions Modifier / Supprimer | ✅ | ✅ |

#### Formulaire annonce

| Champ | Simple | Avancé |
|---|:-:|:-:|
| Titre | ✅ | ✅ |
| Contenu | ✅ | ✅ |
| Public (audience) | ❌ (forcé `all`) | ✅ |
| Classe ciblée | ❌ | ✅ |
| Dates début / fin | ❌ (illimité) | ✅ |
| Statut brouillon / publié / archivé | ❌ (case « Publier immédiatement ») | ✅ |

#### Notifications `/communications/notifications`

Identique dans les deux modes (liste + tout marquer lu).

#### Audit `/communications/audit`

❌ en simple (`RequireAdvancedMode`), ✅ en avancé.

### Paramétrage `/parametrage/*` & Utilisateurs `/utilisateurs/*` & Emploi du temps `/emploi-du-temps`

❌ en simple (bloqué par `RequireAdvancedMode`), ✅ en avancé.

---

## 17) Implémentation — détails techniques

### Hook / contexte
- `useSimpleMode()` renvoie `{ simpleMode, canToggle, setSimpleMode }` depuis `SimpleModeContext` (déjà en place).
- Basculer : bouton dans `AppHeader` (admins) ou setting global `simple_mode_enabled` côté backend.

### Garde-fous de route
- `<RequireAdvancedMode>` (déjà en place) redirige vers `/` lorsqu'on tente d'accéder à une route avancée en simple.

### Nouveau branchement
- `/finance` → composant `FinanceHome` qui choisit `SimpleFinancePage` ou `FinanceDashboardPage` selon `simpleMode` (comme `DashboardHome` et `AttendanceMarkingHome`).
- `/finance/paiements` passe désormais derrière `RequireAdvancedMode` pour éviter qu'un lien direct expose l'écran ERP en simple.

### Pages modifiées (rendu conditionnel)

| Fichier | Type de masquage |
|---|---|
| `src/pages/eleves/StudentDetailPage.tsx` | `allTabs.filter(t => t.simple)` (3 onglets au lieu de 7) |
| `src/pages/enseignants/TeachersListPage.tsx` | Filtres + 3 colonnes conditionnels |
| `src/pages/enseignants/TeacherDetailPage.tsx` | `allTabs.filter(t => t.simple)` (2 onglets au lieu de 6) |
| `src/pages/documents/DocumentsPage.tsx` | Filtres + colonnes Catégorie/Type/Mime masquées |
| `src/pages/communications/AnnouncementsListPage.tsx` | 3 colonnes + Publier/Archiver masqués |
| `src/pages/communications/AnnouncementFormPage.tsx` | Audience/Classe/Dates/Statut masqués, remplacés par « Publier immédiatement » ; payload neutralisé côté client |
| `src/pages/bulletins/ReportCardsListPage.tsx` | Filtre Statut + colonnes #/Statut masqués |
| `src/pages/bulletins/ReportCardDetailPage.tsx` | Publier/Archiver/Statut + table matières masqués |
| `src/App.tsx` | `FinanceHome` + garde sur `/finance/paiements` |

### Principe
- Aucun endpoint backend supprimé : tout reste accessible en mode avancé.
- Les valeurs par défaut en simple (annonce `audience=all`, `status=published`, pas de dates) garantissent des payloads valides sans exposer de champs techniques.
- Tests possibles : basculer le toggle du header ; vérifier que chaque page du tableau ci-dessus se simplifie sans régression.

