import { useEffect, useMemo, useRef, useState } from 'react'
import { useEffectiveDebug } from '#/lib/dev/debug-config'
import { roundDurationMs } from '#/lib/game/constants'
import { DEFAULT_DIFFICULTY, type DifficultyPreset, presetToFlags } from '#/lib/game/difficulty'
import { useImmersionPrefs } from '#/lib/game/immersion-prefs'
import { getLeadingIndentWidth } from '#/lib/game/indentation'
import { normalizeSnippet, sanitizeTypedValue } from '#/lib/game/normalization'
import { calculateRoundMetrics, consumeSnippetInput } from '#/lib/game/scoring'
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
import type {
  LanguageId,
  LocalBestScore,
  NormalizedSnippet,
  RoundMetrics,
  RoundStatus,
  Snippet,
} from '#/lib/game/types'
import { createTypingSoundPlayer } from '#/lib/game/typing-sound'

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
  const [currentRawSnippet, setCurrentRawSnippet] = useState<Snippet>(() =>
    getDailyStarter(language),
  )
  // Upcoming starts as a skeleton sentinel — same on server and client (no
  // hydration flash), distinct id from current so the SnippetDisplay key-based
  // remount fires when current advances. Real pick lands in the mount effect.
  const [upcomingRawSnippet, setUpcomingRawSnippet] = useState<Snippet>(() =>
    makeSkeletonSnippet(language),
  )
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

  // In prod the debug curve params collapse to baked DEFAULTS; in DEV the dev
  // panel mutates them live so we can keep tuning the curve without a reload.
  const debug = useEffectiveDebug()
  // User-tunable cosmetic + audio prefs — drives audio parameters here and
  // body CSS vars (mounted in __root). Falls back to baked defaults if the
  // user hasn't touched settings.
  const immersionPrefs = useImmersionPrefs()

  function rememberSnippetId(history: Array<string>, id: string) {
    return [id, ...history.filter((existing) => existing !== id)].slice(0, 3)
  }

  function rememberSnippet(id: string) {
    recentSnippetIdsRef.current = rememberSnippetId(recentSnippetIdsRef.current, id)
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — only language/difficulty trigger full reset; including currentRawSnippet.id would loop because the effect itself sets it
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
      let workingTypedValue = nextValue
      let workingPreviousValueLength = previousValue.length
      let workingCurrentRawSnippet = currentRawSnippet
      let workingCurrentSnippet = currentSnippet
      let workingUpcomingRawSnippet = upcomingRawSnippet
      let workingCorrectChars = correctChars
      let workingIncorrectChars = incorrectChars
      let workingCorrectStreak = correctStreak
      let sawError = false
      let snippetsAdvanced = 0
      let workingRecentSnippetIds = recentSnippetIdsRef.current

      while (true) {
        const step = consumeSnippetInput({
          typedValue: workingTypedValue,
          previousValueLength: workingPreviousValueLength,
          target: workingCurrentSnippet.normalized,
          correctChars: workingCorrectChars,
          incorrectChars: workingIncorrectChars,
          correctStreak: workingCorrectStreak,
        })

        workingCorrectChars = step.correctChars
        workingIncorrectChars = step.incorrectChars
        workingCorrectStreak = step.correctStreak
        sawError ||= step.sawError

        if (!step.complete) {
          workingTypedValue = step.remainder
          break
        }

        snippetsAdvanced += 1
        workingTypedValue = step.remainder
        workingPreviousValueLength = 0

        // Advance immediately within the same input event so fast typing and
        // paste carry straight into the next snippet instead of dead-ending.
        const nextSnippet = isSkeletonSnippet(workingUpcomingRawSnippet)
          ? getRandomSnippet(language, workingRecentSnippetIds)
          : workingUpcomingRawSnippet
        workingRecentSnippetIds = rememberSnippetId(workingRecentSnippetIds, nextSnippet.id)
        const nextUpcomingSnippet = getRandomSnippet(language, workingRecentSnippetIds)

        workingCurrentRawSnippet = nextSnippet
        workingCurrentSnippet = normalizeSnippet(nextSnippet, flags)
        workingUpcomingRawSnippet = nextUpcomingSnippet

        if (workingTypedValue.length === 0) {
          break
        }
      }

      if (typingSoundEnabled) {
        // Same curve as the visual `streakIntensity` so audio gain tracks the
        // immersion ramp 1:1. Curve params are dev-tunable; gain ceiling and
        // error thunk are user-tunable.
        const denom = Math.max(1, debug.curveDenominator)
        const runningIntensity = Math.min(1, (workingCorrectStreak / denom) ** debug.curveExponent)
        const gainCeiling = immersionPrefs.audioGainEscalation ? immersionPrefs.audioGainCeiling : 0
        void typingSoundRef.current.play(workingCorrectStreak, runningIntensity, gainCeiling)
        // Audible counterpart to the visual snap-back: short low thump on the
        // keystroke that broke the streak. Layered *after* the regular tone so
        // the error click + thump arrive together.
        if (sawError && immersionPrefs.errorThunk) {
          void typingSoundRef.current.playError(immersionPrefs.errorThunkVolume)
        }
      }

      setCorrectChars(workingCorrectChars)
      setIncorrectChars(workingIncorrectChars)
      setCorrectStreak(workingCorrectStreak)
      if (sawError) {
        setErrorPulseToken((value) => value + 1)
      }

      // Backspace doesn't refund mistakes, but the next append diff must start
      // from whatever remainder survived after crossing snippet boundaries.
      previousInputRef.current = workingTypedValue
      setTypedValue(workingTypedValue)

      if (snippetsAdvanced > 0) {
        recentSnippetIdsRef.current = workingRecentSnippetIds
        setSnippetsCompleted((value) => value + snippetsAdvanced)
        setSnippetClearedToken((value) => value + snippetsAdvanced)
        setCurrentRawSnippet(workingCurrentRawSnippet)
        setUpcomingRawSnippet(workingUpcomingRawSnippet)
        onSnippetAdvance()
      }

      return
    }

    // Backspace: don't refund mistakes, but resync the previous-input cursor
    // so a re-type of corrected chars isn't double-counted on the next append.
    previousInputRef.current = nextValue
    setTypedValue(nextValue)
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

  // 0–1 immersion curve. Defaults: streak/60 raised to 0.5 (= sqrt) — early
  // gains feel earned, the top levels off so there's no runaway sensory load.
  // Errors zero the streak → intensity drops sharply, snap-back animation
  // exploits that. DEV panel can tune denominator and exponent live.
  const denom = Math.max(1, debug.curveDenominator)
  const streakIntensity = Math.min(1, (correctStreak / denom) ** debug.curveExponent)

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
