# Schema drift audit (Laravel vs DB dump)

Scope: compare **Laravel app expectations** (migrations + models + controllers/services) versus the **actual MySQL schema** shipped in `backend-api/database/schema/paulbert_base_structure.sql` (loaded by `2026_04_01_000000_load_paulbert_base_structure.php`).

Legend:
- **Actual DB columns**: from `paulbert_base_structure.sql` (the “real DB snapshot” used by the project migration).
- **Laravel migration columns**: from the table-specific migrations in `backend-api/database/migrations/`.
- **Model fillable/casts**: from `backend-api/app/Models/`.
- **Controller/service assumptions**: code paths that read/write specific columns and values.
- **Risk**:
  - **P0**: runtime break, data loss, or security/permission hazard likely
  - **P1**: wrong data, silent truncation, inconsistent behavior
  - **P2**: low impact mismatch (types/lengths/indexes) or edge-case only

## Executive summary (high signal)

- **P0 drift (will break in environments created from the base SQL without running all later migrations)**:
  - `report_cards`, `internal_notifications`, `invoice_items`, `finance_journal_entries` are **not present** in the base structure SQL but **are used by the app** (controllers/services/models exist).
- **P0 drift (columns/values mismatch even when table exists)**:
  - `documents` in SQL is strict-enum and non-null heavy; app writes values like `document_type='file'` and `visibility_scope='staff'` that are **not valid** in the SQL enum set.
  - `document_access_logs` column names differ (`action_type`/`ip_address`/`accessed_at` in SQL vs `action`/`ip`/`created_at` in app).
  - `grades.evaluation_type_id` is **NOT NULL** in SQL but app writes it as **NULL** (bulk store) and Laravel migration defines it nullable.
- **Likely legacy tables** (present in SQL, not used by app code in `backend-api/app/`):
  - `bulletins`, `notifications`, `accounting_entries` (no models/controllers/services found for these).

---

## Table: `attendance_records`

### Actual DB columns (SQL)
- `id`
- `school_year_id` (NOT NULL)
- `term_id` (NULL)
- `class_id` (NOT NULL)
- `student_id` (NOT NULL)
- `subject_id` (NULL)
- `teacher_id` (NULL)
- `schedule_entry_id` (NULL)
- `attendance_date` (date, NOT NULL)
- `attendance_status` (enum: `present|absent|late|excused`, NOT NULL)
- `minutes_late` (int, NULL)
- `is_justified` (tinyint, default 0)
- `justification_note` (text, NULL)
- `justified_at` (datetime, NULL)
- `justified_by` (NULL)
- `marked_by` (NULL)
- `remarks` (text, NULL)
- `created_at`, `updated_at`

### Laravel migration columns
Source: `2026_04_13_090000_create_attendance_records_table.php`
- Same logical columns as above, but:
  - `attendance_status` is `string(20)` (not enum)
  - `minutes_late` is `unsignedSmallInteger` (not int)
  - `justified_at` is `timestamp` (not datetime)
  - Adds unique index `att_unique_student_session_date` on (`student_id`, `schedule_entry_id`, `attendance_date`)

### Model fillable/casts
Source: `app/Models/AttendanceRecord.php`
- **fillable**: `school_year_id`, `term_id`, `class_id`, `student_id`, `subject_id`, `teacher_id`, `schedule_entry_id`, `attendance_date`, `attendance_status`, `minutes_late`, `is_justified`, `justification_note`, `justified_at`, `justified_by`, `marked_by`, `remarks`
- **casts**: `attendance_date=date`, `is_justified=boolean`, `justified_at=datetime`

### Controller/service assumptions
Sources:
- `AttendanceRecordController`: filters by `attendance_status`, `is_justified`, dates; writes `attendance_status` values like `present|absent|late`; bulk upserts on (`student_id`, `schedule_entry_id` OR (`class_id`,`subject_id`), `attendance_date`)
- `DashboardDataService`: counts `attendance_status in ('absent','late','present')`
- `AttendanceAlertService`: only triggers for `absent|late`

