# Friday Go/No-Go Checklist

Use this checklist for final readiness signoff before the event window.

## A) Infrastructure and config

- [ ] `wrangler.jsonc` has correct Worker, D1, and R2 names.
- [ ] D1 `database_id` is real (not placeholder).
- [ ] Required secrets are set:
  - [ ] `CLOUDFLARE_API_TOKEN`
  - [ ] `CLOUDFLARE_ACCOUNT_ID`
  - [ ] `ADMIN_TOKEN`
- [ ] `npm run check` passes from `/home/runner/work/crown-and-vow/crown-and-vow/marqrcam-bachelorette`.

## B) Data readiness

- [ ] Guest seed generated from final attendee CSV.
- [ ] Guest seed imported successfully into D1.
- [ ] Spot-check attendee lookup for expected names and duplicates.

## C) Core flow validation

- [ ] Guest lookup -> session issuance works.
- [ ] Live camera path works on at least one iOS + one Android device.
- [ ] Native camera fallback works on at least one iOS + one Android device.
- [ ] Keep/Retake capture-review flow works.
- [ ] Offline/spotty retry behavior verified.
- [ ] My Roll view/edit/delete/save flows verified.
- [ ] Darkroom save developed copy verified.
- [ ] Plus-one flow verified.
- [ ] Gallery list/lightbox/refresh verified.

## D) Admin validation

- [ ] Admin login/logout/reload persistence verified.
- [ ] Dashboard metrics load correctly.
- [ ] Capture pause/resume verified from guest side.
- [ ] Gallery visibility toggle verified.
- [ ] Photo moderation states (approved/private/hidden) verified.
- [ ] “Just between us” cannot be promoted to public gallery.
- [ ] CSV export verified.
- [ ] Original/developed download verified.

## E) Reliability and safety

- [ ] Read load test executed and within target thresholds.
- [ ] Controlled write rehearsal executed in non-production target.
- [ ] Retry/idempotency behavior reviewed for duplicate risk.
- [ ] Service worker update behavior validated on returning device.
- [ ] Incident playbooks reviewed with operators.

## F) Event operations readiness

- [ ] Event-day runbook reviewed and accepted.
- [ ] Operators assigned for guest support and technical response.
- [ ] Rollback commit and procedure pre-identified.
- [ ] Post-event export and teardown plan agreed.

## Decision

- [ ] **GO** — all critical sections complete, no blocker defects.
- [ ] **NO-GO** — unresolved blockers remain; event launch deferred.
