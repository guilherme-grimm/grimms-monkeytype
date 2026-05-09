import { createFileRoute, Link } from '@tanstack/react-router'
import { type MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'

import { AuthChip } from '#/components/auth/auth-chip'
import { ComboCounter } from '#/components/game/combo-counter'
import { RankBadge } from '#/components/game/rank-badge'
import { SnippetDisplay } from '#/components/game/snippet-display'
import { SettingsButton } from '#/components/settings-button'
import { SettingsDrawer } from '#/components/settings-drawer'
import { useToast } from '#/components/ui/toast'
import { useGlobalTypingKeys } from '#/hooks/useGlobalTypingKeys'
import { useTypingRound } from '#/hooks/useTypingRound'
import { useSession } from '#/lib/auth-client'
import {
  DEFAULT_DIFFICULTY,
  type DifficultyPreset,
  isDifficultyPreset,
} from '#/lib/game/difficulty'
import { isSupportedLanguage } from '#/lib/game/normalization'
import { describeSubmissionError, submitFinishedRun } from '#/lib/game/score-submission'
import { countMatchingPrefix, rankFor } from '#/lib/game/scoring'
import { loadStoredPreferences, saveStoredPreferences, shouldReplaceBest } from '#/lib/game/storage'
import type { LanguageId, LocalBestScore, RoundMetrics } from '#/lib/game/types'
import { buildShareText } from '#/lib/share/copy'
import { submitScoreServerFn } from '#/server/scores-client'

export const Route = createFileRoute('/play')({
  validateSearch: (search) => ({
    language: isSupportedLanguage(search.language) ? search.language : 'javascript',
  }),
  component: PlayRoute,
})

function PlayRoute() {
  const { language } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: session } = useSession()
  const { showToast } = useToast()
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [lastFinishedResult, setLastFinishedResult] = useState<{
    metrics: RoundMetrics
    elapsedMs: number
  } | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'anon'>(
    'idle',
  )
  // Holds the in-flight save promise so the share button can await it without
  // racing the React state machine. Resolves to a scoreId on success or null
  // on anon/error — share callers fall back to text-only when null.
  const savePromiseRef = useRef<Promise<string | null> | null>(null)

  function focusInput() {
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.setSelectionRange(round.typedValue.length, round.typedValue.length)
  }

  const handleFinish = useCallback(
    async (result: LocalBestScore, elapsedMs: number) => {
      setLastFinishedResult({ metrics: result, elapsedMs })
      const isAuthed = !!session?.user

      if (!isAuthed) {
        setSubmitStatus('anon')
        savePromiseRef.current = Promise.resolve(null)
        return
      }

      setSubmitStatus('saving')
      const promise = submitFinishedRun({
        result,
        elapsedMs,
        isAuthed,
        submitScore: submitScoreServerFn,
      }).then((outcome) => {
        if (outcome.kind === 'saved') {
          setSubmitStatus('saved')
          showToast('Score saved to leaderboard!', 'success')
          return outcome.scoreId
        }
        if (outcome.kind === 'error') {
          setSubmitStatus('error')
          console.error('Score submission failed', outcome.cause)
          showToast(describeSubmissionError(outcome.httpStatus), 'error')
        }
        return null
      })

      savePromiseRef.current = promise
      await promise
    },
    [session?.user, showToast],
  )

  // Start with the default so SSR and the first client render match. After
  // hydration, swap in the user's stored preference. Reading localStorage
  // during render produced a hydration mismatch in <SnippetDisplay> because
  // the server has no storage but the client did, and the snippet token
  // shape differs between presets (Hard counts \n, others don't).
  const [difficulty, setDifficulty] = useState<DifficultyPreset>(DEFAULT_DIFFICULTY)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    const stored = loadStoredPreferences()
    if (isDifficultyPreset(stored?.difficultyPreset)) {
      setDifficulty(stored.difficultyPreset)
    }
  }, [])

  function handleDifficultyChange(next: DifficultyPreset) {
    setDifficulty(next)
    // useTypingRound watches difficulty; the change effect resets the round
    // with a fresh snippet draw, which is what the player wants when they
    // dial the difficulty during a session.
    saveStoredPreferences({ difficultyPreset: next })
  }

  const round = useTypingRound({
    language,
    difficulty,
    onSnippetAdvance: () => requestAnimationFrame(focusInput),
    onResetFocus: () => requestAnimationFrame(focusInput),
    onFinish: handleFinish,
  })

  useGlobalTypingKeys({
    status: round.status,
    typedValue: round.typedValue,
    isInputFocused: () => document.activeElement === inputRef.current,
    focusInput,
    onPrintable: round.handleValueChange,
    onTab: round.consumeIndentationWithTab,
    onEscapeReset: round.resetRound,
    onSpaceReplay: round.replayCurrentSnippet,
    onEnterNextSnippet: () => round.startFreshRun(),
  })

  useEffect(() => {
    if (round.status !== 'finished') {
      setSubmitStatus('idle')
      setLastFinishedResult(null)
      savePromiseRef.current = null
    }
  }, [round.status])

  // biome-ignore lint/correctness/useExhaustiveDependencies: focus on mount only; focusInput closes over fresh refs each render but we intentionally don't re-fire
  useEffect(() => {
    requestAnimationFrame(() => focusInput())
  }, [])

  const progressCount = countMatchingPrefix(round.typedValue, round.currentSnippet.normalized)
  const completionRatio =
    round.currentSnippet.normalized.length === 0
      ? 0
      : progressCount / round.currentSnippet.normalized.length
  const isActive = round.status === 'active'
  const isFinished = round.status === 'finished'

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header
        className={`flex flex-wrap items-start justify-between gap-4 pb-5 transition-all duration-200 ${
          isActive
            ? 'border-b border-transparent opacity-55'
            : 'border-b border-[var(--color-border-soft)]'
        }`}
      >
        <div>
          <Link
            to="/"
            className="eyebrow terminal-text no-underline"
            search={{ language: undefined }}
          >
            typer.grimm0.dev
          </Link>
          <h1
            className={`mt-2 font-semibold transition-all duration-200 ${
              isActive
                ? 'text-lg text-[var(--color-muted)] sm:text-xl'
                : 'text-2xl text-[var(--color-text-strong)] sm:text-3xl'
            }`}
          >
            Thirty seconds. No distractions.
          </h1>
          <p
            className={`mt-2 text-sm transition-opacity duration-200 ${
              isActive ? 'text-[var(--color-muted)]/70' : 'text-[var(--color-muted)]'
            }`}
          >
            Type straight through. [Tab] only jumps leading indentation.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="pixel-border bg-[rgba(47,125,50,0.12)] px-3 py-1 text-[var(--color-primary-glow)]">
            {language}
          </span>
          <span className="pixel-border bg-[rgba(47,125,50,0.08)] px-3 py-1 text-[var(--color-muted)]">
            {difficulty}
          </span>
          <button
            type="button"
            className={round.typingSoundEnabled ? 'button-accent' : 'button-secondary'}
            onClick={() => round.setTypingSoundEnabled((value) => !value)}
          >
            sound {round.typingSoundEnabled ? 'on' : 'off'}
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => navigate({ to: '/', search: { language } })}
          >
            Change language
          </button>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
          <AuthChip />
        </div>
      </header>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        difficulty={difficulty}
        onDifficultyChange={handleDifficultyChange}
        typingSoundEnabled={round.typingSoundEnabled}
        onTypingSoundChange={(next) => round.setTypingSoundEnabled(next)}
      />

      <section
        className={`stats-strip mt-6 flex items-center justify-between gap-4 px-4 py-3 transition-all duration-200 ${
          isActive ? 'opacity-46' : 'opacity-100'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span data-testid="time-readout">time {(round.remainingMs / 1000).toFixed(1)}</span>
          <span data-testid="score-readout">score {round.liveMetrics.score}</span>
          <span data-testid="wpm-readout">wpm {round.liveMetrics.wpm.toFixed(1)}</span>
          <span data-testid="accuracy-readout">accuracy {round.liveMetrics.accuracy}%</span>
          <span data-testid="snippets-completed">snippets {round.snippetsCompleted}</span>
        </div>
        <div className="hidden min-w-40 overflow-hidden bg-[rgba(255,255,255,0.06)] sm:block">
          <div
            className="h-1.5 bg-[var(--color-primary-glow)] transition-[width]"
            style={{ width: `${Math.min(100, completionRatio * 100)}%` }}
          />
        </div>
      </section>

      <section
        className={`run-shell scan-lines relative mt-6 flex min-h-[32rem] flex-col gap-8 px-5 py-7 sm:px-10 sm:py-10 ${
          isActive
            ? 'run-shell-active'
            : isFinished
              ? 'run-shell-finished panel'
              : 'run-shell-idle panel'
        }`}
        data-error-token={round.errorPulseToken}
        data-cleared-token={round.snippetClearedToken}
        style={{ ['--immersion-level' as string]: round.streakIntensity.toFixed(3) }}
        onClick={focusInput}
      >
        {round.showOnboarding && round.status === 'idle' ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center px-4 pt-8 sm:pt-12">
            <div className="pointer-events-auto w-full max-w-xl panel bg-[rgba(10,10,10,0.97)]">
              <div className="terminal-header">
                <div className="terminal-dots text-[var(--color-accent-glow)]">
                  <span />
                  <span className="text-yellow-400" />
                  <span className="text-[var(--color-primary-glow)]" />
                </div>
                <span className="terminal-title">~/typer/quickstart.txt</span>
              </div>
              <div className="space-y-4 px-5 py-5 text-sm sm:text-base">
                <p className="eyebrow text-[var(--color-accent-glow)]">quick rules</p>
                <p className="text-[var(--color-text-strong)]">
                  Thirty seconds. Type the code exactly as shown.
                </p>
                <div className="space-y-2 text-[var(--color-muted)]">
                  <p>Line breaks are visual only.</p>
                  <p>Spaces still count.</p>
                  <p>[Tab] jumps leading indentation, [Esc] aborts the run.</p>
                  <p>
                    After the result: `Space` runs the same snippet back, `Enter` pulls a new one.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    className="button-primary"
                    onClick={round.dismissOnboarding}
                  >
                    Got it
                  </button>
                  <button type="button" className="button-accent" onClick={round.dismissOnboarding}>
                    Start typing
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <textarea
          ref={inputRef}
          data-testid="typing-input"
          value={round.typedValue}
          onChange={(event) => round.handleValueChange(event.target.value)}
          onBlur={() => {
            requestAnimationFrame(() => focusInput())
          }}
          onSelect={() => {
            inputRef.current?.setSelectionRange(round.typedValue.length, round.typedValue.length)
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="pointer-events-none absolute inset-0 h-full w-full resize-none opacity-0"
          aria-label="Typing input"
        />

        <div
          className={`run-meta flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] ${
            isActive ? 'run-meta-active' : ''
          }`}
        >
          <span>
            {round.status === 'idle' ? 'ready' : round.status === 'active' ? 'live' : 'complete'}
          </span>
          <span>
            {round.bestScore
              ? `best ${round.bestScore.score}`
              : session?.user
                ? 'signed in'
                : 'no local best yet'}
          </span>
        </div>

        <div
          className={`mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center ${isActive ? 'pt-14' : 'pt-4'} ${
            round.showOnboarding && round.status === 'idle' ? 'opacity-35' : ''
          }`}
        >
          <SnippetDisplay
            key={round.currentSnippet.id}
            currentSnippet={round.currentSnippet}
            upcomingSnippet={round.upcomingSnippet}
            typedValue={round.typedValue}
          />
        </div>

        <ComboCounter
          streak={round.correctStreak}
          errorPulseToken={round.errorPulseToken}
          snippetClearedToken={round.snippetClearedToken}
        />

        {round.status !== 'finished' || !round.finalMetrics ? (
          <div
            className={`run-controls mt-auto flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)] ${
              isActive ? 'run-controls-active' : ''
            }`}
          >
            <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              {round.status === 'idle' ? 'Focus and start typing' : 'Keep typing'}
            </span>
            {/* <button type="button" className="button-secondary" onClick={focusInput}> */}
            {/*   {round.status === 'idle' ? 'Focus and start typing' : 'Keep typing'} */}
            {/* </button> */}
            <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              typed {round.typedValue.length} / {round.currentSnippet.normalized.length}
            </span>
            <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              tab = indent
            </span>
            <button
              type="button"
              className="button-secondary"
              onClick={round.resetRound}
              title="Abort this run and pull a new snippet [Esc]"
            >
              Reset run
            </button>
          </div>
        ) : (
          <ResultPanel
            metrics={round.finalMetrics}
            bestScore={round.bestScore}
            isPersonalBest={round.isPersonalBest}
            language={language}
            onReplay={round.replayCurrentSnippet}
            onNextSnippet={round.startFreshRun}
            submitStatus={submitStatus}
            lastResult={lastFinishedResult}
            savePromiseRef={savePromiseRef}
          />
        )}
      </section>
    </main>
  )
}

function ResultPanel(props: {
  metrics: RoundMetrics
  bestScore: LocalBestScore | null
  isPersonalBest: boolean
  onReplay: () => void
  onNextSnippet: () => void
  language: LanguageId
  submitStatus: 'idle' | 'saving' | 'saved' | 'error' | 'anon'
  lastResult: { metrics: RoundMetrics; elapsedMs: number } | null
  savePromiseRef: MutableRefObject<Promise<string | null> | null>
}) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const [awaitingShare, setAwaitingShare] = useState(false)

  const candidate: LocalBestScore = {
    ...props.metrics,
    language: props.language,
    achievedAt: new Date(0).toISOString(),
  }
  const isNewBest = shouldReplaceBest(props.bestScore ?? undefined, candidate)
  const bestLabel = !props.bestScore
    ? 'First local score saved.'
    : isNewBest
      ? 'Local best locked in.'
      : `Local best stays at ${props.bestScore.score}.`

  const submitStatusText =
    props.submitStatus === 'saving'
      ? 'Saving score to leaderboard...'
      : props.submitStatus === 'saved'
        ? 'Score saved to global leaderboard.'
        : props.submitStatus === 'error'
          ? 'Could not save score to server.'
          : props.submitStatus === 'anon'
            ? 'Sign in to save scores to the global leaderboard.'
            : null

  const fallbackShareText = `I just scored ${props.metrics.score} points!\n${props.metrics.wpm.toFixed(1)} WPM • ${props.metrics.accuracy.toFixed(1)}% accuracy • ${props.metrics.snippetsCompleted} snippets in ${props.language}`
  const siteUrl = 'https://typer.grimm0.dev'

  // Returns the tweet text to use given a resolved scoreId. When scoreId is
  // null (anon, save error, or save still pending and we don't want to wait)
  // we fall back to today's stats-as-text + bare site URL — Twitter unfurls it
  // to the homepage card instead of a per-run card.
  function buildOutgoingText(scoreId: string | null): string {
    if (!scoreId) return `${fallbackShareText}\n${siteUrl}`
    const url = `${siteUrl}/r/${scoreId}`
    return buildShareText(rankFor(props.metrics.score), url)
  }

  // Resolve the scoreId without racing the save: if the save is in flight,
  // await it; if it never started (anon) or failed (error), return null and
  // let the caller fall back to text-only.
  async function resolveScoreId(): Promise<string | null> {
    if (props.submitStatus === 'anon' || props.submitStatus === 'error') {
      return null
    }
    const promise = props.savePromiseRef.current
    if (!promise) return null
    return promise
  }

  async function handleCopy() {
    if (awaitingShare) return
    setAwaitingShare(true)
    try {
      const scoreId = await resolveScoreId()
      const text = buildOutgoingText(scoreId)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast('Copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy to clipboard.', 'error')
    } finally {
      setAwaitingShare(false)
    }
  }

  async function handleShareX() {
    if (awaitingShare) return
    setAwaitingShare(true)
    // Open the window synchronously so the browser preserves the user-gesture
    // context — popup blockers reject window.open() called after `await`.
    // Resolve the URL after, then redirect the placeholder tab.
    const popup = window.open('about:blank', '_blank')
    try {
      const scoreId = await resolveScoreId()
      const text = encodeURIComponent(buildOutgoingText(scoreId))
      const url = `https://x.com/intent/tweet?text=${text}`
      if (popup && !popup.closed) {
        popup.location.href = url
      } else {
        // Popup blocked or closed during the await. Don't navigate the
        // current tab — that would yank the user out of /play. Toast and
        // copy to clipboard as a soft fallback.
        try {
          await navigator.clipboard.writeText(buildOutgoingText(scoreId))
          showToast('Popup blocked — share text copied to clipboard.', 'success')
        } catch {
          showToast('Popup blocked — please enable popups for this site.', 'error')
        }
      }
    } finally {
      setAwaitingShare(false)
    }
  }

  return (
    <div
      data-testid="round-finished"
      className={`result-shell mt-auto p-5 sm:p-6 ${props.isPersonalBest ? 'result-shell-pb' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-[var(--color-accent-glow)]">run complete</p>
          <h2 className="mt-2 text-3xl font-semibold terminal-text">{props.metrics.score} score</h2>
          <p className="mt-2 score-breakdown text-sm text-[var(--color-muted)]">
            <span className="score-breakdown-base">{props.metrics.baseScore}</span>
            <span className="score-breakdown-op" aria-hidden="true">
              ×
            </span>
            <span
              className={`score-breakdown-mult score-breakdown-mult-${props.metrics.mode}`}
              title={`${props.metrics.mode} difficulty multiplier`}
            >
              {props.metrics.multiplier.toFixed(2)}
            </span>
            <span className="score-breakdown-op" aria-hidden="true">
              =
            </span>
            <span className="score-breakdown-total">{props.metrics.score}</span>
            <span className="score-breakdown-mode">{props.metrics.mode}</span>
          </p>
        </div>
        <RankBadge rank={rankFor(props.metrics.score)} isPersonalBest={props.isPersonalBest} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">wpm</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
            {props.metrics.wpm.toFixed(1)}
          </p>
        </article>
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">accuracy</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
            {props.metrics.accuracy.toFixed(1)}%
          </p>
        </article>
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">correct chars</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
            {props.metrics.correctChars}
          </p>
        </article>
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">snippets</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
            {props.metrics.snippetsCompleted}
          </p>
        </article>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm text-[var(--color-muted)]">{bestLabel}</p>
        {submitStatusText && (
          <p
            className={`text-sm ${
              props.submitStatus === 'error'
                ? 'text-[var(--color-accent)]'
                : props.submitStatus === 'anon'
                  ? 'text-[var(--color-primary-glow)]'
                  : 'text-[var(--color-muted)]'
            }`}
          >
            {submitStatusText}
            {props.submitStatus === 'anon' && (
              <Link
                to="/"
                className="underline underline-offset-2 hover:no-underline"
                search={{ language: undefined }}
              >
                Sign in now
              </Link>
            )}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="button-primary"
          onClick={props.onReplay}
          title="Same snippet, fresh timer (Space)"
        >
          Run it back
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={props.onNextSnippet}
          title="Next snippet from the pool (Enter)"
        >
          Next snippet
        </button>
        <button
          type="button"
          data-testid="share-button"
          className="button-secondary"
          onClick={handleCopy}
          aria-busy={awaitingShare && !copied}
          disabled={awaitingShare && !copied}
        >
          {copied ? 'copied!' : awaitingShare ? 'preparing…' : 'copy result'}
        </button>
        <button
          type="button"
          className="button-accent"
          onClick={handleShareX}
          aria-busy={awaitingShare}
          disabled={awaitingShare}
        >
          {awaitingShare ? 'preparing…' : 'share on x'}
        </button>
        <Link
          className="button-secondary no-underline"
          to="/"
          search={{ language: props.language }}
        >
          Back home
        </Link>
      </div>
    </div>
  )
}
