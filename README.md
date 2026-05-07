# grimms-monkeytype

A Monkeytype-style coding typing game built with TanStack Start, React, Bun, and a visual system inspired by `grimm-pixel-works`. Live at [typer.grimm0.dev](https://typer.grimm0.dev).

## Current Product Shape
- 30-second typing runs
- Multiline code snippets in 8 languages: JavaScript, TypeScript, Python, Go, Java, Kotlin, Ruby, PHP
- Difficulty presets — Easy / Normal / Hard — gentle 0.85 / 1.00 / 1.25 score multiplier
- Streak-driven immersion escalation (vignette, caret glow, audio gain ramp, error thunk) — fully tunable per-user in settings
- Server-validated leaderboard per language with self-row highlight + "your standing" footer
- GitHub OAuth via better-auth; anonymous play stays available (no leaderboard)
- Local bests in browser; global bests on the server
- Onboarding card on first visit; optional typing sound; settings drawer behind a gear icon
- `Tab` jumps leading indentation only; `Space` after a finished run replays the same snippet, `Enter` pulls a new one

## Stack
- TanStack Start + React 19
- Bun runtime + production server (`server.ts`)
- Tailwind 4
- Drizzle ORM + LibSQL (file-backed SQLite)
- better-auth v1.6 with GitHub provider
- Docker multi-stage build (Coolify-ready)

## Local Development
```bash
bun install
bun run dev
```

Dev server runs on `:3000`. A floating bottom-right "DEV" pill opens an immersion-curve calibration panel — DEV-only, tree-shaken from prod builds.

## Testing
```bash
bun run test
```

## Production
```bash
bun run build
bun run start
```

## Docker
```bash
docker build -t grimms-monkeytype .
docker run --rm -p 3000:3000 grimms-monkeytype
```

The app listens on `PORT`, defaulting to `3000`. Mount a persistent volume at `/app/data` for the SQLite DB.

## Deployment Notes
- `server.ts` serves SSR via TanStack Start + static client assets from `dist/client`. Static serving is restricted to `/assets/*`, favicons, manifest, and robots — everything else falls through to SSR.
- Drizzle migrations run automatically on server boot.
- Required env: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DATABASE_PATH` (defaults to `/app/data/app.db` in Docker). See `.env.example`.
- After each deploy, hit `/api/health` to verify DB persistence + env wiring.

## Next Milestone
**Survival mode.** The streak / multiplier / reactions primitives are shaped to support it — see `docs/plans/validated-mango.md` for shipped milestones and the active source of truth.

## Product Decisions
- Leaderboard participation requires login
- Server recomputes/validates submitted scores; sanity checks only, no heavy anti-cheat
- Immersion + difficulty selectors are user-tunable; curve mechanics are not
- Primary outcome is fun, not monetization
