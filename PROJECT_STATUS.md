# games — PROJECT STATUS

Last updated: 2026-07-10

## Why / What

HTML5 games hub: a small reusable framework (`gamekit`) plus games built on it,
starting with an idle startup-simulator. Games run embedded on ordinary websites
(iframe / static hosting) and are packaged to YouTube Playables certification
spec so they are submission-ready the moment Playables access (invite-gated)
exists. A hub site lists all games so people can come and load one.

**Users:** anyone with a browser; embedders who want a game on their site;
eventually YouTube Playables players.

**IN scope:** gamekit framework (platform adapter, loop, saves, offline
progress), DOM-based idle games, hub/arcade site, web + YT zip builds.

**OUT of scope (v1):** YouTube submission itself (blocked on invite),
leaderboards/backend, monetization, accounts.

## Dependencies

### External

- Vite, TypeScript, vitest, biome, @fontsource packages (all dev/bundled — no
  runtime network deps; YT Playables prohibits external requests)
- YouTube Playables SDK (`https://www.youtube.com/game_api/v1`, injected only
  in the YT build)
- Cloudflare Pages (manual deploys, later)

### Internal

- Fleet standards (`../AGENTS.md`), fleet-init scaffold

## Timeline

- 2026-07-10 — project scaffolded; gamekit + idle-startup + hub v1 built

## Products

- `@games/gamekit` — framework package (internal)
- `@games/idle-startup` — first game; web build (`dist/web`) + YT zip
  (`pnpm build:yt`)
- `@games/hub` — arcade site; `pnpm build` assembles hub with games under
  `/play/<id>/` (single Pages surface, not yet deployed)

## Features (shipped)

- (filled in as v1 lands — see repo README)

## Todo / Planned / Deferred / Blocked

1. Deploy hub + game to Cloudflare Pages (manual, on request)
2. Playtest balance pass on idle-startup content curve
3. **Blocked**: YouTube Playables submission — requires invite/onboarded
   channel (Private Preview); zip bundle is kept submission-ready
4. Deferred: sound design (audio gate already wired via platform adapter)
5. Deferred: break_eternity.js if a game's numbers approach 1e15
