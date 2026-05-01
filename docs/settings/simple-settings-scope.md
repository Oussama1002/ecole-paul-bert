# Simple Settings Scope

## Goal

Define what school staff can configure in **simple mode** without exposing technical/advanced administration screens.

## In Scope (Simple Mode)

The simple settings screen (`/ecole/parametres`) now includes:

- School identity: name, logo, address, city, phone, email
- Bulletin branding: bulletin title, signature line, footer line
- Current school year selector (active year)
- Attendance thresholds:
  - rolling window (days)
  - unjustified absences threshold
  - late arrivals threshold
- Simple finance categories (journal label suggestions):
  - income labels
  - expense labels
- Basic structure management links:
  - levels (`/ecole/parametres/niveaux`)
  - classes (`/ecole/parametres/classes`)
  - subjects (`/ecole/parametres/matieres`)

## Out of Scope / Hidden in Simple Mode

Still hidden or advanced-only:

- Advanced role/permission/user administration flows
- Technical notification/audit features
- Complex academic configuration pages (terms/evaluation periods/template internals)
- Advanced settings modules outside daily operations

## Visibility Rules Applied

- Notifications center route is advanced-only.
- Header notification shortcut is hidden in simple mode.
- Basic structure pages are exposed through simple-mode routes under `/ecole/parametres/*` with normal permission checks.
- Advanced `/parametrage/*` routes remain protected by advanced-mode guard.

## Behavior Wiring Verification

Settings now affect runtime behavior:

- **Current school year**: updates `school_years.is_current`, used as default context by simple dashboard and simple daily flows.
- **Attendance thresholds**: used by `AttendanceAlertService` to trigger absence/late alerts.
- **Finance categories (simple labels)**: used by simple finance journal form suggestions.
- **Bulletin branding + logo + school identity**: persisted via report card template support and rendered in bulletin PDF output.

## Notes

- Simple settings are intended for directors/admin staff and prioritize low-friction daily operations.
- Permissions are still enforced per feature (view/manage).
