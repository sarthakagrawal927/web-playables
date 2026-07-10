# games

HTML5 games hub — a tiny framework (`gamekit`) + games built on it, playable on
the web, embeddable anywhere, and packaged to [YouTube Playables](https://developers.google.com/youtube/gaming/playables)
certification spec.

## Layout

```
packages/gamekit     framework: platform adapter (web/yt), loop, saves, offline, format
games/idle-startup   game #1 — idle startup simulator
apps/hub             arcade site listing all games (serves games at /play/<id>/)
```

## Quickstart

```bash
pnpm install
pnpm dev        # idle-startup at http://localhost:5173
pnpm dev:hub    # hub site
pnpm check      # biome + typecheck + vitest + full build
```

## Builds

- `pnpm build` — builds every package, then assembles the deployable site in
  `apps/hub/dist/` (hub at `/`, each game at `/play/<id>/`).
- `pnpm build:yt` — rebuilds idle-startup with the YT Playables SDK script
  injected first in `<head>`, zips it with `index.html` at the zip root →
  `games/idle-startup/dist/idle-startup-yt.zip`. Upload that in the Playables
  developer portal (access is invite-gated; the bundle is kept
  certification-ready).

## Embedding a game on any site

```html
<iframe
  src="https://<hub-domain>/play/idle-startup/"
  style="width:100%; aspect-ratio:9/16; max-height:90vh; border:0"
  loading="lazy"
  allow="fullscreen"
  title="Idle Startup"
></iframe>
```

Local proof: `pnpm build && pnpm preview`, then open
`games/idle-startup/embed-test.html` — the game in iframes at 9:16, 1:1, 16:9.

## Adding a new game

1. `cp -R` an existing game dir under `games/<new-id>` (or start from
   `index.html` + `vite.config.ts` + `src/main.ts`).
2. Depend on `"@games/gamekit": "workspace:*"`; only ever talk to the
   `Platform` interface (saves, audio, pause, ready signals) — that is what
   keeps the game YT-certifiable.
3. Register it in `apps/hub/src/games.ts` so the hub lists it and
   `scripts/assemble-site.mjs` copies its build to `/play/<id>/`.

## YouTube Playables constraints baked into this repo

Initial bundle <30 MB (ours ≪1 MB) · load <5 s · save ≤64 KiB guarded in
gamekit · **no external requests** (fonts bundled via @fontsource) · relative
paths (`base:'./'`) · all aspect ratios + live resize · touch + mouse ·
pause halts everything · saves only via SDK (web build falls back to
localStorage).
