# Bilan Financier (mode direction)

Le module **Bilan Financier** fournit une vue de gestion (pas de comptabilité avancée) basée uniquement sur les tables existantes:

- `payments` (revenus confirmés)
- `expenses` (dépenses actives)
- `invoices` (impayés et paiements partiels)
- `students` (+ liens d'inscription via `enrollments`)

## Filtres

- `period_type`: `monthly` | `yearly` | `custom`
- `date_from`, `date_to`
- `school_year_id`

## Méthode de calcul

- **Total revenus**: somme de `payments.amount` où `status=confirmed`
- **Total dépenses**: somme de `expenses.amount` où `status=active`
- **Solde net**: revenus - dépenses
- **Impayés**: somme de `invoices.amount_due` pour `status in (issued, partial)` et `amount_due > 0`
- **Paiements partiels**: somme de `invoices.amount_paid` pour `status=partial`
- **Nouvelles inscriptions**: `students.registration_date` dans la période
- **Élèves sortis**: élèves supprimés (`deleted_at`) ou statut de sortie mis à jour dans la période

## Catégorisation revenus

Les revenus sont classés sans dupliquer les données, via les informations de facture/type de frais:

- Inscriptions
- Mensualités
- Transport
- Activités
- Autres revenus

## Catégorisation dépenses

Par `cost_type` + nom de catégorie:

- Fixes: salaires, transport, carburant/gazole, charges récurrentes
- Variables: assurance, comptabilité, factures, fournitures, réparations, autres

## Endpoints

- `GET /api/v1/finance/bilan`
- `GET /api/v1/finance/bilan/pdf`
- `GET /api/v1/finance/bilan/export.xlsx`

## Exports

- PDF: synthèse + sections revenus/dépenses + évolution mensuelle + solde final
- Excel: feuilles `Summary`, `Income`, `Expenses`, `Monthly Evolution`
