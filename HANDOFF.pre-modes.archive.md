# HANDOFF — pre-modes hardening

Plan: `~/.claude/plans/hey-claude-we-are-parsed-umbrella.md`

This file is the single source of truth for "where are we" on the pre-modes hardening work
(test stabilization → integration tests → CI test gate). Every task in the plan updates this
file at completion so a fresh agent can resume on a clean context using only the plan + this doc.

## Status

- Last completed task: **D6 hotfix** (vitest exclude `e2e/**`) — 2026-05-09
- Next task: re-push + watch CI; both jobs should now go green.

## Phase progress

- [x] **A0** — Create HANDOFF.md
- [x] **A1** — Run the suite, capture real flake behavior (deterministic green)
- [x] **A2** — Per-file inspection + triage doc — written to `docs/plans/test-triage.md`
- [x] **A3** — Diagnose flakes — **SKIPPED** (A1 green; no flakes to diagnose)
- [x] **B1** — Add `vitest.config.ts` + `vitest.setup.ts`
- [x] **B2** — Include test config in typecheck scope (already covered by `**/*.ts` glob; no edit needed)
- [x] **B3** — Re-enable tests in CI (edit `ci.yml`, flip `CONTRIBUTING.md` warning)
- [x] **C0** — Mount level: hook-level for C1–C4 (`renderHook`); extracted helper for C5–C6
- [x] **C1** — Round lifecycle test
- [x] **C2** — Correct keystroke advances score and combo
- [x] **C3** — Incorrect keystroke breaks combo, increments errors
- [x] **C4** — Snippet completion advances queue
- [x] **C5** — Anonymous run does NOT POST score
- [x] **C6** — Authenticated run POSTs once with expected payload (+ HTTP error capture, + describeSubmissionError parametric)
- [x] **C7** — Final green-streak (10× full suite green, 59 tests / 8 files, full CI sequence clean)
- [x] **D1** — Playwright tooling + config (chromium-only, prod build via webServer)
- [x] **D2** — DOM affordances (testids on snippet, textarea, metrics, finished panel, share button; `data-snippet-target` on snippet root)
- [x] **D3** — First spec: golden-path game loop (read-then-type, behavioral assertions only)
- [x] **D4** — Local DX (npm scripts + Makefile `e2e`/`e2e-ui` + CONTRIBUTING E2E section)
- [x] **D5** — Stabilization: 10× green, ~33–34s/run, no flakes
- [x] **D6** — CI integration (separate `e2e` job parallel to `verify`; artifact upload on failure)

## Decisions & discoveries

