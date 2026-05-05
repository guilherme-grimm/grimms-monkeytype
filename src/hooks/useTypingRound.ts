import { useEffect, useRef, useState } from 'react'

import { roundDurationMs } from '#/lib/game/constants'
import { getLeadingIndentWidth } from '#/lib/game/indentation'
import { sanitizeTypedValue } from '#/lib/game/normalization'
import { calculateRoundMetrics, isSnippetComplete } from '#/lib/game/scoring'
import { getFollowingSnippet, getInitialSnippet } from '#/lib/game/snippets'
import {
  loadLocalBestScores,
  loadStoredPreferences,
  saveLocalBestScores,
  saveStoredPreferences,
  shouldReplaceBest,
} from '#/lib/game/storage'
import { createTypingSoundPlayer } from '#/lib/game/typing-sound'
import type { LanguageId, LocalBestScore, NormalizedSnippet, RoundMetrics, RoundStatus } from '#/lib/game/types'

type UseTypingRoundOptions = {
  language: LanguageId
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
  typingSoundEnabled: boolean
  showOnboarding: boolean
  setTypingSoundEnabled: (next: boolean | ((prev: boolean) => boolean)) => void
  dismissOnboarding: () => void
  handleValueChange: (next: string) => void
  consumeIndentationWithTab: () => boolean
  resetRound: () => void
  startFreshRun: (initialInput?: string) => void
}

export function useTypingRound({ language, onSnippetAdvance, onResetFocus, onFinish }: UseTypingRoundOptions): UseTypingRoundResult {
  const [status, setStatus] = useState<RoundStatus>('idle')
  const [currentSnippet, setCurrentSnippet] = useState<NormalizedSnippet>(() => getInitialSnippet(language))
  const [upcomingSnippet, setUpcomingSnippet] = useState<NormalizedSnippet>(() => {
    const initial = getInitialSnippet(language)
    return getFollowingSnippet(language, initial.id)
  })
  const [typedValue, setTypedValue] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [correctChars, setCorrectChars] = useState(0)
  const [incorrectChars, setIncorrectChars] = useState(0)
  const [snippetsCompleted, setSnippetsCompleted] = useState(0)
  const [bestScore, setBestScore] = useState<LocalBestScore | null>(null)
  const [typingSoundEnabled, setTypingSoundEnabledState] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [finalMetrics, setFinalMetrics] = useState<RoundMetrics | null>(null)

  const startedAtRef = useRef<number | null>(null)
  const previousInputRef = useRef('')
  const lastSnippetIdRef = useRef(currentSnippet.id)
  const typingSoundRef = useRef(createTypingSoundPlayer())
  const finishRoundRef = useRef<(finalElapsedMs: number) => void>(() => {})

  useEffect(() => {
    const storedBests = loadLocalBestScores()
    const storedPreferences = loadStoredPreferences()
    setBestScore(storedBests[language] ?? null)
    setTypingSoundEnabledState(storedPreferences?.typingSoundEnabled ?? false)
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
    setFinalMetrics(null)
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
      return
    }

    saveLocalBestScores({ ...storedBests, [result.language]: result })
    setBestScore(result)
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
    const nextValue = sanitizeTypedValue(nextRawValue)
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

    // Backspace: don't refund mistakes, but resync the previous-input cursor
    // so a re-type of corrected chars isn't double-counted on the next append.
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
      onSnippetAdvance()
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
    setFinalMetrics(null)
    onResetFocus()

    if (initialInput) {
      // schedule after focus settles
      requestAnimationFrame(() => handleValueChange(initialInput))
    }
  }

  function startFreshRun(initialInput?: string) {
    const nextSnippet = getFollowingSnippet(language, lastSnippetIdRef.current)
    resetRound(nextSnippet, initialInput)
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
  })

  const remainingMs = Math.max(0, roundDurationMs - elapsedMs)

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
    typingSoundEnabled,
    showOnboarding,
    setTypingSoundEnabled,
    dismissOnboarding,
    handleValueChange,
    consumeIndentationWithTab,
    resetRound: () => resetRound(),
    startFreshRun,
  }
}
