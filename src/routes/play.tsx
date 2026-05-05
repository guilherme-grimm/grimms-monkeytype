import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { SnippetDisplay } from '#/components/game/snippet-display'
import { isSupportedLanguage, sanitizeTypedValue } from '#/lib/game/normalization'
import { calculateRoundMetrics, countMatchingPrefix, isSnippetComplete } from '#/lib/game/scoring'
import { getFollowingSnippet, getInitialSnippet } from '#/lib/game/snippets'
import {
  loadLocalBestScores,
  loadStoredPreferences,
  saveLocalBestScores,
  shouldReplaceBest,
  saveStoredPreferences,
} from '#/lib/game/storage'
import { createTypingSoundPlayer } from '#/lib/game/typing-sound'
import type { LanguageId, LocalBestScore, NormalizedSnippet, RoundStatus } from '#/lib/game/types'

const roundDurationMs = 30000

export const Route = createFileRoute('/play')({
  validateSearch: (search) => ({
    language: isSupportedLanguage(search.language) ? search.language : 'javascript',
  }),
  component: PlayRoute,
})

function PlayRoute() {
  const { language } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [status, setStatus] = useState<RoundStatus>('idle')
  const [currentSnippet, setCurrentSnippet] = useState<NormalizedSnippet>(() => getInitialSnippet(language))
  const [upcomingSnippet, setUpcomingSnippet] = useState<NormalizedSnippet>(() => {
    const initialSnippet = getInitialSnippet(language)
    return getFollowingSnippet(language, initialSnippet.id)
  })
  const [typedValue, setTypedValue] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [correctChars, setCorrectChars] = useState(0)
  const [incorrectChars, setIncorrectChars] = useState(0)
  const [snippetsCompleted, setSnippetsCompleted] = useState(0)
  const [bestScore, setBestScore] = useState<LocalBestScore | null>(null)
  const [typingSoundEnabled, setTypingSoundEnabled] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const previousInputRef = useRef('')
  const lastSnippetIdRef = useRef(currentSnippet.id)
  const typingSoundRef = useRef(createTypingSoundPlayer())

  useEffect(() => {
    const storedBests = loadLocalBestScores()
    const storedPreferences = loadStoredPreferences()
    setBestScore(storedBests[language] ?? null)
    setTypingSoundEnabled(storedPreferences?.typingSoundEnabled ?? false)
    setShowOnboarding(!(storedPreferences?.hasSeenPlayOnboarding ?? false))
  }, [language])

  useEffect(() => {
    const nextSnippet = getInitialSnippet(language)
    lastSnippetIdRef.current = nextSnippet.id
    setCurrentSnippet(nextSnippet)
    setUpcomingSnippet(getFollowingSnippet(language, nextSnippet.id))
    setTypedValue('')
    setElapsedMs(0)
    setCorrectChars(0)
    setIncorrectChars(0)
    setSnippetsCompleted(0)
    setStatus('idle')
    previousInputRef.current = ''
    startedAtRef.current = null
    saveStoredPreferences({ lastLanguage: language })
  }, [language])

  useEffect(() => {
    if (status !== 'active') {
      return
    }

    const intervalId = window.setInterval(() => {
      const startedAt = startedAtRef.current

      if (!startedAt) {
        return
      }

      const nextElapsedMs = Math.min(roundDurationMs, performance.now() - startedAt)
      setElapsedMs(nextElapsedMs)

      if (nextElapsedMs >= roundDurationMs) {
        finishRound(roundDurationMs)
      }
    }, 50)

    return () => window.clearInterval(intervalId)
  }, [status, correctChars, incorrectChars, snippetsCompleted])

  const liveMetrics = calculateRoundMetrics({
    correctChars,
    incorrectChars,
    elapsedMs,
    snippetsCompleted,
  })

  const remainingMs = Math.max(0, roundDurationMs - elapsedMs)
  const progressCount = countMatchingPrefix(typedValue, currentSnippet.normalized)
  const completionRatio = currentSnippet.normalized.length === 0 ? 0 : progressCount / currentSnippet.normalized.length
  const isActive = status === 'active'
  const isFinished = status === 'finished'

  function getLeadingIndentWidth(snippet: NormalizedSnippet, activeScoringIndex: number) {
    if (activeScoringIndex >= snippet.normalized.length || snippet.normalized[activeScoringIndex] !== ' ') {
      return 0
    }

    const tokenIndex = snippet.displayTokens.findIndex((token) => token.scoringIndex === activeScoringIndex)

    if (tokenIndex === -1) {
      return 0
    }

    for (let index = tokenIndex - 1; index >= 0; index -= 1) {
      const token = snippet.displayTokens[index]

      if (token.value === '\r') {
        continue
      }

      if (token.value === '\n') {
        break
      }

      if (token.scoringIndex !== null) {
        return 0
      }
    }

    let width = 0

    for (let index = tokenIndex; index < snippet.displayTokens.length; index += 1) {
      const token = snippet.displayTokens[index]

      if (token.scoringIndex === null) {
        if (token.value === '\n') {
          break
        }

        continue
      }

      if (token.value !== ' ') {
        break
      }

      width += 1
    }

    return width
  }

  function focusInput() {
    inputRef.current?.focus()
    inputRef.current?.setSelectionRange(typedValue.length, typedValue.length)
  }

  function resetRound(nextSnippet?: NormalizedSnippet, initialInput?: string) {
    const snippet = nextSnippet ?? getInitialSnippet(language)
    lastSnippetIdRef.current = snippet.id
    startedAtRef.current = null
    previousInputRef.current = ''
    setCurrentSnippet(snippet)
    setUpcomingSnippet(getFollowingSnippet(language, snippet.id))
    setTypedValue('')
    setElapsedMs(0)
    setCorrectChars(0)
    setIncorrectChars(0)
    setSnippetsCompleted(0)
    setStatus('idle')
    requestAnimationFrame(() => focusInput())

    if (initialInput) {
      requestAnimationFrame(() => handleValueChange(initialInput))
    }
  }

  function consumeIndentationWithTab() {
    const indentWidth = getLeadingIndentWidth(currentSnippet, typedValue.length)

    if (indentWidth === 0) {
      return false
    }

    handleValueChange(typedValue + ' '.repeat(indentWidth))
    return true
  }

  function persistBestScore(result: LocalBestScore) {
    const storedBests = loadLocalBestScores()
    const currentBest = storedBests[result.language]

    if (!shouldReplaceBest(currentBest, result)) {
      setBestScore(currentBest ?? null)
      return
    }

    const nextBests = {
      ...storedBests,
      [result.language]: result,
    }

    saveLocalBestScores(nextBests)
    setBestScore(result)
  }

  function finishRound(finalElapsedMs: number) {
    if (status === 'finished') {
      return
    }

    const result = {
      ...calculateRoundMetrics({
        correctChars,
        incorrectChars,
        elapsedMs: finalElapsedMs,
        snippetsCompleted,
      }),
      language,
      achievedAt: new Date().toISOString(),
    } satisfies LocalBestScore

    setElapsedMs(finalElapsedMs)
    setStatus('finished')
    persistBestScore(result)
  }

  function handleValueChange(nextRawValue: string) {
    const nextValue = sanitizeTypedValue(nextRawValue)
    const previousValue = previousInputRef.current

    if (status === 'finished') {
      focusInput()
      return
    }

    if (status === 'idle' && nextValue.length > 0) {
      const startedAt = performance.now()
      startedAtRef.current = startedAt
      setElapsedMs(0)
      setStatus('active')
    }

    if (nextValue.length > previousValue.length) {
      const appendedValue = nextValue.slice(previousValue.length)
      let nextCorrectChars = correctChars
      let nextIncorrectChars = incorrectChars

      for (let index = 0; index < appendedValue.length; index += 1) {
        const targetIndex = previousValue.length + index
        const targetChar = currentSnippet.normalized[targetIndex]

        if (appendedValue[index] === targetChar) {
          nextCorrectChars += 1
        } else {
          nextIncorrectChars += 1
        }
      }

      if (typingSoundEnabled) {
        void typingSoundRef.current.play()
      }

      setCorrectChars(nextCorrectChars)
      setIncorrectChars(nextIncorrectChars)
    }

    previousInputRef.current = nextValue
    setTypedValue(nextValue)

    if (isSnippetComplete(nextValue, currentSnippet.normalized)) {
      const nextSnippet = upcomingSnippet
      const nextUpcomingSnippet = getFollowingSnippet(language, nextSnippet.id)
      lastSnippetIdRef.current = nextSnippet.id
      previousInputRef.current = ''
      setSnippetsCompleted((value) => value + 1)
      setCurrentSnippet(nextSnippet)
      setUpcomingSnippet(nextUpcomingSnippet)
      setTypedValue('')
      requestAnimationFrame(() => focusInput())
    }
  }

  useEffect(() => {
    requestAnimationFrame(() => focusInput())
  }, [])

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      if (status === 'finished') {
        if (event.key === ' ') {
          event.preventDefault()
          resetRound()
        }

        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        focusInput()
        consumeIndentationWithTab()
        return
      }

      const sanitizedKey = sanitizeTypedValue(event.key)
      const isPrintable = event.key.length === 1 && sanitizedKey.length > 0

      if (!isPrintable) {
        return
      }

      const isInputFocused = document.activeElement === inputRef.current

      if (!isInputFocused) {
        event.preventDefault()
        focusInput()

        if (status === 'idle') {
          handleValueChange(sanitizedKey)
          return
        }

        handleValueChange(typedValue + sanitizedKey)
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)

    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [status, typedValue, language, currentSnippet, upcomingSnippet])

  useEffect(() => {
    saveStoredPreferences({ typingSoundEnabled })
  }, [typingSoundEnabled])

  function dismissOnboarding() {
    setShowOnboarding(false)
    saveStoredPreferences({ hasSeenPlayOnboarding: true })
    requestAnimationFrame(() => focusInput())
  }

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header
        className={`flex flex-wrap items-start justify-between gap-4 pb-5 transition-all duration-200 ${
          isActive ? 'border-b border-transparent opacity-55' : 'border-b border-[var(--color-border-soft)]'
        }`}
      >
        <div>
          <Link to="/" className="eyebrow terminal-text no-underline">
            typer.grimm0.dev
          </Link>
          <h1 className={`mt-2 font-semibold transition-all duration-200 ${isActive ? 'text-lg text-[var(--color-muted)] sm:text-xl' : 'text-2xl text-[var(--color-text-strong)] sm:text-3xl'}`}>
            Thirty seconds. Keep shipping.
          </h1>
          <p className={`mt-2 text-sm transition-opacity duration-200 ${isActive ? 'text-[var(--color-muted)]/70' : 'text-[var(--color-muted)]'}`}>
            Type straight through. Line breaks are visual. `Tab` only jumps leading indentation.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="pixel-border bg-[rgba(47,125,50,0.12)] px-3 py-1 text-[var(--color-primary-glow)]">
            {language}
          </span>
          <button className={typingSoundEnabled ? 'button-accent' : 'button-secondary'} onClick={() => setTypingSoundEnabled((value) => !value)}>
            sound {typingSoundEnabled ? 'on' : 'off'}
          </button>
          <button className="button-secondary" onClick={() => navigate({ to: '/', search: { language } })}>
            Change language
          </button>
        </div>
      </header>

      <section className={`stats-strip mt-6 flex items-center justify-between gap-4 px-4 py-3 transition-all duration-200 ${isActive ? 'opacity-46' : 'opacity-100'}`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>time {(remainingMs / 1000).toFixed(1)}</span>
          <span>score {liveMetrics.score}</span>
          <span>accuracy {liveMetrics.accuracy}%</span>
          <span>snippets {snippetsCompleted}</span>
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
          isActive ? 'run-shell-active' : isFinished ? 'run-shell-finished panel' : 'run-shell-idle panel'
        }`}
        onClick={focusInput}
      >
        {showOnboarding && status === 'idle' ? (
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
                <p className="text-[var(--color-text-strong)]">Thirty seconds. Type the code exactly as shown.</p>
                <div className="space-y-2 text-[var(--color-muted)]">
                  <p>Line breaks are visual only.</p>
                  <p>Spaces still count.</p>
                  <p>`Tab` jumps leading indentation.</p>
                  <p>`Space` starts a new run after the result screen.</p>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button className="button-primary" onClick={dismissOnboarding}>
                    Got it
                  </button>
                  <button className="button-accent" onClick={dismissOnboarding}>
                    Start typing
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <textarea
          ref={inputRef}
          value={typedValue}
          onChange={(event) => handleValueChange(event.target.value)}
          onBlur={() => {
            requestAnimationFrame(() => focusInput())
          }}
          onSelect={() => {
            inputRef.current?.setSelectionRange(typedValue.length, typedValue.length)
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="pointer-events-none absolute inset-0 h-full w-full resize-none opacity-0"
          aria-label="Typing input"
        />

        <div className={`run-meta flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-[var(--color-muted)] ${isActive ? 'run-meta-active' : ''}`}>
          <span>{status === 'idle' ? 'ready' : status === 'active' ? 'live' : 'complete'}</span>
          <span>{bestScore ? `best ${bestScore.score}` : 'no local best yet'}</span>
        </div>

        <div className={`mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center ${isActive ? 'pt-14' : 'pt-4'} ${showOnboarding && status === 'idle' ? 'opacity-35' : ''}`}>
          <SnippetDisplay
            currentSnippet={currentSnippet}
            upcomingSnippet={upcomingSnippet}
            typedValue={typedValue}
          />
        </div>

        {status !== 'finished' ? (
          <div className={`run-controls mt-auto flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)] ${isActive ? 'run-controls-active' : ''}`}>
            <button className="button-primary" onClick={focusInput}>
              {status === 'idle' ? 'Focus and start typing' : 'Keep typing'}
            </button>
            <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              typed {typedValue.length} / {currentSnippet.normalized.length}
            </span>
            <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-2 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              tab = indent
            </span>
            <button className="button-secondary" onClick={() => resetRound()}>
              Reset run
            </button>
          </div>
        ) : (
          <ResultPanel
            metrics={calculateRoundMetrics({
              correctChars,
              incorrectChars,
              elapsedMs: roundDurationMs,
              snippetsCompleted,
            })}
            bestScore={bestScore}
            onRestart={() => resetRound()}
            language={language}
          />
        )}
      </section>
    </main>
  )
}

function ResultPanel(props: {
  metrics: ReturnType<typeof calculateRoundMetrics>
  bestScore: LocalBestScore | null
  onRestart: () => void
  language: LanguageId
}) {
  let bestLabel = 'First local score saved.'

  if (props.bestScore) {
    bestLabel =
      props.metrics.score >= props.bestScore.score && props.metrics.accuracy >= props.bestScore.accuracy
        ? 'Local best locked in.'
        : `Local best stays at ${props.bestScore.score}.`
  }

  return (
    <div className="result-shell mt-auto p-5 sm:p-6">
      <p className="eyebrow text-[var(--color-accent-glow)]">run complete</p>
      <h2 className="mt-2 text-3xl font-semibold terminal-text">{props.metrics.score} score</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">accuracy</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">{props.metrics.accuracy}%</p>
        </article>
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">correct chars</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">{props.metrics.correctChars}</p>
        </article>
        <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="eyebrow text-[var(--color-muted)]">snippets</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">{props.metrics.snippetsCompleted}</p>
        </article>
      </div>
      <p className="mt-4 text-sm text-[var(--color-muted)]">{bestLabel}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-primary" onClick={props.onRestart}>
          Run it back
        </button>
        <Link className="button-accent no-underline" to="/" search={{ language: props.language }}>
          Back home
        </Link>
      </div>
    </div>
  )
}
