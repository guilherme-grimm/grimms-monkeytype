# Validated-Mango Overhaul — Grimm's MonkeyType

## Context

Project validated. This is a UI/UX foundation pass focused on the **core gameplay loop** before survival mode (the next milestone). Today the typing test is functionally complete but flat: no difficulty options, a buggy-feeling reset button, only 5 languages hardcoded into a TS file, basic per-keystroke feedback, and an immersion model that fades chrome on type but doesn't *escalate*.

Goals, in priority order:
1. **Difficulty preset** (Easy/Normal/Hard) backed by granular flags, with a gentle score multiplier so all skill levels feed one leaderboard.
2. **Reset / Run-It-Back UX** — fix the dimmed-button bug and split "new snippet" from "replay same snippet."
3. **Languages** — migrate snippets to JSON, add Kotlin/Ruby/PHP (player-requested).
4. **Reactions** — three layers (per-keystroke / combo-event / run-end) plus a streak-driven **immersion escalation** that tunnels the player in as performance climbs and snaps back on error.
5. Survival mode is **out of scope**; primitives shaped to accept it later.

## Decisions locked

| Branch | Decision |
|---|---|
| Difficulty model | Granular flags (`autoSkipNewlines`, `indentMode: auto/tab-helper/literal`) behind 3 presets (Easy/Normal/Hard). Modular so independent toggles can be exposed later. |
| Score multiplier | Gentle: **0.85 / 1.0 / 1.25**. Applied to `score` only — WPM/CPM stay mechanically truthful. |
| Leaderboard | One aggregated board per language. `score.mode` stores preset; `score.multiplier` stored alongside so rebalances don't rewrite history. |
| Reset semantics | Mid-run **Reset Run** (Tab/button) → new snippet (current behavior). Post-finish **Run It Back** (Space) → replay same snippet. Post-finish **Next Snippet** (Enter) → new snippet. |
| Reset button bug | `.run-controls-active` opacity 0.24 fades the whole bar including the button. Fix: keep 0.24 on helper text only; button stays ≥0.7. |
| Languages | Code-only. Migrate to `data/snippets/<lang>.json`. Launch set: js, ts, python, go, java, **kotlin, ruby, php**. |
| Reactions | L1 per-keystroke polish + L2 combo/event + L3 run-end rank/PB. In-genre (phosphor/CRT/glitch only — no emoji, no confetti). Mascot deferred. |
| Immersion escalation | First-class concept: `streakIntensity` 0–1 derived from correct-streak, drives vignette / chrome opacity / caret glow / audio gain via a `--immersion-level` CSS var. Error → brief snap-back. |
| Difficulty selector UI | Primary: home page beside the language pill. Secondary: settings drawer behind a header gear icon (also future home for granular flags). |
| Survival mode | Next milestone. Plan ensures multiplier composition and streak state are reusable. |

## Implementation outline

Order of work is bottom-up (data → logic → UI → polish) so each phase compiles green.
**Step 0 runs before anything else** — there's evidence the leaderboard is currently single-user, which strongly suggests auth or score-submission is broken in production. Shipping the overhaul on top of a broken auth flow would mask both bugs.

### 0. Auth + score-submission infra verification *(blocker for everything below)*

**Symptom:** project owner is the only entry on the leaderboard. **Production:** `typer.grimm0.dev`, Docker on Coolify, SQLite at `/app/data/app.db` declared as a `VOLUME` in the Dockerfile.

#### What I confirmed by reading code

- `src/server/auth.ts:11–29` — better-auth config: `baseURL` reads `BETTER_AUTH_URL`, GitHub provider only if both client id + secret present, drizzle adapter, **no explicit `trustedOrigins`, no explicit cookie config**. Defaults *should* be OK for same-origin, but the failure mode is silent.
- `src/routes/api/scores.ts:10` — POST handler reads session via `auth.api.getSession({ headers: request.headers })`. Returns 401 if no session. Correct logic; fails invisibly upstream.
- `src/server/scores.ts:50–116` — server validates payload with Zod, recomputes metrics server-side (per HANDOFF validation philosophy), inserts into `score`, updates `bestScore` for the user. Solid; not the bug surface.
- `src/server/scores-client.ts:25–27` — **swallows the response status**: throws generic `'Failed to submit score'` whether server returned 401, 422, or 500. **This is why the bug is invisible.**
- `src/routes/play.tsx:37–53` — `handleFinish` shows generic `'Failed to save score. Try again.'` toast on any catch. Same swallowing problem at the UI layer.
- `Dockerfile:19,29–31` — `DATABASE_PATH=/app/data/app.db`, `VOLUME /app/data`. Volume is *declared*; whether it's actually mounted as persistent in Coolify is an external config we cannot see from here.
- `server.ts:9` — `migrate(db, { migrationsFolder: './drizzle' })` runs on every boot. Schema stays current across deploys.

