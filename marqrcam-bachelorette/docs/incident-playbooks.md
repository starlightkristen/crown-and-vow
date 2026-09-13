# MarQrCam Incident Playbooks

Use this document for high-priority issues during rehearsal/event operations.

## Severity guide

- **SEV-1**: Core guest capture unavailable for most users.
- **SEV-2**: Partial degradation (some devices/flows failing).
- **SEV-3**: Non-blocking UX/admin issues.

## 1) Camera access failures (live viewfinder unavailable)

### Symptoms

- Guests cannot enable live viewfinder.
- Repeated browser permission errors.

### Immediate actions

1. Confirm native capture fallback button is visible/usable.
2. Instruct guests to continue with phone camera fallback.
3. Confirm uploads still succeed via fallback path.

### Escalation

- If fallback also fails for many users, classify as SEV-1 and pause capture while investigating.

## 2) Upload failures / queue growth

### Symptoms

- Many guests see `WAITING` or repeated retry messages.
- Admin photo count stalls while captures continue.

### Immediate actions

1. Check `/api/health` and `/api/event-state`.
2. Verify Worker is reachable and not returning widespread 5xx.
3. Confirm R2 and D1 bindings in deployed config are unchanged.
4. If issue persists, disable capture in admin to prevent further queue pressure.

### Recovery

1. Redeploy last known good commit.
2. Re-test one capture from a device already showing `WAITING`.
3. Re-enable capture once successful retries resume.

## 3) Admin lockout / token failures

### Symptoms

- Admin login rejected for known valid operator.
- All admin API endpoints return unauthorized.

### Immediate actions

1. Verify token entry has no whitespace/paste artifacts.
2. Rotate/reset `ADMIN_TOKEN` via Wrangler secret:
   - `npx wrangler secret put ADMIN_TOKEN`
3. Re-authenticate in a fresh browser session/private window.

### Containment

- If admin remains inaccessible, keep guest flow running if stable and avoid risky changes until access is restored.

## 4) Gallery incorrect visibility/privacy

### Symptoms

- Gallery shows photos that should be private.
- “Just between us” photos appear publicly.

### Immediate actions

1. Disable gallery visibility in admin immediately.
2. Audit recent photo status changes in admin photo desk.
3. Verify affected photos are set to Private/Hidden.

### Recovery

1. Re-enable gallery only after confirming visible items are correct.
2. If privacy logic appears broken, keep gallery disabled and continue capture-only mode.

## 5) Bad deployment regression

### Symptoms

- Previously working flows fail right after deployment.

### Immediate actions

1. Pause captures in admin.
2. Roll back to last known good commit and redeploy.
3. Re-run smoke tests before reopening.

## 6) Data safety checks after any incident

After recovery, validate:

- New uploads are transitioning from waiting -> safe.
- Admin overview/photo desk loads cleanly.
- Gallery state matches operator intent.
- Deleting a photo removes both metadata and objects.
