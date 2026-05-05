# grimms-monkeytype

A Monkeytype-style coding typing game built with TanStack Start, React, Bun, and a visual system inspired by `grimm-pixel-works`.

## Current Product Shape
- 30 second typing runs
- multiline code snippets
- languages currently supported:
  - JavaScript
  - TypeScript
  - Python
  - Go
  - Java
- line breaks are visual only
- spaces count
- `Tab` jumps leading indentation only
- local bests stored in the browser
- optional typing sound
- first-visit onboarding card
- `Space` after results starts a fresh run
- long lines use horizontal follow behavior to keep the caret visible

## Stack
- TanStack Start
- React 19
- Bun
- Tailwind 4
- Bun production server via `server.ts`
- Docker multi-stage build

## Local Development
Install dependencies:

```bash
bun install
```

Run the dev server:

```bash
bun run dev
```

## Testing
Run the test suite:

```bash
bun run test
```

## Production
Build the app:

```bash
bun run build
```

Start the production server locally:

```bash
bun run start
```

## Docker
Build the image:

```bash
docker build -t grimms-monkeytype .
```

Run the container:

```bash
docker run --rm -p 3000:3000 grimms-monkeytype
```

The app listens on `PORT`, defaulting to `3000`.

## Deployment Notes
- `server.ts` serves:
  - SSR via TanStack Start
  - static client assets from `dist/client`
- static asset serving is required for CSS and JS to load correctly in production
- Dockerfile is configured for multi-stage Bun builds and works well for Coolify-style Docker deployments

## Analytics
Umami is wired in at the root document level.

Current setup:
- self-hosted script: `https://umami.grimm0.dev/script.js`
- restricted to: `typer.grimm0.dev`

## Near-Term Roadmap
1. DB schema and validation model
2. Auth foundation
3. Leaderboard persistence
4. Leaderboard UI
5. Share CTA
6. C#, and Kotlin packs
7. Basic abuse/rate-limit tuning
8. Survival mode later

## Product Decisions
- leaderboard participation requires login
- anti-exploit remains lightweight and sanity-check based for now
- primary outcome is fun, not monetization