### Mismatches
- **Enum vs string**: SQL uses enum with extra value `excused`; app doesn’t use `excused` but the DB allows it.
- **Unique key behavior**: app bulk upsert allows a “no schedule entry” uniqueness based on (`student_id`,`attendance_date`,`class_id`,`subject_id`), while migration unique index only covers the schedule-entry case.
- **Datetime vs timestamp** differences are minor.

### Risk level
- **P2** overall (mostly type/index drift; unlikely to break day-to-day usage).

### Proposed alignment (exact changes)
- **If you want DB to match app behavior** (recommended):
  - Add a second unique index for the “no schedule entry” path (optional, but prevents duplicates):

```php
Schema::table('attendance_records', function (Blueprint $table) {
    $table->unique(
        ['student_id', 'class_id', 'subject_id', 'attendance_date'],
        'att_unique_student_class_subject_date'
    );
});
```

- **If you want Laravel migration to match SQL enum**, change `attendance_status` to enum or validate allowed strings in requests (code change; defer).

---

## Table: `grades`

### Actual DB columns (SQL)
- `id`
- `school_year_id` (NOT NULL)
- `term_id` (NULL)
- `evaluation_period_id` (NOT NULL)
- `evaluation_type_id` (**NOT NULL**)
- `class_id` (NOT NULL)
- `student_id` (NOT NULL)
- `subject_id` (NOT NULL)
- `teacher_id` (NULL)
- `score` decimal(6,2) NOT NULL
- `max_score` decimal(6,2) default 20.00
- `weighted_score` decimal(8,2) NULL
- `coefficient` decimal(5,2) default 1.00
- `appreciation` text NULL
- `is_validated` tinyint default 0
- `validated_at` datetime NULL
- `validated_by` NULL
- `entered_by` NULL
- `created_at`, `updated_at`

### Laravel migration columns
Source: `2026_04_13_100000_create_grades_table.php`
- `evaluation_type_id` **nullable** (SQL is NOT NULL)
- `weighted_score` decimal(8,4) (SQL is 8,2)
- `coefficient` decimal(6,2) (SQL is 5,2)
- Adds unique index on (`evaluation_period_id`,`class_id`,`student_id`,`subject_id`)

### Model fillable/casts
Source: `app/Models/Grade.php`
- **fillable** includes `evaluation_type_id`, `weighted_score`, `coefficient`, etc.
- No explicit casts; controller treats decimals as strings/floats.

### Controller/service assumptions
Source: `GradeController`
- Bulk store explicitly writes `evaluation_type_id => null`.
- `weighted_score` computed and rounded to 4 decimals (`round(..., 4)`).

### Mismatches
- **P0**: `evaluation_type_id` NOT NULL in SQL vs **NULL in app** → inserts/updates will fail on real DB created from base SQL.
- **P1**: `weighted_score` precision in SQL (8,2) will silently truncate the 4-decimal computed value.
- **P2**: coefficient precision difference (5,2 vs 6,2) rarely matters.

### Risk level
- **P0**

### Proposed alignment (exact changes)
Recommended: align **DB** to **Laravel/app**, because current app code assumes nullable `evaluation_type_id` and 4-decimal weighted score.

Create a new migration (additive/alter only), e.g. `2026_04_30_000000_align_grades_to_app.php`:

```php
Schema::table('grades', function (Blueprint $table) {
    $table->unsignedBigInteger('evaluation_type_id')->nullable()->change();
    $table->decimal('weighted_score', 8, 4)->nullable()->change();
    $table->decimal('coefficient', 6, 2)->default(1)->change();
});
```

If `evaluation_type_id` is actually required for business rules, then the alternative is a code change: enforce it in requests and stop writing NULL (defer until business decision).

---

## Table: `documents`

