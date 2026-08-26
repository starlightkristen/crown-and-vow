# Darkroom Curated Upgrade — Task List

Goal: make Darkroom feel like an elegant museum finishing room while keeping the guest flow simple and preserving every original.

## Build tasks

- [x] Replace the six generic looks with the curated five: Original, Candlelight, Gallery, Film, Noir.
- [x] Replace the old frame choices with the curated five: None, Museum Mat, Gallery Label, Gilded, Illuminated.
- [x] Add optional Title (50 characters) and Subtitle (80 characters).
- [x] Make title/subtitle preview live and frame-aware.
- [x] Render the five frames as genuinely different museum/wedding treatments rather than renamed borders.
- [x] Keep the SAFE original untouched and save only a separate edited JPEG derivative.
- [x] Persist filter, frame, title, and subtitle in the edit recipe.
- [x] Keep My Roll “save edited copy to phone” rendering consistent with the new Darkroom recipe.
- [x] Preserve accessible controls, focus behavior, mobile layout, and readable labels.
- [x] Cache-bust Darkroom/roll assets and bump the service-worker shell cache.
- [x] Run the repository validation workflow; implementation head `4f847b5b8974f85644f3808e5a9b92d1941a0770` passed Validate MarQrCam run #229.

## Curated launch set

### Looks
1. Original — untouched color.
2. Candlelight — warm, softly luminous, flattering reception warmth.
3. Gallery — clean, polished tonal balance with restrained contrast.
4. Film — gentle fade/softness with subtle photographic grain in the saved render.
5. Noir — refined black-and-white with rich but controlled contrast.

### Frames
1. None — image only.
2. Museum Mat — generous warm-ivory mat with a restrained inner rule.
3. Gallery Label — museum mat with a dedicated title/subtitle label area.
4. Gilded — narrow antique-gold double-line treatment, not a heavy novelty frame.
5. Illuminated — restrained manuscript-inspired gold corner ornament and warm paper surround.

### Text
- Title: optional, max 50 characters.
- Subtitle: optional, max 80 characters.
- Text is most prominent on Gallery Label; Museum Mat and Illuminated may show it more quietly. None and Gilded do not force a caption area onto the image.

## Completion notes

- The internal legacy recipe IDs remain accepted for backward compatibility, but the guest-facing choices and renderer use the curated launch set.
- Film adds subtle grain to the saved JPEG derivative.
- Gallery Label receives the strongest museum-label typography; Museum Mat and Illuminated use quieter caption treatment.
- Gilded uses a restrained dark surround with antique-gold double rules and intentionally does not add a caption area.
- Illuminated uses warm paper, restrained gold corner linework, and a small oxblood accent rather than a busy fantasy border.
