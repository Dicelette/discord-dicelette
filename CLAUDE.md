# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dicelette is a Discord dice-rolling bot (`discord.js`) plus a companion web dashboard (React + Express) for configuring the bot per-guild. It's a pnpm monorepo. The actual dice-parsing/rolling logic lives in a **separate** published package, `@dicelette/core` (not in this repo) — this repo consumes it as a normal npm dependency.

## Monorepo layout

```
apps/
  bot/        the Discord bot itself (entry: apps/bot/index.ts)
  web/        React dashboard frontend (Vite, MUI, Tailwind) — has its OWN package.json, own node_modules
packages/
  client/     EClient — extended discord.js Client (settings/characters/template Enmap stores)
  helpers/    Discord-facing helpers shared by bot + dashboard (modal handlers, guild/interaction context, roles)
  localization/  i18n (i18next), t()/ln() translation helpers, locale files
  parse_result/  dice-roll result parsing/formatting/composition (works on @dicelette/core output)
  types/      shared TypeScript types (GuildData, UserData, dice types, discord types) — no runtime code
  utils/      generic utils: logger, sentry wrapper, regex, error classes, changelog
dashboard/
  server/     Express API server for the dashboard (routers, auth, rate limiting)
  api/        typed API client package consumed by apps/web (@dicelette/api)
```

Only `apps/web`, `dashboard/api`, `dashboard/server`, `packages/localization`, and `packages/types` have their own `package.json` (real pnpm workspace packages, see `pnpm-workspace.yaml`). `apps/bot`, `packages/client`, `packages/helpers`, `packages/parse_result`, `packages/utils` are plain folders resolved via TS path aliases (see `tsconfig.json` `compilerOptions.paths`), not separate packages — don't add a `package.json` to them without checking why the others don't have one.

## Key architectural boundary: bot ↔ dashboard decoupling

`dashboard/server` never imports `discord.js` or touches the live bot client directly. `apps/bot/src/dashboard.ts` builds a plain-object dependency-injection surface (`botGuilds`, `botChannels`, callback functions for fetching members/channels/sending messages/importing CSVs, etc.) and passes it into `startDashboardServer()` from `@dicelette/server`. When changing dashboard behavior that needs bot data, extend that DI surface in `apps/bot/src/dashboard.ts` and the `DashboardDeps` type in `dashboard/server/types`, rather than reaching into discord.js from the server package.

The dashboard REST API is organized as Express routers under `dashboard/server/guilds/` (config, bootstrap, channels, characters, template, user), all mounted under `/api/guilds/:guildId/...` in `dashboard/server/guilds/index.ts`. Auth is JWT-in-cookie based (`dashboard/server/auth.ts`), with CSRF origin-checking and per-route rate limits set up in `dashboard/server/index.ts`.

`apps/web` talks to this API through the typed client in `dashboard/api` (`@dicelette/api`, workspace package) — add new endpoint calls there, not with raw `fetch` in components.

## Bot internals

- `packages/client` (`EClient`) extends `discord.js.Client` and owns the persistent/in-memory stores: `settings` (Enmap, persisted to `./data`), `characters`/`template`/`guildLocale` (in-memory Enmap caches), plus autocomplete caches and TTL bookkeeping (`characterCacheTimestamps`). Prefer `client.setCharacter()`/`client.deleteCharacter()` over touching `client.characters` directly — they keep the TTL sweep map in sync.
- `apps/bot/src/events/index.ts` registers all discord.js event listeners (`ready`, `onInteraction`, `onJoin`, `onMessageSend`, etc.) from `apps/bot/src/events/*`.
- Commands live under `apps/bot/src/commands/{admin,roll,tools,userSettings,private}`; `apps/bot/src/commands/index.ts` aggregates them into `COMMANDS`, `AUTOCOMPLETE_COMMANDS`, and per-name lookup maps used at registration/dispatch time.
- `apps/bot/src/database/` is the character/template read/write layer sitting on top of `EClient`'s Enmap stores (not a real DB).
- `apps/bot/src/messages/` builds the Discord embeds/components sent for character sheets, stats, dice results.
- `packages/parse_result` turns raw `@dicelette/core` roll output into formatted text/embeds (critical handling, comments, composed rolls).
- Localization: use `t()`/`ln()` from `@dicelette/localization`; locale strings live in `packages/localization/locales`. See `README.md` for the process of adding a new language (copy `en.ts`, register it in the localization index).