### Actual DB columns (SQL)
- `id`
- `document_type` enum(`student_file`,`bulletin`,`exam`,`assignment`,`teacher_contract`,`teacher_file`,`invoice`,`receipt`,`payment_proof`,`expense_attachment`,`administrative`,`other`) **NOT NULL**
- `category` varchar(100) NULL
- `title` varchar(255) **NOT NULL**
- `description` text NULL
- `file_name` varchar(255) **NOT NULL**
- `file_path` varchar(255) **NOT NULL**
- `mime_type` varchar(100) NULL
- `file_size` bigint NULL
- `student_id` NULL
- `teacher_id` NULL
- `invoice_id` NULL
- `payment_id` NULL
- `expense_id` NULL
- `uploaded_by` NULL
- `is_confidential` tinyint default 0
- `visibility_scope` enum(`private`,`restricted`,`public_internal`) default `restricted`
- `status` enum(`active`,`archived`,`deleted`) default `active`
- `created_at`, `updated_at`

### Laravel migration columns
Source: `2026_04_13_140010_create_documents_table.php`
- `document_type` string(50) **nullable**
- `category` string(50) nullable
- `title` string(255) nullable
- `file_path` string(500) nullable
- `visibility_scope` string(50) nullable
- `status` string(20) default `active`
- Adds indexes on foreign keys and `is_confidential`

Also: `2026_04_13_150000_add_soft_deletes_to_documents_and_access_logs.php` adds `deleted_at` if missing.

### Model fillable/casts
Source: `app/Models/Document.php`
- **SoftDeletes enabled** (expects `deleted_at`)
- **fillable** includes `visibility_scope`, `status`, and all link columns
- **casts**: `is_confidential=boolean`, `file_size=integer`

### Controller/service assumptions
Source: `DocumentController`
- On create, writes defaults:
  - `category='general'`
  - `document_type='file'`
  - `visibility_scope='staff'`
  - `status='active'`
- Soft-deletes on destroy and also sets `status='deleted'`.

### Mismatches
- **P0**: SQL `document_type` enum does **not** include `file` (controller default) → insert fails.
- **P0**: SQL `visibility_scope` enum does **not** include `staff` (controller default) → insert fails.
- **P0/P1**: SQL requires `title`, `file_name`, `file_path` NOT NULL; app saves the record **before** storing file path/name (it sets title but relies on later storage step for `file_path`, `file_name`, `mime_type`), so a strict schema will fail early.
- **P0**: model uses SoftDeletes but SQL base structure has no `deleted_at` (migration exists to add it, but only if migrations ran).

### Risk level
- **P0**

### Proposed alignment (exact changes)
Recommended: align **DB** to **app/migration** by relaxing enums into varchars (keeps existing values, avoids future enum drift).

Create a new migration, e.g. `2026_04_30_000010_align_documents_to_app.php`:

```php
Schema::table('documents', function (Blueprint $table) {
    // Make types/scopes flexible (avoid enum drift)
    $table->string('document_type', 50)->nullable()->change();
    $table->string('visibility_scope', 50)->nullable()->change();
    $table->string('category', 100)->nullable()->change();

    // Allow create-then-store flow
    $table->string('title', 255)->nullable()->change();
    $table->string('file_name', 255)->nullable()->change();
    $table->string('file_path', 500)->nullable()->change();

    // Soft deletes expected by model
    if (! Schema::hasColumn('documents', 'deleted_at')) {
        $table->softDeletes();
    }
});
```

Alternative (if you want to keep enums): change controller defaults to match enum values and ensure `file_name/file_path` are set before first save (code change; defer).

---

## Table: `document_access_logs`

### Actual DB columns (SQL)
- `id`
- `document_id` (NOT NULL)
- `user_id` (NULL)
- `action_type` enum(`view`,`download`,`upload`,`update`,`delete`) NOT NULL
- `ip_address` varchar(45) NULL
- `user_agent` text NULL
- `accessed_at` datetime NOT NULL default current_timestamp

### Laravel migration columns
Source: `2026_04_13_150000_add_soft_deletes_to_documents_and_access_logs.php`
- Creates table (only if missing) with:
  - `document_id`, `user_id`
  - `action` string(30)
  - `ip` string(45)
  - `user_agent` string(500)
  - `created_at` timestamp useCurrent
  - no `updated_at`

