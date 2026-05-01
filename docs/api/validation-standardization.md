# Standardisation validation & payloads API

## Objectif

Uniformiser la validation côté backend et rendre les erreurs exploitables côté frontend:

- mêmes structures JSON d'erreur pour l'API,
- messages de validation lisibles pour l'utilisateur,
- support clair des erreurs champ par champ.

## Audit rapide (état observé)

### Points déjà bons

- La majorité des modules métier utilisent déjà des `FormRequest`.
- Les réponses de succès passent par `ApiResponse::success(...)`.
- Le frontend centralise déjà l'extraction de message via `getApiErrorMessage(...)`.

### Écarts constatés

- Plusieurs endpoints gardaient de la validation inline (`$request->validate(...)`) dans les contrôleurs.
- Le message top-level sur `ValidationException` pouvait être technique ou trop générique.
- Le frontend ne disposait pas d'un helper explicite pour récupérer les erreurs par champ.

## Standard retenu

### Structure JSON erreur API

Tous les endpoints API doivent renvoyer:

```json
{
  "success": false,
  "message": "Message lisible",
  "errors": {
    "field.path": ["Message de validation"]
  }
}
```

Notes:

- `errors` vaut `{}` (objet vide) si aucun détail champ.
- `message` doit rester orienté utilisateur.

### Validation

- Préférer `FormRequest` pour les endpoints avec validation non triviale.
- Éviter la validation inline dans les contrôleurs (sauf cas exceptionnel ponctuel).
- Utiliser des messages FR lisibles via une base commune.

### Frontend

- Conserver un message global (`getApiErrorMessage`) pour bannière.
- Utiliser un mapping champ->erreurs (`getApiFieldErrors`) pour affichage sous les inputs.

## Implémentation réalisée

### Backend

- Ajout d'une base commune:
  - `backend-api/app/Http/Requests/Api/V1/BaseApiFormRequest.php`
- Migration de validation inline vers `FormRequest` sur endpoints clés:
  - Bulletins:
    - `IndexReportCardRequest`
    - `GenerateReportCardRequest`
    - `UpdateReportCardTemplateRequest`
  - Réglages simples école:
    - `UpdateSimpleSchoolSettingsRequest`
    - `UploadSimpleSchoolLogoRequest`
  - Finance simple:
    - `IndexSimpleFinanceJournalRequest`
    - `StoreSimpleFinanceEntryRequest`
    - `UpdateSimpleFinanceEntryRequest`
    - `SimpleFinanceSummaryRequest`
    - `ExportSimpleFinanceCsvRequest`
- Contrôleurs alignés pour utiliser `$request->validated()`:
  - `ReportCardController`
  - `ReportCardTemplateController`
  - `SimpleSchoolSettingsController`
  - `SimpleFinanceController`

### Normalisation globale des exceptions API

Mise à jour de `backend-api/bootstrap/app.php`:

- `ValidationException`:
  - message = premier message champ si disponible, sinon message générique lisible.
- Ajout d'un fallback `Throwable` pour API:
  - payload JSON uniforme (`success/message/errors`) sur erreur 500.

### Frontend

- Extension utilitaire:
  - `frontend-admin/src/utils/apiError.ts`
    - `getApiFieldErrors(error)` ajouté.
- Affichage champ par champ implémenté dans:
  - `frontend-admin/src/pages/settings/SimpleSchoolSettingsPage.tsx`
    - messages inline par champ (`school.*`, `bulletin.*`, `attendance_alerts.*`, `finance_journal.*`, etc.).

## Règles pratiques pour la suite

1. Tout nouvel endpoint API CRUD doit passer par un `FormRequest`.
2. Toute erreur API personnalisée doit garder le triplet `success/message/errors`.
3. Côté frontend, pour chaque formulaire important:
   - afficher un message global,
   - afficher les erreurs de champ quand disponibles.

## Résultat attendu pour l'utilisateur final

- Erreurs plus compréhensibles (sans jargon SQL/stack trace).
- Validation plus prévisible d'un écran à l'autre.
- Correction plus rapide des formulaires grâce au feedback champ par champ.
