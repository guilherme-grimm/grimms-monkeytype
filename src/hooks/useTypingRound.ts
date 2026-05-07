import { useEffect, useMemo, useRef, useState } from 'react'

import { roundDurationMs } from '#/lib/game/constants'
import {
  DEFAULT_DIFFICULTY,
  type DifficultyPreset,
  presetToFlags,
} from '#/lib/game/difficulty'
import { getLeadingIndentWidth } from '#/lib/game/indentation'
import { normalizeSnippet, sanitizeTypedValue } from '#/lib/game/normalization'
import { calculateRoundMetrics, isSnippetComplete } from '#/lib/game/scoring'
import {
  getDailyStarter,
  getInitialSnippet,
  getRandomSnippet,
  isSkeletonSnippet,
  makeSkeletonSnippet,
} from '#/lib/game/snippets'
import {
  loadLocalBestScores,
  loadStoredPreferences,
  saveLocalBestScores,
  saveStoredPreferences,
  shouldReplaceBest,
} from '#/lib/game/storage'
import { createTypingSoundPlayer } from '#/lib/game/typing-sound'
import type {
  LanguageId,
  LocalBestScore,
  NormalizedSnippet,
  RoundMetrics,
  RoundStatus,
  Snippet,
} from '#/lib/game/types'

type UseTypingRoundOptions = {
  language: LanguageId
  difficulty?: DifficultyPreset
  onSnippetAdvance: () => void
  onResetFocus: () => void
  onFinish?: (result: LocalBestScore, elapsedMs: number) => void | Promise<void>
}

export type UseTypingRoundResult = {
  status: RoundStatus
  typedValue: string
  currentSnippet: NormalizedSnippet
  upcomingSnippet: NormalizedSnippet
  liveMetrics: RoundMetrics
  finalMetrics: RoundMetrics | null
  remainingMs: number
  elapsedMs: number
  snippetsCompleted: number
  bestScore: LocalBestScore | null
  isPersonalBest: boolean
  correctStreak: number
  streakIntensity: number
  errorPulseToken: number
  snippetClearedToken: number
  typingSoundEnabled: boolean
  showOnboarding: boolean
  setTypingSoundEnabled: (next: boolean | ((prev: boolean) => boolean)) => void
  dismissOnboarding: () => void
  handleValueChange: (next: string) => void
  consumeIndentationWithTab: () => boolean
  resetRound: () => void
  replayCurrentSnippet: () => void
  startFreshRun: (initialInput?: string) => void
}

