# MarQrCam wedding-night load testing

## Goal

Prove that the production architecture remains responsive when approximately 100 wedding guests arrive and use the system at roughly the same time. The default target is deliberately 125 virtual guests to provide headroom above the expected guest count.

The harness lives at `scripts/load_test.mjs` and uses Node 22's built-in `fetch`; there is no load-testing package to install.

## What the harness measures

Read mode is non-destructive and exercises:

- `/api/health`
- `/api/event-state`
- concurrent surname lookups when `LOAD_TEST_LAST_NAME` is supplied
- concurrent public gallery reads

Write mode additionally exercises:

- concurrent camera-session creation
- concurrent JPEG uploads through Worker -> R2 -> D1
- repeated upload/retry probes using a stable client capture id
- optional cleanup of created photo records when an admin token is supplied

The report includes request count, successes, failures, p50, p95 and p99 latency for each operation.

Current pass thresholds are intentionally practical for a reception:

- overall request error rate <= 1%
- guest lookup p95 <= 2 seconds
- gallery read p95 <= 2 seconds
- photo upload p95 <= 15 seconds

These thresholds can be tightened after the first real rehearsal.

## Safe live-site read test

PowerShell:

```powershell
$env:LOAD_TEST_MODE = "read"
$env:LOAD_TEST_USERS = "125"
$env:LOAD_TEST_LAST_NAME = "YOUR_TEST_SURNAME"
npm run load:test
```

This does not create sessions or photos. Use a surname that exists in the imported guest list so the lookup path is tested realistically.

## Full write test

Do the first write test against local Wrangler or a staging Worker, not the wedding production database.

Example local test:

```powershell
$env:LOAD_TEST_BASE_URL = "http://127.0.0.1:8787"
$env:LOAD_TEST_MODE = "write"
$env:LOAD_TEST_USERS = "125"
$env:LOAD_TEST_PHOTOS_PER_USER = "1"
$env:LOAD_TEST_LAST_NAME = "YOUR_TEST_SURNAME"
npm run load:test
```

Write mode creates camera sessions and synthetic 1x1 JPEG uploads. The tiny JPEG intentionally exercises the same Worker -> R2 -> D1 path without wasting bandwidth or storage.

If `LOAD_TEST_ADMIN_TOKEN` is supplied, the harness attempts to delete the synthetic photo records after the run. Session records are not currently automatically removed, so write mode should remain staging/local until rehearsal-session cleanup is implemented.

## Production-write safety lock

The harness refuses to write to a `workers.dev` production target unless this exact acknowledgement is set:

```powershell
$env:ALLOW_PRODUCTION_WRITES = "YES_I_UNDERSTAND"
```

That guard is intentional. A production write test can create many real D1 session rows and R2 objects and should only happen during a planned rehearsal window.

## Retry/idempotency probe

Write mode uploads the same logical capture twice for a small subset of sessions using the same `x-client-capture-id` / `clientCaptureId` value.

The desired final behavior is for both attempts to resolve to the same server photo id. If the report warns that a retry created a second photo, upload idempotency still needs hardening before wedding-night signoff.

## Wedding-readiness rehearsal

Before final signoff, run this progression:

1. 25-user read test.
2. 125-user read test against production.
3. 25-user write test against local/staging.
4. 125-user write test against staging.
5. Two consecutive 100-upload bursts against staging while gallery/event-state reads run concurrently.
6. Verify zero missing uploads, zero unexpected duplicate photos, and acceptable p95 latency.
7. Only if staging is clean, schedule one controlled production rehearsal with explicit cleanup.

The final capacity statement should be based on the measured report, not only on Cloudflare's platform limits.