### Model fillable/casts
Source: `app/Models/DocumentAccessLog.php`
- `public $timestamps = false`
- **fillable**: `document_id`, `user_id`, `action`, `ip`, `user_agent`, `created_at`
- **casts**: `created_at=datetime`

### Controller/service assumptions
Source: `DocumentController::logAccess()`
- Writes `action`, `ip`, `user_agent`, `created_at`.

### Mismatches
- **P0**: SQL columns are named `action_type`, `ip_address`, `accessed_at`; app writes `action`, `ip`, `created_at` → insert fails (unknown columns).
- **P1**: SQL defines `user_agent` as `text`; app assumes 500 chars and truncates to 500 (fine).

### Risk level
- **P0**

### Proposed alignment (exact changes)
Recommended: preserve existing SQL columns **and** add app-expected columns as a bridge (no deletion, no data loss).

Create a new migration, e.g. `2026_04_30_000020_bridge_document_access_logs_columns.php`:

```php
Schema::table('document_access_logs', function (Blueprint $table) {
    if (! Schema::hasColumn('document_access_logs', 'action')) {
        $table->string('action', 30)->nullable()->index();
    }
    if (! Schema::hasColumn('document_access_logs', 'ip')) {
        $table->string('ip', 45)->nullable();
    }
    if (! Schema::hasColumn('document_access_logs', 'created_at')) {
        $table->timestamp('created_at')->nullable();
    }
});
```

Then a **one-time backfill** (in the same migration `up()` using DB::statement/DB::table):
- `action = action_type`
- `ip = ip_address`
- `created_at = accessed_at`

Longer-term cleanup (optional): switch the app to use the SQL-native columns and rename for consistency (code change; defer).

---

## Table: `bulletins`

### Actual DB columns (SQL)
- `id`
- `school_year_id`, `term_id` (NULL)
- `evaluation_period_id`
- `class_id`, `student_id`
- `bulletin_number`
- `average_score` decimal(8,2) default 0.00
- `rank_position` int NULL
- `total_absences` int default 0
- `total_lates` int default 0
- `conduct_grade` varchar(50) NULL
- `teacher_comment` text NULL
- `principal_comment` text NULL
- `council_decision` varchar(255) NULL
- `pdf_path` varchar(255) NULL
- `generated_at` datetime NULL
- `generated_by` NULL
- `status` enum(`draft`,`generated`,`published`,`archived`) default `draft`
- `created_at`, `updated_at`

### Laravel migration columns
- No dedicated Laravel `Schema::create('bulletins')` migration found.
- Table is introduced via the base SQL loader migration (`2026_04_01_000000_load_paulbert_base_structure.php`).

### Model fillable/casts
- No `Bulletin` model found in `backend-api/app/Models`.

### Controller/service assumptions
- No controller/service references to `bulletins` table found in `backend-api/app/`.

### Mismatches
- Not a drift mismatch; rather a **domain duplication** with `report_cards` (see task 2) where code uses `report_cards` but SQL still contains `bulletins`.

### Risk level
- **P1** (data duplication/confusion risk; low runtime risk if unused).

### Proposed alignment (exact changes)
- Keep as **legacy/read-only**.
- Optional: create a DB view or a bridging service later if you need to read historic bulletins from the director UI (defer until canonical decision is implemented).

---

## Table: `report_cards`

### Actual DB columns (SQL)
- **Not present** in `paulbert_base_structure.sql`.

### Laravel migration columns
Source: `2026_04_13_110000_create_report_cards_table.php`
- `id`
- `school_year_id`, `term_id` nullable
- `evaluation_period_id`, `class_id`, `student_id`
- `subject_averages` json nullable
- `period_average` decimal(6,2) nullable
- `rank`, `rank_out_of` integers nullable
- `absent_count`, `late_count` integers default 0
- status (`draft|published|archived`) default `draft`
- `generated_at/by`, `published_at/by`, `archived_at/by`
- `pdf_path` string(500) nullable
- `created_at`, `updated_at`
- unique (`evaluation_period_id`, `class_id`, `student_id`)

