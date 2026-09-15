# MarQrCam Bachelorette Event-Day Runbook

## Scope

This runbook covers startup, pre-event verification, live operations, pause/rollback actions, and shutdown for the isolated Crown & Vow bachelorette deployment.

## Owners

- Event operator: runs checks and monitors guest/admin behavior.
- Technical operator: Cloudflare/Wrangler access for deploy, migrations, and secrets.

## Prerequisites

- Cloudflare resources exist and are isolated:
  - Worker: `marqrcam-crown-vow-bach-2026`
  - D1: `marqrcam-crown-vow-bach-2026-db`
  - R2: `marqrcam-crown-vow-bach-2026-photos`
- `wrangler.jsonc` contains the real D1 `database_id`.
- `ADMIN_TOKEN` secret is set.
- Guest seed SQL has been imported.

## Startup checklist (T-60 to T-30)

1. From the `marqrcam-bachelorette` directory:
   - `npm install`
   - `npm run check`
2. Verify D1 migrations are current:
   - `npx wrangler d1 migrations apply marqrcam-crown-vow-bach-2026-db --remote`
3. Deploy:
   - `npx wrangler deploy`
4. Smoke-test endpoints:
   - `GET /api/health` returns `ok: true`
   - `GET /api/event-state` returns capture/gallery flags and message
5. Smoke-test guest flow:
   - Lookup known name
   - Issue session
   - Capture and upload one photo
   - Verify photo appears in My Roll
6. Smoke-test admin flow:
   - Login with admin token
   - Load overview and photo desk
   - Toggle capture off/on and confirm guest banner behavior
7. Smoke-test gallery flow:
   - Approve one photo in admin
   - Confirm gallery shows it

## Live operations checks (every 30–60 minutes)

- Guest capture status:
  - No sustained increase in `WAITING` uploads in guest roll.
- Admin dashboard:
  - Overview loads, photo desk loads, no repeated auth failures.
- Gallery:
  - Refresh works and approved photos render.
- Event controls:
  - Verify intended capture/gallery state remains set.

## Fast mitigation controls

- Pause all captures (ceremony or incident):
  - Admin UI -> Event state -> disable `Cameras live` -> Save.
- Hide public gallery:
  - Admin UI -> Event state -> disable `Gallery visible` -> Save.
- Remove problematic photo:
  - Admin UI -> Photo desk -> Delete or set Hidden.

## Rollback procedure

Use when a newly deployed version introduces regressions.

1. Immediately pause capture in admin.
2. Redeploy last known good commit:
   - `git checkout <known-good-sha>`
   - `npm install`
   - `npm run check`
   - `npx wrangler deploy`
3. Re-run smoke tests.
4. Re-enable capture/gallery in admin.

## Shutdown checklist (post-event)

1. Export CSV manifest from admin (`Export CSV`).
2. Confirm required photos are downloaded/backed up.
3. Set capture off and gallery visibility per retention decision.
4. Record final status (issues, follow-ups, teardown decision).
5. Optional teardown:
   - Delete D1 database and R2 bucket if retiring environment.