## Commands

```bash
pnpm install              # install deps (Node version pinned in .nvmrc / engines, currently 26.5.0)

# Dev
pnpm dev                  # watch-run the bot only (tsx watch)
pnpm --filter @dicelette/web dev   # Vite dev server for the dashboard frontend
task                      # (Taskfile) runs bot + web dashboard together
task tunnel                # ngrok tunnel for local OAuth callback testing

# Build
pnpm build                 # tsc6 --build + tsc-alias (bot/packages/dashboard-server)
pnpm --filter @dicelette/web build # dashboard frontend build (also runs as part of postbuild)

# Lint / format (Biome, tabs, double quotes, 90 col — see biome.json)
pnpm lint                  # biome check --write --unsafe across apps/, packages/, dashboard/

# Tests
pnpm test                  # vitest run — root config only covers packages/**/tests/**/*.test.ts
pnpm exec vitest run --config apps/bot/vitest.config.ts    # bot's own tests (apps/bot/tests/**) — NOT covered by root `pnpm test`
pnpm exec vitest run <path/to/file.test.ts>                # single file
pnpm exec vitest run -t "<test name>"                      # single test by name
pnpm --filter @dicelette/web test:e2e       # Playwright e2e for the dashboard (auto-starts Vite dev server)
pnpm --filter @dicelette/web test:e2e:ui    # Playwright UI mode

# Release (bot and web dashboard are versioned/tagged independently)
pnpm release               # commit-and-tag-version for the root package, then pushes tags
pnpm --filter @dicelette/web release   # tags @dicelette/web@x.y.z separately
```

Notes:
- `packages/parse_result` and `packages/utils` each have their own standalone `vitest.config.ts` too, but their tests already fall under the root config's `packages/**/tests` include, so `pnpm test` covers them; `apps/bot/tests` does not match that glob and needs the explicit `--config` invocation above.
- Path aliases (`@dicelette/*`, plus bare `client`/`commands`/`database`/`event`/`features`/`locales`/`messages`/`utils` inside `apps/bot`) are defined once in `tsconfig.json` — mirror any new alias there, and in `vitest.config.ts`/`apps/bot/vitest.config.ts` if tests need to resolve it too.
- `pnpm lint` runs `biome check --write --unsafe` — it auto-fixes, including potentially-unsafe fixes; review the diff after running it.
- Environment config: `.env` (dev), `.env.prod` (loaded when `PROD=true`), `.env.beta`. Dashboard server additionally needs `SESSION_SECRET`, `FRONTEND_URL`, `DASHBOARD_PORT`, `DASHBOARD_ENABLED=true` on the bot side to mount the dashboard.

# Additional Instructions

- Never add unnecessary comments in your code. Only add comments when the code is not self-explanatory or when it is necessary to explain the reasoning behind a particular implementation, and keep it the most concise.
- Never repeat yourself. Avoid duplicating code or logic. If you find yourself writing the same code in multiple places, consider refactoring it into a reusable function or module.
- Read the code first before creating a new function. Understand the existing codebase and see if there are any existing functions or modules that can be reused or extended to achieve your goal.
- Always reply in the language used by the user
- Push on a branch based on the feature or fixes, followed by a resume of the demande, e.g fixes/dice-duplicates or feat/dashboard-karma
- Always use conventional commit 
- Don't include unnecessary comments in commits; the title should be enough to describe the commit.
- The title of the commit should be concise.