- **A0**: `HANDOFF.md` is `.gitignore`-d (line 18) by deliberate prior choice. Kept local, not committed. User handles all commits in this project — never run `git commit` here.
- **A1**: Suite is **deterministic green**. 5 consecutive `bun run test` runs + 1 verbose run, all 46 tests pass in ~210ms. Zero warnings (no jsdom complaints, no React 19 act() noise, no unhandled rejections). The `CONTRIBUTING.md` "known-flaky" warning is **stale** — likely written when an earlier state existed. This means: (a) Task A3 is skipped; (b) Task B3 (re-enable in CI) is unblocked once we add a `vitest.config.ts` to lock the env explicitly so it stays green on CI runners too.
- **A1 environment note**: there's no `vitest.config.ts`, yet jsdom-touching tests don't exist (all 6 are pure-function). That's why the missing config hasn't bitten. As soon as Phase C integration tests land we MUST have B1 done first or jsdom gaps reappear.
- **A2**: All 6 existing test files **kept** (no deletions). `storage.test.ts` flagged for **expansion** (4-branch decision tree only partially covered, plus localStorage round-trip tests gated on B1 jsdom env). `difficulty.test.ts` keep verdict overturned earlier "trivial getters" suspicion — assertions encode the public contract of presets. Triage doc has the full table + integration wishlist (Phase C inputs).
- **B1**: Plan called for `poolOptions.forks.singleFork: true` — that field was removed from `InlineConfig` in Vitest 4 (replaced by a function-based `PoolRunnerInitializer` API). Since A1 proved no flakes, the defensive serialization isn't load-bearing; dropped to keep the config minimal. Final config: `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, `globals: false`, `restoreMocks/clearMocks/unstubEnvs: true`, `pool: 'forks'`, `testTimeout: 5000`, `retry: 0`, `resolve.tsconfigPaths: true` (auto-resolves the `#/*` alias from tsconfig). Setup file: `@testing-library/jest-dom/vitest` import + `afterEach(cleanup)`. Added `@testing-library/jest-dom@^6.9.1` to devDeps. Verified: tsc clean, 10/10 green runs.
- **B2**: Tsconfig `include: ["**/*.ts", "**/*.tsx"]` already matches `vitest.config.ts` and `vitest.setup.ts` at repo root — no edit needed. (Proof: B1's `poolOptions` TS error was caught by the existing config.)
- **B3**: CI yml header trimmed to a single comment line; `Test (Vitest)` step inserted between Typecheck and Build. CONTRIBUTING.md `<a id="tests">` section flipped from "do not gate on tests" to "tests are CI-gated, run locally before PR" — the anchor `#tests` is preserved. Local CI sequence (lint + format + tsc + test) all green. **Pending**: `manual verification on a throwaway branch that an intentionally-broken test fails CI` — user does this since they handle commits/pushes.
- **Post-B3 — tscgo switch**: Added `@typescript/native-preview@7.0.0-dev.20260509.2` (binary `tsgo`) to devDeps. Added `"typecheck": "tsgo --noEmit"` script to package.json. CI typecheck step now runs `bun run typecheck` (so the script is the single source of truth — same command runs locally, in CI, and in any future Makefile). Verified: `bun run typecheck` exit 0; full CI sequence green.
- **Follow-up**: User noted a Makefile wrapping the four gates would be natural once Phase C lands. Deferred — keeps the Phase B diff focused. Suggested target: `verify` = `lint + format + typecheck + test + build`.
- **C0**: Confirmed `useTypingRound` is testable in isolation via `renderHook`. C5/C6 path (auth-gated POST) lives in `play.tsx`'s `handleFinish` (`src/routes/play.tsx:56-93`); user approved extracting it to a pure helper so it can be unit-tested without rendering the route + mocking the router/toast/session.
- **C1–C4 written to**: `src/hooks/useTypingRound.integration.test.ts`. 4 tests, 10/10 green streak.
- **vitest.setup.ts**: added a Proxy-based `AudioContext` stub (jsdom doesn't ship Web Audio; the typing-sound player triggers on every keystroke). Robust against future Web Audio API surface additions.
- **Lifecycle test approach**: pivoted from fake timers to mocking `roundDurationMs` to 100ms via `vi.mock('#/lib/game/constants', ...)` and using real timers + a 250ms wait. Reasons fake timers didn't work: (a) jsdom's `window.setInterval` is a separate reference from `globalThis.setInterval`, which `vi.useFakeTimers` patches — re-aliasing didn't unblock; (b) React 19 + RTL 16 + sinon-fake-timers + the hook's `useEffect`-registered interval interacted badly. Mocking the constant is cheaper to maintain than fighting the interop, and tests run in <300ms.
- **Production-code change (scope creep, flagged & approved by plan)**: `useTypingRound.finishRound` had a stale-closure idempotency check (`if (status === 'finished') return` — `status` captured at render). Under load the polling interval would call `finishRound` multiple times before React flushed the `setStatus('finished')`, firing `onFinish` 2–3× in tests. Replaced with a `hasFinishedRef` ref guard; reset in the language/difficulty effect and `resetRound`. ~5 LOC; fixes a real prod hazard; tests now genuinely assert "exactly once".
- **C5/C6**: extracted `submitFinishedRun` + `describeSubmissionError` to `src/lib/game/score-submission.ts` (pure async helper + pure mapper). Returns a tagged `SubmissionOutcome` (`anon | saved | error`). Route layer (`play.tsx:56-93` → trimmed) calls the helper and translates outcome → setters/toast. Tests in `src/lib/game/score-submission.test.ts`: anon path never invokes submit; auth path calls submit once with a payload that the server's `submitScoreSchema` Zod parses cleanly (strongest contract test); error path captures HTTP status; describeSubmissionError parametric over 401/422/500/503/undefined/400.
- **Phase C summary**: 13 new tests across 2 files. Full suite went 46 → 59 across 6 → 8 files; full local CI sequence (lint + format + typecheck + test) clean; 10× green streak verified.
- **Makefile**: added at repo root with targets `help` (default), `install`, `dev`, `verify`, `lint`, `format`, `format-fix`, `typecheck`, `test`, `build`. Help renders inline target docs (awk + ANSI color). `make verify` chains lint → format → typecheck → test → build, mirroring CI step-for-step. Verified end-to-end. Targets delegate to `bun run <script>` so the package.json scripts stay the single source of truth (no command duplication between Makefile and CI).
- **D1**: Installed `@playwright/test@1.59.1` + chromium binary. Wrote `playwright.config.ts` — testDir `./e2e`, chromium-only, no parallelism/retries, baseURL `http://127.0.0.1:3000`, webServer auto-runs `bun run build && bun run start` (the latter is `bun run server.ts`, prod port 3000 confirmed in `server.ts:11`). Added `playwright-report/` and `test-results/` to `.gitignore` (artifact dirs). The `e2e/` dir itself stays tracked.
- **D2**: Added testids — `current-snippet` + `data-snippet-target` on `SnippetDisplay` root (`snippet-display.tsx:170-175`); `typing-input` on textarea (`play.tsx:303`); `score-readout`/`wpm-readout`/`accuracy-readout`/`snippets-completed`/`time-readout` on the live metrics row (`play.tsx:233-237`); `round-finished` on the `ResultPanel` root (`play.tsx:512`); `share-button` on the copy-result button (`play.tsx:611`). All additive — zero behavior changes. Existing 59 tests still pass.
- **D3**: Wrote `e2e/play-loop.spec.ts` — single test, behavioral assertions, read-then-type pattern. **Deviation**: per-test timeout bumped to 60s via `test.setTimeout(60_000)` because the round duration (30s) is also Playwright's default test timeout, leaving zero headroom for navigation + typing. Local-scope override is cleaner than a global config bump.
- **D4**: Added `e2e` / `e2e:ui` / `e2e:debug` package.json scripts; `e2e` and `e2e-ui` Makefile targets. **Bug-fix in Makefile**: the help-target awk regex `[a-zA-Z_-]+` excluded digits, so `e2e` didn't render in `make help`. Widened to `[a-zA-Z0-9_-]+`. Added an "End-to-end (Playwright)" subsection to CONTRIBUTING.md under the test-suite header — explains the read-then-type pattern, points contributors at `make e2e`/`make e2e-ui`, notes that CI integration is staged.
- **D5**: 10/10 green E2E runs, 33.1–34.2s each. Zero flakes. No fixes needed. Round duration dominates timing, which is expected.
- **D6**: Added a second job `e2e` to `.github/workflows/ci.yml`, parallel to `verify` (separate jobs share no steps; either can fail independently). Steps: checkout → setup-bun → `bun install --frozen-lockfile` → `bunx playwright install --with-deps chromium` (the `--with-deps` flag pulls Linux system libs needed by the browser binary on the GH runner) → `bun run e2e` → on failure, upload `playwright-report/` and `test-results/` as artifacts via `actions/upload-artifact@v4` (14-day retention). YAML validated locally with PyYAML. Updated the file's header comment to mention "vitest + playwright". Branch protection ("require both jobs to pass") is a GitHub UI setting the user toggles when ready.
- **D6 hotfix (post-push)**: First CI run (`098ec07`) failed in the `verify` job's Vitest step. Root cause: Vitest's default include glob (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) **caught `e2e/play-loop.spec.ts`** and tried to execute it as a Vitest test; Playwright's `test()` then errored with "Playwright Test did not expect test() to be called here." Local repro confirmed (8 vitest files passed + 1 Playwright file failed). Fix: added `exclude: [...defaults, 'e2e/**']` to `vitest.config.ts`. Note: providing `exclude` to Vitest replaces the defaults — re-listed the relevant ones (`node_modules`, `dist`, dot-dirs) explicitly. Verified: Vitest now sees 8 files / 59 tests; Playwright still finds the 1 e2e spec; typecheck clean; 5× consecutive green.
- **Lesson logged**: when adding a test file that uses a different runner's globs, re-run the full vitest suite as well — the conflict is invisible until the runner actually loads the file. Originally fell through because Phase D never re-ran `bun run test` after `e2e/play-loop.spec.ts` was created.

## Open questions

- _none yet_

## Task A1 — raw run log

- Run 1: 6 files / 46 tests passed, 233ms
- Run 2: 6 files / 46 tests passed, 210ms
- Run 3: 6 files / 46 tests passed, 203ms
- Run 4: 6 files / 46 tests passed, 218ms
- Run 5: 6 files / 46 tests passed, 207ms
- Verbose run: 6 files / 46 tests passed, 215ms — every individual test listed, no warnings or skipped tests
- **Verdict: deterministic green.**

## Conventions

- Shell ops go through RTK (the hook auto-wraps; or call `rtk` directly).
- Update this file at the END of every task — not end of session.
- Each plan task is self-contained: it can be picked up cold using only the plan + this file.
