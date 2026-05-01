# Audit Log Coverage (Task 24)

## Scope

This pass audits sensitive business actions and ensures they are recorded in `audit_logs` with actionable metadata (`action`, actor, subject, `old_values`, `new_values`, request IP/user-agent).

## Current Coverage Matrix

- Student create/update/delete/withdraw
  - `student.created` in `StudentController@store`
  - `student.updated` in `StudentController@update`
  - `student.withdrawn` in `StudentController@update` when status becomes `withdrawn`
  - `student.deleted` in `StudentController@destroy` (soft-delete/archive flow)
- Teacher create/update/delete/archive
  - `teacher.created` in `TeacherController@store`
  - `teacher.updated` in `TeacherController@update`
  - `teacher.archived` in `TeacherController@update` when status moves to `inactive|suspended|left`
  - `teacher.deleted` in `TeacherController@destroy`
- Grade override / locked period change
  - `grades.override_closed_period` in `GradeController@ensurePeriodNotClosed` (when user has override permission)
  - `grades.locked_period_changed` in `EvaluationPeriodController@update` when `is_closed` changes
- Payment creation/cancellation
  - `payment.created` in `PaymentController@store`
  - `payment.cancelled` in `PaymentController@cancel`
- Invoice creation/cancellation
  - `invoice.created` in `InvoiceController@store`
  - `invoice.cancelled` in `InvoiceController@cancel`
- Document download/delete/archive
  - `document.downloaded` in `DocumentController@download`
  - `document.archived` in `DocumentController@destroy` (`status=deleted` soft-delete flow)
  - `document.created` in `DocumentController@store` (added for trace completeness)
- Settings update
  - `settings.updated` in:
    - `SimpleSchoolSettingsController@update`
    - `SimpleSchoolSettingsController@uploadLogo`
    - `AppSettingController@update` (simple/advanced mode toggle)
    - `ReportCardTemplateController@update`
    - `ReportCardTemplateController@reset`
- User/permission changes
  - `user.created` in `UserController@store`
  - `user.updated` in `UserController@update`
  - `user.role_changed` in `UserController@update` when `role_id` changes

## Old/New Values Policy

- For updates and cancellations, logs now capture targeted before/after fields.
- For setting changes, a structured snapshot is stored before and after update in `SimpleSchoolSettingsController`, and focused before/after values in `AppSettingController`.
- For destructive/archival actions, logs include both original identity/status fields and terminal state (`deleted`, `status`, `cancel_reason`, timestamps).

## Frontend Visibility (Advanced Mode Only)

- Audit UI route `/communications/audit` is wrapped by `RequireAdvancedMode` in `frontend-admin/src/App.tsx`.
- Access is also permission-gated by `audit_logs.view`.
- In simple mode, the application uses `SimpleSidebar` and does not expose audit navigation.

## Notes / Follow-up

- There is no dedicated endpoint for per-user granular permission assignment yet; current product model uses role-based permissions. Role changes are now explicitly audited via `user.role_changed`.
