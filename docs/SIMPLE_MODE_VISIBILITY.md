# Simple mode — visibility matrix (frontend)

This document describes what **école / secrétariat** users see in **Simple mode** versus **Advanced mode**, and where it is enforced in code.

Simple mode is a **UX layer** (`SimpleModeContext` + `GET/PATCH /v1/app-settings`). It is **not** a security boundary: RBAC still applies on every API call.

---

## Route-level (URL not reachable in simple mode)

| Route | Simple | Advanced | Enforcement |
|-------|--------|----------|-------------|
| `/` (dashboard) | `SimpleDashboardPage` | `DashboardPage` | `DashboardHome` in `App.tsx` |
| `/assiduite/marquage` | `SimpleAttendancePage` | `AttendanceQuickClassPage` | `AttendanceMarkingHome` |
| `/finance` | `SimpleFinancePage` | `FinanceDashboardPage` | `FinanceHome` |
| `/finance/paiements` | Redirect → `/` | `PaymentsListPage` | `RequireAdvancedMode` |
| `/assiduite/stats` | Redirect → `/` | `AttendanceStatsPage` | `RequireAdvancedMode` |
| `/notes/saisie-classe` | Redirect → `/` | `GradesBulkClassPage` | `RequireAdvancedMode` |
| `/notes/classement` | Redirect → `/` | `ClassRankingPage` | `RequireAdvancedMode` |
| `/communications/audit` | Redirect → `/` | `AuditLogsPage` | `RequireAdvancedMode` |
| `/utilisateurs*` | Redirect → `/` | Users CRUD | `RequireAdvancedMode` |
| `/parametrage/*` | Redirect → `/` | Paramétrage | `RequireAdvancedMode` |
| `/emploi-du-temps` | Redirect → `/` | `ScheduleWeeklyPage` | `RequireAdvancedMode` |
| `/bulletins` | Same page, simplified UI | Same page, full UI | `ReportCardsListPage` + `useSimpleMode` |
| `/bulletins/:id` | Same page, simplified UI | Same page, full UI | `ReportCardDetailPage` + `useSimpleMode` |
| `/eleves`, `/enseignants`, … | Same routes, simplified UI | Full UI | Per-page `useSimpleMode` |

---

## Module matrix (what stays visible)

### Dashboard

| Element | Simple | Advanced |
|---------|--------|----------|
| KPI tiles + revenue chart | Yes (`SimpleDashboardPage`) | Yes (`DashboardPage` — full KPIs, charts, alerts, shortcuts) |
| Year filter on dashboard | No | Yes |
| Alerts / shortcuts / announcements block | No | Yes |

### Students (`StudentsListPage`, `StudentFormPage`, `StudentDetailPage`)

| Element | Simple | Advanced |
|---------|--------|----------|
| Filters | Search only | Search + status + year + level + class |
| Import CSV / dual export | Hidden | Shown (per permissions) |
| Export | Excel only | CSV + Excel |
| Table columns | Nom (+ code under name), Actions | + Code column + Statut |
| New / edit form | `QuickStudentForm` (minimal fields) | Full `StudentFormPage` |
| Detail tabs | Infos, Documents, Absences | + Inscription, Historique, Notes, Finance |
| Infos tab — lieu / nationalité / adresse | Hidden | Shown |
| Inscription row — statuts académiques bruts | Hidden | Shown |

### Teachers (`TeachersListPage`, `TeacherFormPage`, `TeacherDetailPage`)

| Element | Simple | Advanced |
|---------|--------|----------|
| Filters | Search only | + Statut + type de contrat |
| Table columns | Nom (+ email), Actions | + Matricule + Statut + Contrat |
| Delete teacher | Hidden | Shown (managers) |
| New / edit | `QuickTeacherForm` | Full form (user link, salary, etc.) |
| Detail hero — matricule / statut pill | Hidden / reduced | Shown |
| Detail tabs | Profil, Documents | + Matières, Classes, Planning, Observations |
| Profil — statut, contrat, compte user, qualification | Hidden | Shown |
| Documents — type de document | Hidden (default type côté upload) | Shown |

### Attendance