#### Hypothesis ranking (after reading the code)

| # | Hypothesis | Likelihood | Why |
|---|---|---|---|
| **A** | Coolify volume on `/app/data` is not actually persistent → DB wipes on each redeploy | **High** | Dockerfile *declares* VOLUME but Coolify still has to mount a real persistent volume at the path. If it's not configured, you get "only my recent runs" exactly because the owner re-signs-in and re-plays after every deploy. Fits the symptom precisely. |
| **B** | `BETTER_AUTH_URL` not set (or set wrong) in Coolify env → falls back to `http://localhost:3000` | High | Cookies get scoped to `localhost`, OAuth redirect to `localhost` → other users' sign-in literally fails in the browser. Owner may have a stale session locally that papered over this. |
| **C** | GitHub OAuth app callback URL doesn't include `https://typer.grimm0.dev/api/auth/callback/github` | Medium-High | Same symptom as (B): OAuth completes on GitHub side, callback 404s on app side. External config — only the user can verify in GitHub OAuth app settings. |
| **D** | Generic `'Failed to submit score'` swallowing real errors | Medium *(amplifier)* | Even if A/B/C are fine, any 401 or 500 looks identical to the user. People stop retrying. Fix this regardless. |
| **E** | Missing explicit `trustedOrigins` causing CSRF rejection on POST | Low–Medium | Defaults should work for same-origin, but worth pinning explicitly. |
| **F** | Cookie config — missing `secure: true` / `sameSite: 'lax'` for HTTPS prod | Low | Same reason; defaults work but explicit is safer. |

#### Diagnostic actions, in order

These are **investigations**, not fixes. Don't change config until the answer is known.

1. **Confirm Coolify volume persistence (highest leverage).**
   - User opens Coolify → app → Storage / Volumes — confirm a persistent volume is mounted at `/app/data`.
   - Quick proof: SSH into the running container (or use Coolify exec): `ls -la /app/data && sqlite3 /app/data/app.db "SELECT COUNT(*) FROM user; SELECT COUNT(*) FROM score; SELECT email, createdAt FROM user ORDER BY createdAt DESC LIMIT 10;"`
   - If `user` count > 1 but `score` count is small → sign-in works, submission breaks (jump to D/E/F).
   - If `user` count == 1 → either no other users have tried to sign in, or sign-in fails (B/C).

2. **Confirm production env vars in Coolify.**
   - User reads back the app's runtime env. Required: `BETTER_AUTH_URL=https://typer.grimm0.dev`, `BETTER_AUTH_SECRET=<set>`, `GITHUB_CLIENT_ID=<set>`, `GITHUB_CLIENT_SECRET=<set>`, `DATABASE_PATH=/app/data/app.db` (already in Dockerfile but explicit is safer).
   - Wrong / missing `BETTER_AUTH_URL` is the smoking gun for (B).

3. **Confirm GitHub OAuth callback URL.**
   - github.com/settings/developers → the OAuth app → Authorization callback URL must be exactly `https://typer.grimm0.dev/api/auth/callback/github`. Multiple URLs are allowed; localhost can stay there for dev.

4. **Live reproduction.**
   - User opens `typer.grimm0.dev` in a fresh incognito window with a *different* GitHub account, opens DevTools → Network, signs in.
   - Watch: `GET /api/auth/sign-in/github` → 302 to GitHub → callback `GET /api/auth/callback/github?code=...` → should be 302 to `/`. If it's anything else (404, 500, redirect to wrong host) we have our answer.
   - If sign-in succeeds, complete a run. Watch `POST /api/scores`. Expect 200. If it's 401, session cookie isn't reaching the server — auth or cookie config issue.
   - Capture the response body or Coolify logs around that timestamp.

5. **Inspect the production DB after the live test.**
   - Same SQL as step 1. Did the new `user` row appear? Did the `score` row appear? Did `bestScore` update?

#### Code changes (apply only what diagnostics confirm)

These are *small, targeted, and most are worth doing regardless* because they make future failures loud.

**Always apply (visibility hardening — not a fix per se, but a prerequisite for diagnosing future regressions):**

