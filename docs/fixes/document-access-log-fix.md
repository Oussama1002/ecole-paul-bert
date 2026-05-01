## Fix: `document_access_logs` schema mismatch

### Problem
The base MySQL schema (`backend-api/database/schema/paulbert_base_structure.sql`) defines:
- `action_type`, `ip_address`, `accessed_at`

But Laravel code previously wrote:
- `action`, `ip`, `created_at`

This caused **“unknown column”** errors on document `show/download/delete` in production environments initialized from the base SQL dump.

### Fix (implemented)
- **Backend code** now logs through `DocumentAccessLog::writeAccess(...)`, which detects supported columns and writes to:
  - base SQL columns (`action_type/ip_address/accessed_at`) when present
  - Laravel columns (`action/ip/created_at`) when present
  - or both (after the compatibility migration)
- **Document access is now logged for**:
  - `view` (Document `show`)
  - `download` (Document `download`)
  - `upload` (Document `store`)
  - `delete` (Document `destroy`)

### Migration (compatibility, additive)
Added `backend-api/database/migrations/2026_04_30_000030_align_document_access_logs_schema_variants.php` which:
- Ensures **both** column sets exist (no drops/renames)
- Backfills missing values from one column set to the other
- Intentionally does not drop columns on rollback (safe for production)

### Tests
- Added unit test `backend-api/tests/Unit/DocumentAccessLogPayloadTest.php` to assert the payload builder selects the correct columns per schema variant.