### Model fillable/casts
Source: `app/Models/ReportCard.php`
- **fillable** matches migration.
- **casts**: `subject_averages=array`, timestamps as datetime.

### Controller/service assumptions
Source: `ReportCardController` + `ReportCardService` (service not audited line-by-line here)
- Reads/writes `pdf_path`, status transitions, generates PDFs on demand.

### Mismatches
- **P0** if DB is initialized only from base SQL dump without running migrations: table missing but API routes/controllers exist.

### Risk level
- **P0**

### Proposed alignment (exact changes)
- Ensure the environment setup *always runs migrations* after importing base structure.
  - Operational fix: in deployment docs / install script, enforce `php artisan migrate` after any SQL import.
- Optional safety migration (non-breaking):
  - Add a guard migration that checks presence and creates table if missing (already done by `create_report_cards_table` migration).

---

## Table: `notifications`

### Actual DB columns (SQL)
- `id`
- `user_id` (NOT NULL)
- `title` (NOT NULL)
- `message` (NOT NULL)
- `notification_type` enum(`info`,`warning`,`error`,`success`) default `info`
- `reference_type` varchar(100) NULL
- `reference_id` NULL
- `is_read` tinyint default 0
- `read_at` datetime NULL
- `created_at`, `updated_at`

### Laravel migration columns
- No dedicated migration found; table exists via base SQL loader.

### Model fillable/casts
- No `Notification` model found; app uses `InternalNotification` instead.

### Controller/service assumptions
- App notification dispatch (`SystemNotificationDispatcher`, `AttendanceAlertService`, `InvoiceController`) writes to `internal_notifications`, not `notifications`.

### Mismatches
- Not used by app → drift is “domain duplication”, not schema mismatch.

### Risk level
- **P2** (safe to keep as legacy).

### Proposed alignment (exact changes)
- Keep as legacy/read-only. If it is used by an older frontend, plan a bridge to `internal_notifications` (see task 2).

---

## Table: `internal_notifications`

### Actual DB columns (SQL)
- **Not present** in `paulbert_base_structure.sql`.

### Laravel migration columns
Source: `2026_04_13_090020_create_internal_notifications_table.php`
- `id`
- `user_id` (indexed)
- `type` (indexed), `title`, `body` nullable, `data` json nullable
- `read_at` nullable indexed
- `created_at`, `updated_at`
- `dedupe_key` unique nullable

### Model fillable/casts
Source: `app/Models/InternalNotification.php`
- **fillable** matches migration.
- **casts**: `data=array`, `read_at=datetime`.

### Controller/service assumptions
- `InternalNotificationController`, `DashboardDataService`, `AttendanceAlertService`, `SystemNotificationDispatcher` rely on this table existing.

### Mismatches
- **P0** missing table in base SQL snapshot.

### Risk level
- **P0**

### Proposed alignment (exact changes)
- Same as `report_cards`: ensure migrations are always executed after loading base schema.
- Optional: consider adding `Schema::hasTable('internal_notifications')` guards where read paths run during bootstrap (code change; defer).

---

## Table: `invoices`

