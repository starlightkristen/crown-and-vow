# MarQrCam — Crown & Vow Bachelorette Test

Guest-powered camera for Marlena's Bachelorette — **Crown & Vow**, September 18–21, 2026.

> "A picture, if you please."

This is a **standalone, fully isolated copy** of the MarQrCam guest camera system (Worker + PWA + D1 + R2), copied here from the `starlightkristen/MarQrCam` repo's `feat/production-vertical-slice` branch so it can be dry-run tested at the Bachelorette without ever touching the real wedding deployment.

It shares no Cloudflare resources, no D1 database, no R2 bucket, and no guest data with the wedding system. The original MarQrCam repo was not modified to build this — every file here is a copy, renamespaced for this event.

## Why a separate copy instead of reusing MarQrCam directly

The wedding deployment (`marqrcam-am-wedding-2026`) is intentionally locked to Addison & Marlena's real invite list, real guest sessions, and the real wedding gallery — `scripts/assert_isolated_resources.mjs` in that repo refuses to deploy anywhere else. Pointing a test run at it would mix bachelorette test photos into production wedding data. This copy exists so the whole guest flow (lookup → camera → capture → Darkroom → gallery → admin) can be rehearsed live with the Crown & Vow crew, on its own Cloudflare namespace, with zero risk to the wedding system.

## Cloudflare isolation contract (this copy)

Dedicated namespace, separate from every wedding resource:

- Worker: `marqrcam-crown-vow-bach-2026`
- D1: `marqrcam-crown-vow-bach-2026-db`
- R2: `marqrcam-crown-vow-bach-2026-photos`
- `EVENT_SLUG`: `crown-vow-bachelorette-2026-09-18`

Bindings: `DB` (D1), `PHOTOS` (private R2), `ASSETS` (static). The browser never receives R2 credentials.

`npm run check` (`check:isolation` + `check:syntax` + a Wrangler dry-run) blocks deployment unless `wrangler.jsonc` still points at this exact namespace — so a copy/paste mistake can't accidentally redeploy over the wedding Worker.

## Crown & Vow theming

Guest-facing copy and the camera crest icon (`public/icons/last-knight-out-crest.svg`) were reworked for this event:

- Recipient/curator language: "Marlena's Court" instead of "Addison & Marlena"
- Gallery renamed "Court Gallery"
- Dates: Sept 18–21, 2026 instead of 11.14.26
- R2 object paths under `bachelorette/last-knight-out-2026/...` instead of `weddings/addison-marlena-2026/...`

The six vintage camera shells (Canon AE-1, Olympus Trip 35, Polaroid SX-70, Kodak Instamatic 104, Nikon F3, Pentax K1000) — and their product-photo card backgrounds from `camera-themes.css` — are unchanged, since they were never wedding-specific and read best on a bright card.

`public/last-knight-out-theme.css` layers the Crown & Vow Renaissance Faire palette (forest green, gold, cream, oxblood — matching `../src/App.jsx`) and its IM Fell English / EB Garamond fonts on top of everything else: page background, buttons, panels, stat cards, and the masthead type. It's linked last on `index.html`, `gallery.html`, and `admin.html` so it wins the cascade without editing the base stylesheets, and it's precached in `sw.js` for offline use.

## First-time setup

```bash
cd marqrcam-bachelorette
npm install
```

1. Create the dedicated D1 database and R2 bucket for this event (or let `/.github/workflows/bootstrap-deploy-marqrcam.yml` do it via `workflow_dispatch`):
   ```bash
   npx wrangler d1 create marqrcam-crown-vow-bach-2026-db
   # copy the returned database_id into wrangler.jsonc, replacing REPLACE_WITH_D1_DATABASE_ID
   npx wrangler r2 bucket create marqrcam-crown-vow-bach-2026-photos
   ```
2. Apply migrations:
   ```bash
   npx wrangler d1 migrations apply marqrcam-crown-vow-bach-2026-db --remote
   ```
3. Set the admin secret:
   ```bash
   npx wrangler secret put ADMIN_TOKEN
   ```
4. Build a small guest seed for the Bachelorette attendees (see `scripts/build_guest_seed.py` — point it at a CSV of attendee names instead of the wedding Zola export) and load it into D1.
5. Verify and deploy:
   ```bash
   npm run check
   npx wrangler deploy
   ```

## Guest data retained

Same minimal-retention policy as the wedding system: only household grouping, invited names, guest type/relationship, and unnamed-slot counts. No email, phone, or address fields.

## After the Bachelorette

This is a test/rehearsal environment. Once you're done: tear down the `marqrcam-crown-vow-bach-2026-db` D1 database and `marqrcam-crown-vow-bach-2026-photos` R2 bucket, or leave them — they're fully isolated from the wedding namespace either way and cost nothing to leave idle.

## Operational readiness docs

- Event-day runbook: `docs/event-day-runbook.md`
- Incident response playbooks: `docs/incident-playbooks.md`
- Friday signoff checklist: `docs/go-no-go-checklist.md`
