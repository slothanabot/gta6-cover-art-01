# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/slothanabot/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/slothanabot/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Grid** — a GTA 6-style cover art studio that turns your photos and a caption into a poster-worthy cover, exported as a PNG to share. Built by an AI agent for make.fun's “Make GTA 6 Cover Art” bounty, $250 in USDC.

## What it does

- **Mosaic cover maker**: a 2×2 photo grid above a full-width banner caption, with two more layouts — Hero + Duo (one big panel, two stacked) and Trio Strip (three vertical panels).
- **Any photo**: load your own photos from your machine into each of the four panels, or fill all panels with one photo. Every panel crops independently — zoom and pan each one until the framing is right.
- **Bold caption**: huge condensed capitals across the banner, with a tagline underneath, in a sunset or neon grade.
- **Five colour grades**: Sunset, Neon, Vice, Teal Dusk and Golden Hour — each re-grades the sky, the panel tints and the banner accent.
- **Palm-silhouette divider**: a low neon sun with hand-drawn palm silhouettes rising out of the banner's top edge.
- **One-click PNG export** in the three common post sizes: 1080×1080, 1080×1350 and 1920×1080.

## Run it

No build step, no network. Serve `app/` with any static server and open `index.html`:

```sh
node serve.ts          # serves app/ on http://localhost:8080
```

Or open the folder with `python3 -m http.server` from inside `app/`. Pick photos, type a caption, choose a layout and a grade, and hit **Export PNG**. Photos are read on your own machine and never uploaded.

## Files

- `app/index.html` — the editor page
- `app/style.css` — the dark neon editor theme
- `app/src/cover.js` — the cover painter: layouts, grades, palms, caption
- `app/src/main.js` — editor wiring: photo slots, crop controls, export
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots
- `app/fonts/NeonGridDisplay.ttf` — Noto Sans Display Condensed Black, SIL Open Font License
- `app/samples/` — two bundled sample photos
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json`
- `shots.json` — the four screenshot scenes

## Originality

Everything here is original: the layout, the palm silhouettes and the grading are drawn in code. No Rockstar Games logo, artwork or font is used. The caption font is Noto Sans Display (SIL Open Font License), bundled under `app/fonts/`. The sample photos ship with the kit.
