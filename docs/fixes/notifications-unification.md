# Notifications Unification

## Canonical Source Decision

Canonical notification store is `internal_notifications`.

Rationale:

- it is the only application-managed notification table in this codebase
- it already powers notification center endpoints and unread indicators
- it supports deduplication (`dedupe_key`) and structured payloads (`data`)

## Backend Alignment

### Unified producers

- payment creation: `PaymentController` emits `payment.recorded` notifications
- absence thresholds: `AttendanceAlertService` now uses `SystemNotificationDispatcher` (with dedupe key)
- announcement publication: `AnnouncementController::broadcastPublished()` emits `announcement.published`

### Unified consumers

- notification center endpoints (`InternalNotificationController`) read from `internal_notifications`
- header unread badge (`/v1/dashboard/indicators`) uses unread count from `internal_notifications`
- dashboard alert feed now consumes only `internal_notifications` (no parallel computed alert source)

## Frontend Alignment

- notification center uses `/v1/internal-notifications` only
- unread badge uses `/v1/dashboard/indicators` only
- simple mode hides technical notification UI:
  - header notifications shortcut hidden in simple mode
  - notifications route guarded by `RequireAdvancedMode`

## UX Impact

- one canonical stream across center, badge, and dashboard alerts
- less duplicate messaging across different UI surfaces
- clearer behavior in simple mode (technical notification module hidden)

## Document-Missing Trigger

`document missing` trigger is not currently implemented as a distinct domain event in the existing document flow, so no automatic notification was added in this pass.
