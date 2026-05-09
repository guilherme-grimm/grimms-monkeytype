# Contributing to grimms-monkeytype

Thanks for taking the time to contribute. This is a small, opinionated project — please read this guide before opening a PR.

## Quick start

```bash
bun install
cp .env.example .env   # fill in GitHub OAuth + better-auth secrets
bun run dev
```

Dev server runs on `:3000`. See [README.md](./README.md) for the full stack overview, Docker, and deployment notes.

## Project layout

- `src/components/` — React components
- `src/routes/` — TanStack Router routes
- `src/server/` — auth, DB, leaderboard, score validation
- `server.ts` — production entry point (SSR + static serving)
- `drizzle/` — DB migrations (run automatically on server boot)
- `docs/plans/validated-mango.md` — **active product source of truth**; consult before proposing scope changes

## Workflow

1. Fork → branch off `main`.
2. Keep PRs focused — one logical change per PR.
3. Conventional commit prefixes (`feat:`, `fix:`, `qol:`, `docs:`) are encouraged but not enforced — match the existing `git log` style.
4. Open the PR against `main` with a filled-in description (the template will prompt you).

## Before opening a PR

These mirror what CI runs:

```bash
bun run lint        # Biome lint must pass (0 errors; warnings are fine)
bun run format      # Biome format check must pass
bunx tsc --noEmit   # typecheck must pass
bun run build       # production build must pass
```

If lint or format fails, fix it with:

```bash
bun run check:fix   # one-shot: lint + format auto-fix where possible
```

The Biome config is intentionally **strict** — it exists to catch slop, especially from AI-assisted contributions. If a rule feels wrong for the codebase, raise it in an issue rather than disabling it locally.

For UI changes, please test the golden path manually in a browser. Note in your PR description what you exercised.

## <a id="tests"></a>The test suite

> **`bun run test` is gated in CI.** Please run it locally before opening a PR.
>
> - The suite uses Vitest with a jsdom environment — see `vitest.config.ts` for the deterministic settings (no retries, no parallelism surprises).
> - If a test fails locally but seems unrelated to your change, open an issue rather than disabling it — silent skips erode the gate.
> - New behavior should land with a test where it's reasonable to write one. Integration tests for the wired game loop live alongside the hooks/routes they exercise (`*.integration.test.ts(x)`).

### End-to-end (Playwright)

Browser-level specs live in `e2e/`. They hit the production build via Playwright's auto-start `webServer` (`bun run build && bun run start`), so the suite exercises the same artifact users get — no Vite dev-server / HMR shortcuts.

Run locally with `make e2e` (or `bun run e2e`). For interactive debugging — recommended when authoring a new spec — use `make e2e-ui`, which opens the Playwright UI runner with time-travel and locator picker. Specs follow a **read-then-type** pattern: the test reads the active snippet's normalized target from `data-snippet-target`, types it via real keystrokes, and asserts the loop progressed (snippet rotated, score climbed, round finished). Randomness in the snippet pool is intentional; specs must not couple to specific snippet content.

The E2E suite is currently chromium-only and runs locally; CI integration is staged separately once stability is proven.

## Scope guidance

The project's product shape and active milestones live in [`docs/plans/validated-mango.md`](./docs/plans/validated-mango.md). A few things that look like bugs are actually deliberate:

- Immersion-curve mechanics (vignette, audio gain, error thunk, caret glow) are **not** user-tunable. Per-user controls exist for *intensity* of the curve, not its shape.
- Leaderboard participation requires login. Anonymous play is fully supported but does not submit scores.
- Score validation is server-side, sanity-check level — not heavy anti-cheat.

If you're proposing something that touches these, lead with the *why* in an issue before writing code.

## Reporting bugs / requesting features

Use the issue templates — they ensure we get the info needed to triage quickly. Blank issues are disabled; if your report doesn't fit a template, the feature request template is the catch-all.

## Security

Please **do not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for private disclosure instructions.