- `src/server/scores-client.ts:25-27` — surface the HTTP status and response text in the thrown error:
  ```ts
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Score submit failed (${response.status}): ${body || response.statusText}`)
  }
  ```
- `src/routes/play.tsx:49-52` — log the actual error to console *and* include status in the toast (e.g. `Failed to save score (401). Sign in again?`). Distinguish 401 (signed-out / cookie not reaching server) from 5xx (server bug) in the toast copy.
- `src/server/auth.ts` — log a one-line warning at boot if `BETTER_AUTH_URL` falls back to `http://localhost:3000` while `NODE_ENV === 'production'`. Cheap, catches misconfigured deploys instantly.
- `src/routes/api/scores.ts` — wrap the body in try/catch around `submitAuthenticatedScore`; on Zod parse error return 422 with a structured error; on other errors return 500 with a generic message *and* `console.error` the full stack. Today an exception bubbles to the framework's default handler.

**Apply if (B) confirmed:**

- Set `BETTER_AUTH_URL=https://typer.grimm0.dev` in Coolify env. Redeploy. (No code change required; the code already reads it.)

**Apply if (C) confirmed:**

- Update GitHub OAuth app callback URL. (External; no code.)

**Apply if (A) confirmed:**

- Add a persistent volume in Coolify mounted at `/app/data`. After mount, redeploy and re-verify with the live test in step 4. (External; no code.)
- *Optional follow-up:* migrate to Turso (hosted LibSQL) so persistence isn't a Coolify-config single point of failure. Out of scope for this overhaul unless persistence keeps biting us.

**Apply defensively regardless (cheap, narrows future debug surface):**

- `src/server/auth.ts` — pin `trustedOrigins` and cookie config explicitly:
  ```ts
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        },
      },
    },
  },
  ```
  (Exact field names per better-auth v1.6 API; verify against `node_modules/better-auth/dist/...` types before committing.)

#### Verification harness (one-time, kept for future deploys)

