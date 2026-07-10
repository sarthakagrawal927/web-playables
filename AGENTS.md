## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Project

- **Stack**: pnpm monorepo — `packages/gamekit` (TS game framework, no build step), `games/*` (Vite vanilla-TS games), `apps/hub` (arcade site listing all games)
- **Local dev**: `pnpm install`, then `pnpm dev` (first game) or `pnpm dev:hub`
- **Checks**: `pnpm check` = biome + typecheck + vitest + build (CI runs the same)
- **Deploy**: manual Cloudflare Pages; `pnpm build` assembles hub + games under `apps/hub/dist/` (games served at `/play/<id>/`)

## Rules that exist because of YouTube Playables certification

Every game must stay submission-ready for YouTube Playables. Concretely:

- Game code must only touch the `Platform` interface from `@games/gamekit` — never `ytgame`, `localStorage`, or the Page Visibility API directly.
- No external network requests from game code or assets: fonts/audio/art are bundled (fonts via `@fontsource-*` packages). No CDNs, no analytics.
- All timers/animation must stop when the platform reports pause; the game loop and autosave are the only clocks.
- Layout must be fluid across 9:16, 1:1, 16:9 and live resize; input must work with both touch and mouse (pointer events).
- Saves go through gamekit's save manager (versioned envelope + migrations, 64 KiB guard). Never write a second persistence path.
- `pnpm build:yt` must keep producing a zip with `index.html` at its root and the YT SDK script tag first in `<head>`.
