# Guest Experience Upgrade — Classic + Illuminated

## Objective

Transform the production guest UI into the cinematic museum / vintage-camera experience approved for Addison & Marlena while preserving the existing guest identity, session, IndexedDB safety queue, Cloudflare R2 originals, D1 metadata, Darkroom, gallery, ceremony pause, and native-camera fallback.

Accessibility is a first-class requirement. The beautiful interface must remain usable with screen readers, magnification, large text, keyboard/focus navigation, reduced motion, and low vision.

## Design principles

- **Classic** — full candlelit, museum-black, warm ivory and antique brass presentation.
- **Illuminated** — same wedding identity with substantially larger type, stronger contrast, larger controls, calmer surfaces and reduced ornamental interference.
- Both modes use the same markup, application state and backend.
- Screen-reader support is required in both modes; Illuminated is a visual/touch presentation preference, not a prerequisite for accessibility.
- Decorative camera shells are UI only and are never rendered into saved photographs.
- Guest-facing operational state is quiet and human-readable; engineering state remains available without dominating the experience.

## Implementation tasks

### GX-01 — Display-mode foundation
- [x] Add persistent `Classic` / `Illuminated` display preference.
- [x] Add an always-reachable Display control.
- [x] Persist preference locally without changing guest/session state.
- [x] Respect `prefers-reduced-motion`.

### GX-02 — Arrival / welcome experience
- [x] Add an immersive wedding welcome layer before check-in for new visitors.
- [x] Keep returning issued-camera sessions fast by bypassing the welcome layer.
- [x] Make the display choice available before surname entry.

### GX-03 — Accessible guest check-in
- [x] Restyle surname lookup and matching guest choices in the new visual system.
- [x] Preserve explicit labels, visible focus, large touch targets and live error/result announcements.

### GX-04 — Camera selection gallery
- [x] Convert the six camera choices into dark editorial object cards.
- [x] Keep camera name, era and personality readable without depending on color alone.
- [x] Retain the existing one-tap camera claim behavior.

### GX-05 — Immersive camera mode
- [x] Load the existing mobile camera-shell layer on the production guest page.
- [x] Let the selected camera dominate the mobile viewport while keeping critical controls reachable.
- [x] Keep the live feed inside the simulated camera aperture.
- [x] Preserve native-camera fallback and raw-photo output.

### GX-06 — Capture / roll presentation
- [x] Restyle status information as restrained photographic UI.
- [x] Keep Keep/Retake and My Roll actions high-contrast and large.
- [x] Preserve the existing review-before-upload behavior.

### GX-07 — Illuminated low-vision presentation
- [x] Increase base type and control sizes.
- [x] Increase contrast and spacing.
- [x] Simplify low-value ornament while preserving the wedding design language.
- [x] Make critical state readable by text/shape, not color alone.
- [x] Keep zoom layouts resilient.

### GX-08 — Screen-reader and focus behavior
- [x] Add a skip link and descriptive display controls.
- [x] Add concise live announcements for view changes.
- [x] Provide strong `:focus-visible` treatment in both modes.
- [x] Keep semantic native controls for forms, camera selection and shutter actions.

### GX-09 — Offline/cache integration
- [x] Add the new experience assets to the service-worker shell.
- [x] Bump the cache version so phones receive the redesign after deployment.
- [x] Add the new script to syntax validation.

## Post-deploy device QA

These require real devices and assistive technology and therefore remain validation tasks rather than code tasks.

- [ ] Android Chrome: Classic flow end-to-end.
- [ ] Android Chrome: Illuminated flow at enlarged system font / browser zoom.
- [ ] Android TalkBack: surname lookup, camera picker, shutter, review, My Roll.
- [ ] iPhone Safari: Classic flow end-to-end.
- [ ] iPhone VoiceOver: surname lookup, camera picker, shutter, review, My Roll.
- [ ] 200% browser zoom without clipped critical controls.
- [ ] Reduced-motion preference.
- [ ] Denied live-camera permission → native camera fallback → Keep/Retake.
- [ ] Confirm simulated camera shell is never included in the stored photograph.

## Definition of done

The code milestone is complete when the same production guest flow supports both Classic and Illuminated, all existing capture/storage behavior remains intact, new assets pass repository validation, and real-device QA can begin without another architecture change.