- New `src/routes/api/health.ts` — server route that returns `{ db: 'ok', users: <count>, scores: <count>, baseURL: process.env.BETTER_AUTH_URL, env: process.env.NODE_ENV }`. Public, read-only counts, no PII. After each deploy, hit `https://typer.grimm0.dev/api/health` to verify DB is the persistent one (counts shouldn't reset on redeploy) and env is set correctly.
- This is the canary that would have caught the current bug on day one.

#### Step 0f — wire up the better-auth Dashboard plugin *(small follow-up)*

**Symptom:** the better-auth Dashboard at `https://dash.better-auth.com` (or wherever you've pointed it) shows "Connection Failed" with `GET https://typer.grimm0.dev/api/auth/dash/config returned 404`.

**Root cause:** `@better-auth/infra` is in `package.json:dependencies` and `BETTER_AUTH_API_KEY` is in the local `.env`, but the `dash()` plugin was never added to `auth.ts`. Without the plugin registered, better-auth's router never mounts the `/api/auth/dash/*` endpoints, so the dashboard's config probe 404s.

**Fix in `src/server/auth.ts`:**

1. Add the import alongside the existing better-auth imports:
   ```ts
   import { dash } from '@better-auth/infra'
   ```
2. Add `dash()` to the existing plugins array — order matters less here, but keep `tanstackStartCookies()` last so its cookie handling wraps everything:
   ```ts
   plugins: [dash(), tanstackStartCookies()],
   ```

That's the entire code change. The plugin reads `BETTER_AUTH_API_KEY` from env automatically.

**Coolify env requirement:** ensure `BETTER_AUTH_API_KEY` is set in the production environment (it's in local `.env` but may not have been copied to the Coolify dashboard alongside the other auth vars). The value from local `.env` is `ba_mfa3nxhs0hr6pyrub98gdo1fvfbb4lj6` — same key, just needs to be present in the prod env.

**Verification after redeploy:**
- `curl https://typer.grimm0.dev/api/auth/dash/config` should return 200 with a JSON body (not 404).
- Reload the dashboard UI — "Connection Failed" should clear.
- `/api/health` should still return 200 — confirms we didn't accidentally break boot.

#### Exit criteria for Step 0

All four must be true before starting Step 1:

1. A **second** GitHub account (not the owner's) signs in on `typer.grimm0.dev` and lands on the leaderboard within seconds of finishing a run.
2. After a redeploy, that second account's score still appears (DB persistence proven).
3. `/api/health` reports `users >= 2`, `scores >= 2`, and `baseURL` matches the production origin.
4. A submission failure (artificial — e.g. sign out and try to submit) shows a *specific* toast (`Failed (401)`) rather than the generic `Failed to submit score`.

### 1. Snippet JSON migration *(no behavior change)*
- Create `data/snippets/{javascript,typescript,python,go,java,kotlin,ruby,php}.json` (≥5 snippets each).
- Refactor `src/lib/game/snippets.ts` to load JSON via Vite raw imports; keep public API (`getInitialSnippet`, `getRandomSnippet`) stable.
- Add `kotlin`, `ruby`, `php` to `languages` const at `src/lib/game/types.ts:1`.

### 2. Difficulty flags + presets *(new module)*
- New `src/lib/game/difficulty.ts`:
  - `type DifficultyFlags = { autoSkipNewlines: boolean; indentMode: 'auto' | 'tab-helper' | 'literal' }`
  - `type DifficultyPreset = 'easy' | 'normal' | 'hard'`
  - `presetToFlags(preset)`, `presetMultiplier(preset)` → 0.85 / 1.0 / 1.25
- Extend `StoredPreferences` at `src/lib/game/storage.ts:41` with `difficultyPreset`.
- Thread flags through `useTypingRound` (`src/hooks/useTypingRound.ts`): replace hardcoded behavior in `handleValueChange` (161–215) and `consumeIndentationWithTab` (217–226) with flag branches.

### 3. Multiplier + rank in scoring
- Update `calculateRoundMetrics` at `src/lib/game/scoring.ts:21` to accept `multiplier`, return `{ cpm, wpm, accuracy, baseScore, multiplier, score }` where `score = baseScore × multiplier`.
- Add `rankFor(score) → 'D'|'C'|'B'|'A'|'S'` (thresholds calibrated against existing `bestScore` distribution).
- Drizzle migration: add `multiplier REAL NOT NULL DEFAULT 1.0` to the `score` table (`src/server/auth-schema.ts`); existing rows correctly backfill to 1.0 since they were standard.
- Update `submitScoreServerFn` (`src/routes/api/scores.ts`) and projections in `src/server/leaderboard.ts:20–70` to carry `mode` + `multiplier`.

### 4. Reset / Run-It-Back split
- In `src/hooks/useTypingRound.ts`, add `replayCurrentSnippet()` — clears state but keeps `currentSnippet` (no pool draw).
- `src/routes/play.tsx:249` keeps `Reset Run` → `resetRound()`.
- Result panel (`play.tsx:268+`) gets two buttons: **Run It Back** (`replayCurrentSnippet`) + **Next Snippet** (`startFreshRun`).
- `src/hooks/useGlobalTypingKeys.ts:29–31`: post-finish Space → `replayCurrentSnippet`, Enter → `startFreshRun`.

### 5. Reset-button visibility fix
- `src/styles.css:240`: scope the 0.24 opacity to `.run-controls-active > span` (helper labels) only. Buttons stay at 0.7 mid-run, 1.0 on hover.

### 6. Reactions L1 / L2 / L3
- **L1** — extend `src/lib/game/typing-sound.ts` with streak-driven pitch modulation (small upward semitone steps every 10 correct chars, reset on error); strengthen error pulse in `styles.css:314`; 1px micro-shake keyframe on wrong key.
- **L2** — new `src/components/game/ComboCounter.tsx` reading `correctStreak` from `useTypingRound`; appears at 10, glows/scales at 25 / 50. Snippet-cleared CRT-sweep keyframe in `styles.css`. Error-streak (3 wrong in last 5) triggers a red-edge flicker class.
- **L3** — new `src/components/game/RankBadge.tsx` for the result panel rendering the rank letter with a phosphor-burst keyframe. PB detection (compare against `bestScore` from `storage.ts`) adds a full-screen flash + glitch-text "NEW BEST" callout.

### 7. Immersion escalation *(the experiential glue)*
- Add `streakIntensity: number` (0–1) to `useTypingRound` state — derived curve, e.g. `min(1, correctStreak / 60)`.
- Apply as inline CSS var on `.run-shell`: `style={{ '--immersion-level': streakIntensity }}`.
- Drive in `styles.css` via the var: vignette darkness, header/stats opacity, caret glow strength (compose with existing `caret-pulse`), and an audio gain hook (read in `typing-sound.ts`).
- On error: add `.run-shell-snap` (120ms zoom-out + audio dip) then return to baseline.

### 8. Home page + settings drawer
- `src/routes/index.tsx`: add difficulty pill row beside language pill; both persist via `storage.ts`.
- New `src/components/SettingsDrawer.tsx` opened by a header gear icon. Surfaces: difficulty preset (mirrored from home), typing sound toggle, **(stub for future granular flags)**.

### 9. Result panel rework
- `play.tsx:268+ ResultPanel`: show `baseScore × multiplier = score`, mount `<RankBadge />`, render PB callout when applicable, swap single-restart for Run-It-Back + Next Snippet.

### 10. Leaderboard page
- `src/routes/leaderboard.tsx`: add Difficulty + Multiplier columns; highlight signed-in user's row when in top 25, otherwise show "Your rank: #N" footer (extra query).
- Match projection in `src/server/leaderboard.ts`.

### 11. Content authoring
- ≥5 snippets each for Kotlin, Ruby, PHP. Pick canonical patterns (e.g. data-class, ActiveRecord-ish callback, Laravel-ish controller stub) so the language *feels* like itself.

## Critical files

**Step 0 (auth verification — read first, edit only if needed):**
- `src/server/auth.ts` — better-auth config (`baseURL`, `trustedOrigins`, GitHub provider)
- `src/server/auth-schema.ts` — table definitions
- `src/routes/api/scores.ts` — session check + insert
- `src/server/scores.ts`, `src/server/scores-client.ts` — submission path
- `src/routes/play.tsx:37–53` — client-side submission + error surfacing
- Deploy config (Dockerfile / fly.toml / vercel.json / etc. — TBD)
- GitHub OAuth app settings (external — user verifies)
- `.env` keys present per user; we confirm shape, not values

**Existing (modify) for the overhaul itself:**
- `src/hooks/useTypingRound.ts` — flags, replay, streakIntensity
- `src/hooks/useGlobalTypingKeys.ts` — post-finish keybinds
- `src/lib/game/scoring.ts` — multiplier, rank
- `src/lib/game/snippets.ts` — JSON loader
- `src/lib/game/storage.ts` — `difficultyPreset` pref
- `src/lib/game/types.ts` — language list
- `src/lib/game/typing-sound.ts` — streak pitch + immersion gain
- `src/routes/play.tsx` — result panel + immersion var
- `src/routes/index.tsx` — difficulty selector
- `src/routes/leaderboard.tsx` — columns
- `src/routes/api/scores.ts` — multiplier in payload
- `src/server/leaderboard.ts` — projection
- `src/server/auth-schema.ts` — `multiplier` column + Drizzle migration
- `src/styles.css` — reset fix, reaction keyframes, `--immersion-level`

**New:**
- `src/lib/game/difficulty.ts`
- `src/components/SettingsDrawer.tsx`
- `src/components/game/ComboCounter.tsx`
- `src/components/game/RankBadge.tsx`
- `data/snippets/{javascript,typescript,python,go,java,kotlin,ruby,php}.json`

## Verification

**Step 0 (auth):**
- A second GitHub account signs in on the deployed site, completes a run, and sees their entry on the leaderboard within seconds.
- The same entry is still present after a redeploy (DB persistence).
- Submission failures surface to the user, not just to console.

**Automated:**
- Unit: `scoring.test.ts` covers multiplier math and `rankFor` thresholds; `difficulty.test.ts` covers preset → flags + preset → multiplier.
- Type-check + Drizzle migration applies cleanly against an existing DB; existing rows show `multiplier=1.0`.

**Manual end-to-end:**
- Each preset (Easy/Normal/Hard) typed on at least 3 languages; confirm flag-driven indent/newline behavior matches preset.
- Result panel shows `wpm × multiplier = score` math; rank letter renders; PB callout fires when bestScore is exceeded.
- **Run-It-Back replays same snippet; Next Snippet draws a new one** — assert via the snippet `id`.
- **Reset Run mid-run is visually obviously clickable** (no >0.4 opacity drop on the button itself).
- Combo counter appears at 10 streak, escalates at 25/50, resets on error.
- Immersion escalation: chrome dims and vignette tightens noticeably by streak ≈ 30; error triggers visible snap-back without breaking input cadence.
- Leaderboard shows Difficulty + Multiplier columns; signed-in user's rank highlights or shows in footer.
- Existing scores display correctly (multiplier=1.0 → no math change).
- Difficulty selector reachable from home pill **and** gear-drawer; both persist across reload.

**HN-readiness scrub:** 8 languages live, difficulty selector visible above the fold on home, immersion feels deliberate (record a 30s clip), no console errors.

## Explicitly out of scope

- Survival mode (next milestone — primitives are ready)
- English / prose typing mode
- Custom themes / theme picker
- Account profile pages
- Mobile / touch input
- Mascot or character art
- Social share UI (hooks may be stubbed but no surface)