export function useTypingRound({
  language,
  difficulty = DEFAULT_DIFFICULTY,
  onSnippetAdvance,
  onResetFocus,
  onFinish,
}: UseTypingRoundOptions): UseTypingRoundResult {
  const flags = useMemo(() => presetToFlags(difficulty), [difficulty])

  const [status, setStatus] = useState<RoundStatus>('idle')
  // Initial snippet is the day's stable starter for this language — same on
  // server and client (no hydration flash), varies daily/per-language so the
  // opening doesn't feel rehearsed. Every subsequent pick is random.
  const [currentRawSnippet, setCurrentRawSnippet] = useState<Snippet>(() => getDailyStarter(language))
  // Upcoming starts as a skeleton sentinel — same on server and client (no
  // hydration flash), distinct id from current so the SnippetDisplay key-based
  // remount fires when current advances. Real pick lands in the mount effect.
  const [upcomingRawSnippet, setUpcomingRawSnippet] = useState<Snippet>(() => makeSkeletonSnippet(language))
  const [typedValue, setTypedValue] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [correctChars, setCorrectChars] = useState(0)
  const [incorrectChars, setIncorrectChars] = useState(0)
  const [snippetsCompleted, setSnippetsCompleted] = useState(0)
  // Reaction state. correctStreak drives ComboCounter + immersion; errorPulseToken
  // is a monotonic counter — components key off it to retrigger error animations
  // even when consecutive errors collapse to the same css state. snippetClearedToken
  // does the same for the CRT-sweep on snippet advance.
  const [correctStreak, setCorrectStreak] = useState(0)
  const [errorPulseToken, setErrorPulseToken] = useState(0)
  const [snippetClearedToken, setSnippetClearedToken] = useState(0)
  const [bestScore, setBestScore] = useState<LocalBestScore | null>(null)
  const [isPersonalBest, setIsPersonalBest] = useState(false)
  // Default ON — overwritten by stored preference on mount if the user has
  // toggled before. Initial `true` here matches the post-mount default so
  // first-paint chrome lines up with the actual playback state.
  const [typingSoundEnabled, setTypingSoundEnabledState] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [finalMetrics, setFinalMetrics] = useState<RoundMetrics | null>(null)

  const currentSnippet = useMemo(
    () => normalizeSnippet(currentRawSnippet, flags),
    [currentRawSnippet, flags],
  )
  const upcomingSnippet = useMemo(
    () => normalizeSnippet(upcomingRawSnippet, flags),
    [upcomingRawSnippet, flags],
  )

  const startedAtRef = useRef<number | null>(null)
  const previousInputRef = useRef('')
  // Recent snippet IDs (most recent first). Excluded from the random picker
  // so the player doesn't see the same snippet two or three runs in a row.
  // Capped at 3 — with a 10-snippet pool that leaves 7 candidates per pick,
  // plenty of variety while still cycling through the full pool over time.
  const recentSnippetIdsRef = useRef<Array<string>>([])
  const typingSoundRef = useRef(createTypingSoundPlayer())
  const finishRoundRef = useRef<(finalElapsedMs: number) => void>(() => {})

  function rememberSnippet(id: string) {
    const next = [id, ...recentSnippetIdsRef.current.filter((existing) => existing !== id)]
    recentSnippetIdsRef.current = next.slice(0, 3)
  }

  // The reset-on-language/difficulty-change effect below should NOT fire on
  // the very first mount — the initial state already holds the day's stable
  // starter, and re-running the effect would swap to a random snippet,
  // producing a visible flash. We skip the first run and only reset on
  // genuine dep changes (user picked a different language, etc).
  const isFirstMountRef = useRef(true)

  useEffect(() => {
    const storedBests = loadLocalBestScores()
    const storedPreferences = loadStoredPreferences()
    setBestScore(storedBests[language] ?? null)
    // Sound on by default — it's the loudest single immersion lever. Returning
    // users who explicitly turned it off see `false` from storage and stay off.
    setTypingSoundEnabledState(storedPreferences?.typingSoundEnabled ?? true)
    setShowOnboarding(!(storedPreferences?.hasSeenPlayOnboarding ?? false))
  }, [language])

  useEffect(() => {
    // First-mount path: the lazy initial state already holds the daily
    // starter. Just record it in history and persist last-language. Skip
    // the random swap so there's no flash.
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      rememberSnippet(currentRawSnippet.id)
      // Upcoming starts as a skeleton sentinel for hydration safety; replace
      // it with a real random pick now that we're on the client. Excluding
      // current.id guarantees a different id, so the key-based remount fires
      // on advance.
      setUpcomingRawSnippet(getRandomSnippet(language, [currentRawSnippet.id]))
      saveStoredPreferences({ lastLanguage: language })
      return
    }

    // Language or difficulty actually changed — full reset with random.
    recentSnippetIdsRef.current = []
    const nextSnippet = getInitialSnippet(language)
    rememberSnippet(nextSnippet.id)
    setCurrentRawSnippet(nextSnippet)
    setUpcomingRawSnippet(getRandomSnippet(language, recentSnippetIdsRef.current))
    setTypedValue('')
    setElapsedMs(0)
    setCorrectChars(0)
    setIncorrectChars(0)
    setSnippetsCompleted(0)
    setCorrectStreak(0)
    setIsPersonalBest(false)
    setStatus('idle')
    setFinalMetrics(null)
    previousInputRef.current = ''
    startedAtRef.current = null
    saveStoredPreferences({ lastLanguage: language })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, difficulty])

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
        finishRoundRef.current(roundDurationMs)
      }
    }, 50)

    return () => window.clearInterval(intervalId)
  }, [status])

  useEffect(() => {
    saveStoredPreferences({ typingSoundEnabled })
  }, [typingSoundEnabled])

  function persistBestScore(result: LocalBestScore) {
    const storedBests = loadLocalBestScores()
    const currentBest = storedBests[result.language]

    if (!shouldReplaceBest(currentBest, result)) {
      setBestScore(currentBest ?? null)
      setIsPersonalBest(false)
      return
    }

    // PB only counts when there was a prior best to beat — first-ever score
    // shouldn't trigger the "NEW BEST" flash, that's just an opening run.
    saveLocalBestScores({ ...storedBests, [result.language]: result })
    setBestScore(result)
    setIsPersonalBest(currentBest !== undefined)
  }

  function finishRound(finalElapsedMs: number) {
    if (status === 'finished') {
      return
    }

    const metrics = calculateRoundMetrics({
      correctChars,
      incorrectChars,
      elapsedMs: finalElapsedMs,
      snippetsCompleted,
      mode: difficulty,
    })

    const result: LocalBestScore = {
      ...metrics,
      language,
      achievedAt: new Date().toISOString(),
    }

    setElapsedMs(finalElapsedMs)
    setFinalMetrics(metrics)
    setStatus('finished')
    persistBestScore(result)
    void onFinish?.(result, finalElapsedMs)
  }

  finishRoundRef.current = finishRound

  function handleValueChange(nextRawValue: string) {
    const nextValue = sanitizeTypedValue(nextRawValue, flags)
    const previousValue = previousInputRef.current

    if (status === 'finished') {
      return
    }

    if (status === 'idle' && nextValue.length > 0) {
      startedAtRef.current = performance.now()
      setElapsedMs(0)
      setStatus('active')
    }

    if (nextValue.length > previousValue.length) {
      const appendedValue = nextValue.slice(previousValue.length)
      let nextCorrectChars = correctChars
      let nextIncorrectChars = incorrectChars
      let runningStreak = correctStreak
      let sawError = false

      for (let index = 0; index < appendedValue.length; index += 1) {
        const targetIndex = previousValue.length + index
        const targetChar = currentSnippet.normalized[targetIndex]

        if (appendedValue[index] === targetChar) {
          nextCorrectChars += 1
          runningStreak += 1
        } else {
          nextIncorrectChars += 1
          runningStreak = 0
          sawError = true
        }
      }

      if (typingSoundEnabled) {
        // Use the running streak's intensity (sqrt curve, 0–1) so the gain
        // bump tracks the visual escalation in lockstep.
        const runningIntensity = Math.min(1, Math.sqrt(runningStreak / 60))
        void typingSoundRef.current.play(runningStreak, runningIntensity)
      }

      setCorrectChars(nextCorrectChars)
      setIncorrectChars(nextIncorrectChars)
      setCorrectStreak(runningStreak)
      if (sawError) {
        setErrorPulseToken((value) => value + 1)
      }
    }

    // Backspace: don't refund mistakes, but resync the previous-input cursor
    // so a re-type of corrected chars isn't double-counted on the next append.
    previousInputRef.current = nextValue
    setTypedValue(nextValue)

    if (isSnippetComplete(nextValue, currentSnippet.normalized)) {
      // Defensive: if the user somehow finished before the mount effect
      // populated upcoming, draw a real one instead of advancing into the
      // skeleton sentinel.
      const nextSnippet = isSkeletonSnippet(upcomingRawSnippet)
        ? getRandomSnippet(language, recentSnippetIdsRef.current)
        : upcomingRawSnippet
      rememberSnippet(nextSnippet.id)
      const nextUpcomingSnippet = getRandomSnippet(language, recentSnippetIdsRef.current)
      previousInputRef.current = ''
      setSnippetsCompleted((value) => value + 1)
      setSnippetClearedToken((value) => value + 1)
      setCurrentRawSnippet(nextSnippet)
      setUpcomingRawSnippet(nextUpcomingSnippet)
      setTypedValue('')
      onSnippetAdvance()
    }
  }

  function consumeIndentationWithTab() {
    if (flags.indentMode !== 'tab-helper') {
      return false
    }

    const indentWidth = getLeadingIndentWidth(currentSnippet, typedValue.length)

    if (indentWidth === 0) {
      return false
    }

    handleValueChange(typedValue + ' '.repeat(indentWidth))
    return true
  }

  function resetRound(nextSnippet?: Snippet, initialInput?: string) {
    // Default reset = pull a new snippet, excluding recent history. If a
    // specific snippet is passed (e.g. replay), use it as-is and only mark
    // it recent — don't draw fresh.
    const snippet = nextSnippet ?? getRandomSnippet(language, recentSnippetIdsRef.current)
    rememberSnippet(snippet.id)
    startedAtRef.current = null
    previousInputRef.current = ''
    setCurrentRawSnippet(snippet)
    setUpcomingRawSnippet(getRandomSnippet(language, recentSnippetIdsRef.current))
    setTypedValue('')
    setElapsedMs(0)
    setCorrectChars(0)
    setIncorrectChars(0)
    setSnippetsCompleted(0)
    setCorrectStreak(0)
    setIsPersonalBest(false)
    setStatus('idle')
    setFinalMetrics(null)
    onResetFocus()

    if (initialInput) {
      // schedule after focus settles
      requestAnimationFrame(() => handleValueChange(initialInput))
    }
  }

  function startFreshRun(initialInput?: string) {
    const nextSnippet = getRandomSnippet(language, recentSnippetIdsRef.current)
    resetRound(nextSnippet, initialInput)
  }

  // Replay the same snippet the user just ran — clears state but keeps
  // currentSnippet so they can re-attempt the exact code they botched
  // (vs. resetRound which always pulls a fresh snippet from the pool).
  function replayCurrentSnippet() {
    resetRound(currentRawSnippet)
  }

  function dismissOnboarding() {
    setShowOnboarding(false)
    saveStoredPreferences({ hasSeenPlayOnboarding: true })
    onResetFocus()
  }

  const liveMetrics = calculateRoundMetrics({
    correctChars,
    incorrectChars,
    elapsedMs,
    snippetsCompleted,
    mode: difficulty,
  })

  const remainingMs = Math.max(0, roundDurationMs - elapsedMs)

  // 0–1 immersion curve. Caps at streak 60 so the player can hit max intensity
  // mid-run without needing perfection across the whole round; using a soft
  // sqrt curve so the early gains feel earned (small bumps lift the mood) while
  // the high end levels off (no runaway sensory overload). Errors snap streak
  // to 0 → intensity drops sharply, which the snap-back animation exploits.
  const streakIntensity = Math.min(1, Math.sqrt(correctStreak / 60))

  function setTypingSoundEnabled(next: boolean | ((prev: boolean) => boolean)) {
    setTypingSoundEnabledState(next)
  }

  return {
    status,
    typedValue,
    currentSnippet,
    upcomingSnippet,
    liveMetrics,
    finalMetrics,
    remainingMs,
    elapsedMs,
    snippetsCompleted,
    bestScore,
    isPersonalBest,
    correctStreak,
    streakIntensity,
    errorPulseToken,
    snippetClearedToken,
    typingSoundEnabled,
    showOnboarding,
    setTypingSoundEnabled,
    dismissOnboarding,
    handleValueChange,
    consumeIndentationWithTab,
    resetRound: () => resetRound(),
    replayCurrentSnippet,
    startFreshRun,
  }
}
