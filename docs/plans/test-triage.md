# Test triage

Status as of 2026-05-09. Inputs: A1 verdict (suite is **deterministic green**, 46/46 in ~210ms),
manual inspection of every test file under `src/lib/game/`.

## Per-file classification

| File | Lines | Classification | Reason |
| --- | --- | --- | --- |
| `src/lib/game/scoring.test.ts` | 195 | **keep** | Pure scoring math: prefix matching, snippet boundary, carry-over remainder, multiplier application, rank thresholds. Solid coverage of the most load-bearing logic in the game. |
| `src/lib/game/normalization.test.ts` | 67 | **keep** | Asserts preset-specific behavior (easy strips indent, normal strips newlines, hard preserves both) — these *are* the contract between difficulty modes and the typed value, exactly the kind of regression we want to catch. |
| `src/lib/game/word-regions.test.ts` | 91 | **keep** | Caret/word tokenization drives visual styling and current-word logic. No mocks, fast, behaviorally meaningful. |
| `src/lib/game/indentation.test.ts` | 56 | **keep** | Leading indent width handles tab→space display tokens; this is subtle and easy to break silently. |
| `src/lib/game/difficulty.test.ts` | 42 | **keep** | Earlier audit flagged this as "trivial getters." On second read, the assertions encode the **public contract** of presets (canonical order for UI, default flags, multiplier values, type-guard bounds). Cheap regression net — keep. |
| `src/lib/game/storage.test.ts` | 50 | **expand** | Currently one combined case for `shouldReplaceBest`. The function has a 4-branch decision tree; only 3 branches are exercised. Also: `loadLocalBestScores` / `saveLocalBestScores` / `loadStoredPreferences` / `saveStoredPreferences` are untested. After Phase B (jsdom env locked in), add round-trip tests that double as a smoke check on the new test config. |

## Expand list (Storage.ts gaps)

- `shouldReplaceBest(undefined, next)` → returns `true`.
- `shouldReplaceBest` with equal score + equal accuracy → returns `false` (idempotency).
- `loadLocalBestScores()` returns `{}` when the key is missing.
- `loadLocalBestScores()` returns `{}` when the stored JSON is corrupt (try/catch path).
- `saveLocalBestScores` round-trip: write then read returns the same object (jsdom-dependent — gates Phase B).
- `saveStoredPreferences` merges with existing stored prefs rather than overwriting.

## Integration-test wishlist (Phase C targets)

Mount target chosen in Phase C0 (hook-level vs route-level). Each test below is intentionally
behavioral, not implementation-coupled: they should survive an internal refactor of the hook.

1. **Round lifecycle** — idle → first keystroke flips status to `running` → timer expiry flips to `finished` → `onFinish` fires once with non-zero metrics. Uses `vi.useFakeTimers()`.
2. **Correct keystroke advances score and combo** — type the snippet's first N correct chars; `liveMetrics.score` strictly increases, combo increments, no error styling on rendered word regions.
3. **Incorrect keystroke breaks combo, increments errors** — type a wrong char; error count up, combo reset, visual word-region marking flipped.
4. **Snippet completion advances queue** — complete the active snippet; `snippetsCompleted` increments, next snippet renders, caret resets to 0.
5. **Anonymous run does NOT POST score** — mock `useSession()` → unauthenticated; spy on `submitScoreServerFn`; finish a round; spy not called.
6. **Authenticated run POSTs once with expected payload** — mocked authed session; spy `submitScoreServerFn`; finish round; called exactly once with `{ score, accuracy, language, difficulty }` (use the Zod schema from `src/server/...` if one exists).

## Deletions

None. The original suspicion that `difficulty.test.ts` was deletable did not survive a careful read.

## Notes for B-phase

- The "known-flaky" warning in `CONTRIBUTING.md:52-58` and the cautionary header in `.github/workflows/ci.yml:3-9` are **stale**. They describe a state the suite is no longer in. B3 flips them.
- All tests today are pure-function — they do not require jsdom. Adding `vitest.config.ts` with `environment: 'jsdom'` (B1) is forward-looking for the storage expansions and Phase C; it does not retroactively change behavior for the existing tests.
