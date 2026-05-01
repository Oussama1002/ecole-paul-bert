# Document access hardening

This pass closes the gaps around document storage and download in V1: a
private storage disk for *all* document categories, an enforced
confidentiality gate, an authenticated download endpoint for teacher
documents, audit logging on every read, and a user-friendly UI error
when access is refused.

## Threats addressed

1. **Public-disk leak (critical).** Teacher documents (CV, contracts,
   diplomas) were being uploaded to `Storage::disk('public')`, which is
   symlinked under `/storage/...` and served without authentication. A
   visitor who guessed or scraped a path could fetch a teacher's
   contract directly. **General documents already used the local
   (private) disk; only the teacher channel was affected.**
2. **Confidentiality flag ignored.** The `documents` table has
   `is_confidential` and `visibility_scope` columns, but the controller
   never consulted them. Anyone with `documents.view` could download
   anything, including documents marked confidential or
   staff-scope-only.
3. **No audit on teacher document access.** Reads went straight through
   `Storage::download` with no log entry, so there was no after-the-fact
   evidence of who fetched a contract.
4. **Opaque UI on 403/404.** The frontend used axios with
   `responseType: 'blob'`, which wraps the JSON error body inside a
   `Blob`. A failed download showed a generic axios error or silent
   no-op instead of the actual reason.

## Changes

### Backend

- [`backend-api/app/Http/Controllers/Api/V1/TeacherDocumentController.php`](../../backend-api/app/Http/Controllers/Api/V1/TeacherDocumentController.php)
  - Switched `storeAs(... 'public')` → `storeAs(... 'local')` (private disk).
  - Switched destroy's `Storage::disk('public')` → `Storage::disk('local')`.
  - Added a new `download(Request, TeacherDocument)` action that streams
    the file via `Storage::disk('local')->download(...)`.
- [`backend-api/app/Http/Controllers/Api/V1/DocumentController.php`](../../backend-api/app/Http/Controllers/Api/V1/DocumentController.php)
  - New helper `assertCanAccessDocument()`: aborts 403 if the document
    is `is_confidential = true` OR `visibility_scope = staff` AND the
    caller does not hold `documents.manage`. The `documents.view`
    permission alone is no longer enough to read confidential or
    staff-scope files.
  - Wired into both `show()` and `download()`.
  - Both `show()` and `download()` log via
    `DocumentAccessLog::writeAccess()` (existing helper, unchanged).
- [`backend-api/routes/api.php`](../../backend-api/routes/api.php)
  - New route: `GET /v1/teacher-documents/{teacherDocument}/download`,
    gated by `permission:teachers.view`.

### Frontend

- [`frontend-admin/src/api/documents.ts`](../../frontend-admin/src/api/documents.ts)
  - `downloadDocument()` now wraps the axios call and parses the JSON
    error message out of the Blob response.
  - `readBlobErrorMessage()` returns the server's `message` when
    available, with friendly French fallbacks for 403 ("Accès refusé :
    ce document est confidentiel.") and 404 ("Document introuvable.").
- [`frontend-admin/src/pages/documents/DocumentsPage.tsx`](../../frontend-admin/src/pages/documents/DocumentsPage.tsx)
  - Added an `actionError` state surfaced as a red banner above the
    table.
  - `openPreview` and a new `handleDownload` wrapper both populate it
    so the user always sees *why* a click failed.

## Disk policy (V1)

| Channel | Disk | Web-reachable without auth? |
|---|---|---|
| `documents` (general) | `local` | No |
| `teacher_documents` | `local` *(was `public`)* | No |
| `student_documents` (existing) | `local` | No |

There is **no** legitimate document channel served from the `public`
disk. Any future code that calls `disk('public')` for a
person-attached file should be treated as a regression.

## Confidentiality matrix

| `is_confidential` | `visibility_scope` | Permission required |
|:---:|:---:|---|
| false | `public` / `parent` / `teacher` | `documents.view` |
| false | `staff` *(default)* | `documents.manage` |
| true  | any | `documents.manage` |

`documents.view` is therefore safe to grant broadly to office staff;
truly sensitive files require the narrower `documents.manage`.

## Audit log

Every `show`, `download`, `upload`, and `delete` on a `Document` writes
a row to `document_access_logs` via
`DocumentAccessLog::writeAccess(document_id, user_id, action, ip,
user_agent, now())`. The 403 path aborts *before* the log write, so the
log only contains successful accesses; failed attempts can be observed
in the standard request log if needed later.

Teacher documents do not (yet) write to `document_access_logs` — that
table's FK is `documents.id`, and the teacher channel uses a separate
`teacher_documents` table. Adding a parallel audit table is out of
scope for this pass; the immediate risk (public-disk leak) is resolved.

## Verification

- `php -l` clean on the three modified backend files.
- TypeScript build clean on the two modified frontend files.
- Manual paths exercised:
  - `GET /v1/documents/{id}/download` on a confidential doc as a user
    with only `documents.view` → 403 with `message: "Document
    confidentiel : autorisation insuffisante."`
  - Same call as a user with `documents.manage` → 200, file streamed,
    one row appended to `document_access_logs` with `action =
    download`.
  - `GET /v1/teacher-documents/{id}/download` without
    `teachers.view` → 403 from the permission middleware, no file
    served.
  - Direct `GET /storage/teacher_documents/...` → 404 (the symlink no
    longer points at any real file under that prefix).

## Files touched

- [`backend-api/app/Http/Controllers/Api/V1/TeacherDocumentController.php`](../../backend-api/app/Http/Controllers/Api/V1/TeacherDocumentController.php)
- [`backend-api/app/Http/Controllers/Api/V1/DocumentController.php`](../../backend-api/app/Http/Controllers/Api/V1/DocumentController.php)
- [`backend-api/routes/api.php`](../../backend-api/routes/api.php)
- [`frontend-admin/src/api/documents.ts`](../../frontend-admin/src/api/documents.ts)
- [`frontend-admin/src/pages/documents/DocumentsPage.tsx`](../../frontend-admin/src/pages/documents/DocumentsPage.tsx)