| Element | Simple | Advanced |
|---------|--------|----------|
| Screen | `SimpleAttendancePage` (élèves par classe, présent/absent, FAB enregistrer) | `AttendanceQuickClassPage` (lignes + retards + remarques) |
| Marque enseignants (simple) | **Non** — retiré pour réduire la charge cognitive | Via autres flux / RH en mode avancé |
| Stats `/assiduite/stats` | Route bloquée | Oui |

### Finance

| Element | Simple | Advanced |
|---------|--------|----------|
| Screen | `SimpleFinancePage` (journal + tuiles mois) | `FinanceDashboardPage` + exports |
| Liste paiements `/finance/paiements` | Route bloquée | Oui |
| `PaymentsListPage` — filtre facture ID | Hidden | Shown |
| Journal simple — colonne « Nature » (fixe/variable) | Hidden (saisie toujours possible dans le formulaire) | N/A (écran différent) |

### Documents (`DocumentsPage`)

| Element | Simple | Advanced |
|---------|--------|----------|
| Filtres catégorie / type (texte libre) | Hidden | Shown |
| Table columns | Titre, taille, actions | + Catégorie + Type + Mime |
| Preview | Hidden | Shown |
| Upload / download / delete | Per permissions | Same |

### Bulletins

| Element | Simple | Advanced |
|---------|--------|----------|
| Filtre statut bulletins | Hidden | Shown |
| Colonne `#` id bulletin | Hidden | Shown |
| Colonne statut ligne | Hidden | Shown |
| Lien modèle PDF paramétrable | Hidden | Shown (lien paramétrage) |
| Liste élève | Nom + avatar (chargement classe) | + id technique si besoin |
| Détail bulletin — moyennes par matière | Hidden | Shown |
| Détail — publier / archiver | Hidden | Shown |

### Annonces (`AnnouncementsListPage`, `AnnouncementFormPage`)

| Element | Simple | Advanced |
|---------|--------|----------|
| Colonnes Public / Statut / Période | Hidden | Shown |
| Actions Publier / Archiver | Hidden | Shown (manage) |
| Formulaire — audience, dates, statut manuel | Simplifié (ex. audience `all`, dates null) | Complet |

### Notifications (`NotificationsCenterPage`)

| Element | Simple | Advanced |
|---------|--------|----------|
| Type technique (`n.type`) | Hidden | Shown |

### Settings / compte

| Element | Simple | Advanced |
|---------|--------|----------|
| Toggle Simple / Avancé (header) | Si rôle admin | Si rôle admin |
| Mot de passe (`/mot-de-passe`) | Même formulaire | Même formulaire |
| Paramétrage ERP | Routes bloquées | Complet |

---

## Implementation map (fichiers clés)

| Fichier | Rôle |
|---------|------|
| `frontend-admin/src/contexts/SimpleModeContext.tsx` | Flag + `setSimpleMode` |
| `frontend-admin/src/routes/RequireAdvancedMode.tsx` | Redirect `/` si `simpleMode` |
| `frontend-admin/src/App.tsx` | `DashboardHome`, `FinanceHome`, `AttendanceMarkingHome`, routes `RequireAdvancedMode` |
| `frontend-admin/src/layouts/AdminLayout.tsx` | `SimpleSidebar` vs `AppSidebar` |
| Pages listées dans la matrice ci-dessus | `useSimpleMode()` + branches JSX |

---

## Changelog (audit 2026-04)

- **`notes/saisie-classe`** : enveloppé dans `RequireAdvancedMode` (saisie de notes masquée en mode simple).
- **`SimpleAttendancePage`** : onglet / flux **enseignants** retiré — uniquement les **élèves**.
- **`StudentDetailPage`** : champs démographiques secondaires et libellés d’inscription techniques masqués en simple.
- **`DocumentsPage`** : bouton **Preview** masqué en simple.
- **`NotificationsCenterPage`** : type de notification masqué en simple.
- **`SimpleFinancePage`** : colonne **Nature** retirée du tableau du journal.

Pour ajouter une simplification sur une nouvelle page : importer `useSimpleMode`, puis `if (!simpleMode) { … }` ou `{!simpleMode && …}` autour des blocs avancés.
