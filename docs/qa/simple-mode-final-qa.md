# Simple Mode Final QA — Paul Bert

Date: 2026-04-30  
Scope: final QA limited to Simple Mode user experience and permissions.

## Method used

- Static review of Simple Mode navigation, route guards, and page behavior in `frontend-admin`.
- Verification of permissions enforcement (`RequirePermission`, sidebar filtering, advanced-route redirection).
- Runtime backend flow validation with `php artisan qa:client-flow-test` (status: `passed`).
- Manual screenshot capture was not available in this CLI-only run.

## PASS/FAIL by page

- `"/"` (Accueil / simple dashboard): **PASS**
  - No raw IDs shown in visible KPI and action cards.
  - Actions point to valid simple workflows (`/eleves/nouveau`, `/assiduite/marquage`, `/finance`, `/bulletins`).
  - Dashboard numbers are understandable and labeled for non-technical users.

- `"/ecole/parametres"` (Réglages école): **PASS**
  - Functional, business-meaningful fields only.
  - No technical IDs visible in the UI.
  - Links for quick structure management point to valid simple routes.

- `"/eleves"`: **PASS**
  - Simple search-first UX, no advanced clutter.
  - Raw internal IDs are hidden from table columns in simple mode.
  - Core action links (`fiche`, `modifier`, `nouvel élève`) are valid.

- `"/eleves/nouveau"` and `"/eleves/:id/editer"` (quick form): **PASS**
  - Form is simplified and operational for director workflow.
  - No raw numeric IDs requested from users.

- `"/eleves/:id"` (fiche élève): **FAIL**
  - Blocker: in inscription list fallback labels can expose raw IDs (`Année #...`, `Classe #...`) when relational labels are missing.
  - This violates the “no raw IDs visible in forms/pages” criterion for Simple Mode.

- `"/assiduite/marquage"`: **PASS**
  - No broken links or dead actions observed.
  - Student attendance flow is direct and suitable for daily use.
  - Teacher attendance tab is available; useful, but should be validated against product intent (see recommendations).

- `"/bulletins"`: **FAIL**
  - Blocker: student name fallback can show `Élève #<id>` when class-scoped student lookup misses data.
  - Violates “no raw IDs visible” for Simple Mode.

- `"/bulletins/:id"`: **FAIL**
  - Blocker: header fallback can show `Bulletin #<id>` when student record is unavailable.
  - Violates “no raw IDs visible” for Simple Mode.

- `"/finance"` (journal simple): **PASS**
  - Simple-mode finance journal is coherent and actionable.
  - No advanced ERP screens exposed from this page.
  - Export and attachment actions are relevant to client usage.

- `"/enseignants"`: **PASS**
  - Simplified list in Simple Mode; advanced columns hidden.
  - Actions useful and consistent for school director.

- `"/enseignants/nouveau"` and `"/enseignants/:id/editer"` (quick form): **PASS**
  - No raw IDs requested in Simple Mode quick form.
  - Minimal onboarding fields are clear and useful.

- `"/enseignants/:id"` (fiche enseignant): **PASS**
  - Simple tabs limit advanced clutter.
  - Core tabs (profil/documents/observations) are useful and coherent.

- `"/communications/annonces"` and `"/communications/annonces/nouveau"`: **PASS**
  - Actions are functional and relevant in Simple Mode.
  - Advanced fields are hidden in simple mode form flow.

## Checklist verdict

- No raw IDs visible in forms/pages: **FAIL**
  - Fails in bulletins and student inscription fallbacks as noted above.
- No advanced ERP clutter: **PASS (with minor UX caveat)**
- No broken links: **PASS**
- All visible pages work: **PASS** (except blockers above on ID display quality)
- All visible actions useful to client: **PASS**
- Permissions work: **PASS**
  - Verified by route guards and simple sidebar permission filtering.
- Dashboard numbers understandable: **PASS**
- Core workflows smooth: **PASS**
  - Supported by `qa:client-flow-test` full flow success.

## Blockers

1. Raw ID fallback in student detail inscription tab (`Année #id`, `Classe #id`) in Simple Mode.
2. Raw ID fallback in bulletins list (`Élève #id`) in Simple Mode.
3. Raw ID fallback in bulletin detail title (`Bulletin #id`) in Simple Mode.

## Recommended fixes (priority order)

1. **P0** Replace all Simple Mode fallback labels that expose raw IDs with neutral user text:
   - `Année non renseignée`, `Classe non renseignée`, `Élève non renseigné`, `Bulletin de l’élève`.
2. **P1** Ensure report card list/detail always resolves student display via API payload, not class-scoped local lookup only.
3. **P2** Product clarification: confirm whether teacher attendance tab should remain in Simple Mode or be moved to Advanced Mode for stricter “minimal clutter” policy.
4. **P2** Optional polish: align announcements pages with the newer school UI components (`PageHeader`, `SectionTitle`, `LoadingState`, `ErrorState`, `EmptyState`) for consistency.

## Screenshots

- Not captured in this run (CLI-only execution environment).
- Recommended follow-up: take one screenshot per main Simple Mode page after P0 fixes to attach to handover.
