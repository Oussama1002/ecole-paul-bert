## Fix: unify “Bulletins” on one canonical source

### Goal
Expose **one** coherent concept in the product: **“Bulletins”**.

Constraints:
- Do not delete legacy tables.
- Do not break existing data.
- Avoid having two generation pipelines.

### Current state (what exists)
- **Legacy DB table**: `bulletins` (present in the base SQL dump)
  - Not used by current Laravel app code.
- **Canonical app table**: `report_cards`
  - Used by `ReportCardService` and `ReportCardController`.
  - PDF generation uses `resources/views/report-cards/pdf.blade.php`.

### Decision (canonical source of truth)
- **Canonical**: `report_cards`
- **Legacy/read-only**: `bulletins` (kept for historical/compatibility only)

Rationale (safety):
- All current generation logic (grade calculation, ranking, attendance counts, PDF) already writes to `report_cards`.
- There is no active backend write-path to the `bulletins` table, so keeping it avoids data loss and avoids duplicate generation.

### Changes implemented
- **Backend compatibility routes**: added `/api/v1/bulletins/*` aliases that route to the existing `ReportCardController` methods.
  - This keeps the UI language (“Bulletins”) consistent without introducing a second table or a second generation pipeline.
  - Canonical endpoints `/api/v1/report-cards/*` remain supported.

### Frontend alignment
- Frontend routes already use `/bulletins` as the user-facing path, while calling the canonical API endpoints (`/v1/report-cards/*`).
- Added a dedicated sidebar emoji mapping for `/bulletins` for consistency.

### What we explicitly did NOT do (yet)
- No data backfill from `bulletins` → `report_cards` (only safe if field mapping + uniqueness rules are agreed).
- No deletion or renaming of tables.