### Actual DB columns (SQL)
- `id`
- `student_id` NULL
- `enrollment_id` NULL
- `school_year_id` NOT NULL
- `invoice_number` NOT NULL
- `invoice_type` enum(`student_fee`,`service`,`other`) default `student_fee`
- `issue_date` NOT NULL
- `due_date` NULL
- `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `amount_paid`, `amount_due` decimals
- `status` enum(`draft`,`issued`,`partial`,`paid`,`overdue`,`cancelled`) default `draft`
- `notes` text NULL
- `created_by` NULL
- `validated_by` NULL
- `created_at`, `updated_at`

### Laravel migration columns
- Base columns come from SQL loader.
- `2026_04_13_130010_create_invoices_and_items_tables.php` adds (if missing):
  - `cancelled_at` timestamp nullable
  - `cancelled_by` unsignedBigInteger nullable
  - `cancel_reason` text nullable

### Model fillable/casts
Source: `app/Models/Invoice.php`
- **fillable** includes `cancelled_at/by`, `cancel_reason`.
- **casts** include `cancelled_at=datetime`, and all money fields `decimal:2`.

### Controller/service assumptions
Source: `InvoiceController`
- Writes invoice items to `invoice_items`.
- Uses `cancelled_at/by/reason` in `cancel()` endpoint.
- `DashboardDataService` uses `status != cancelled` and `amount_due > 0` and due dates for overdue.

### Mismatches
- **P0** if migrations not run: `cancelled_*` columns missing and `invoice_items` missing → cancel endpoint and create endpoint break.
- **P1** possible status set mismatch: controller validates `status` in `index` as `draft|issued|partial|paid|cancelled` (SQL enum also contains `overdue`). Not breaking but inconsistent.

### Risk level
- **P0** in drifted environments; **P2** otherwise.

### Proposed alignment (exact changes)
- Ensure `2026_04_13_130010_create_invoices_and_items_tables.php` is executed in every environment.
- Consider aligning the status validation list to include `overdue` (code change; safe but defer per instruction).

---

## Table: `invoice_items`

### Actual DB columns (SQL)
- **Not present** in `paulbert_base_structure.sql`.

### Laravel migration columns
Source: `2026_04_13_130010_create_invoices_and_items_tables.php`
- `id`, `invoice_id`, `fee_assignment_id` nullable, `label`, `amount`, timestamps

### Model fillable/casts
Source: `app/Models/InvoiceItem.php`
- fillable: `invoice_id`, `fee_assignment_id`, `label`, `amount`
- casts: `amount=decimal:2`

### Controller/service assumptions
Source: `InvoiceController`
- Always creates invoice items when creating invoices.
- `downloadPdf()` loads `items`.

### Mismatches
- **P0** missing table in base SQL snapshot.

### Risk level
- **P0**

### Proposed alignment (exact changes)
- Ensure migrations run after base schema load (same pattern as above).

---

## Table: `accounting_entries`

### Actual DB columns (SQL)
- `id`
- `entry_date` date NOT NULL
- `entry_type` enum(`income`,`expense`,`adjustment`) NOT NULL
- `reference_type` enum(`payment`,`expense`,`invoice`,`manual`) NOT NULL
- `reference_id` NULL
- `description` text NOT NULL
- `debit_amount` decimal(12,2) default 0
- `credit_amount` decimal(12,2) default 0
- `account_code` varchar(50) NULL
- `account_label` varchar(150) NULL
- `created_by` NULL
- `created_at`, `updated_at`

### Laravel migration columns
- Exists via base SQL loader.
- No Eloquent model/controller usage found.

### Model fillable/casts
- None found.

### Controller/service assumptions
- None found in `backend-api/app/`.

### Mismatches
- Not schema drift; it’s a **parallel finance ledger** not wired to the app code.

### Risk level
- **P1** (duplicate sources of truth risk; see canonical decision doc).

### Proposed alignment (exact changes)
- Keep as legacy/read-only.
- If you later want to keep it current, implement a write-through bridge from `payments/expenses/invoices` to `accounting_entries` (code change; defer).

---

## Table: `finance_journal_entries` (simple finance journal)

### Actual DB columns (SQL)
- **Not present** in `paulbert_base_structure.sql`.

### Laravel migration columns
Source: `2026_04_21_000040_create_finance_journal_entries_table.php`
- `id`, `entry_date`, `entry_type`, `cost_type`, `label`, `amount`, `note`, `created_by`
- `created_at`, `updated_at`, `deleted_at` (soft deletes)

### Model fillable/casts
Source: `app/Models/FinanceJournalEntry.php`
- fillable matches migration; casts `entry_date=date`, `amount=decimal:2`.

### Controller/service assumptions
Source: `SimpleFinanceController`
- CRUD endpoints and summary aggregations on this table.

### Mismatches
- **P0** missing table in base SQL snapshot.

### Risk level
- **P0**

### Proposed alignment (exact changes)
- Ensure migrations run after base schema load.

