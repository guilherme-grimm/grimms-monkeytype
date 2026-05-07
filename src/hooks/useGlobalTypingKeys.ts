import { useEffect, useRef } from 'react'

import { sanitizeTypedValue } from '#/lib/game/normalization'
import type { RoundStatus } from '#/lib/game/types'

type Callbacks = {
  status: RoundStatus
  typedValue: string
  isInputFocused: () => boolean
  focusInput: () => void
  onPrintable: (next: string) => void
  onTab: () => void
  onEscapeReset: () => void
  onSpaceReplay: () => void
  onEnterNextSnippet: () => void
}

// Grace period after a run ends, during which Space/Enter are swallowed so a
// key still in flight from the final character of the snippet doesn't yank
// the user out of the result panel before they can read or share their score.
const POST_FINISH_KEY_GRACE_MS = 400

export function useGlobalTypingKeys(callbacks: Callbacks) {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const finishedAtRef = useRef<number | null>(null)

  // Stamp the moment the round transitions into 'finished' so the keydown
  // handler can compare against it. Reset when the status leaves 'finished'.
  if (callbacks.status === 'finished' && finishedAtRef.current === null) {
    finishedAtRef.current = Date.now()
  } else if (callbacks.status !== 'finished') {
    finishedAtRef.current = null
  }

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const current = callbacksRef.current

      if (current.status === 'finished') {
        const finishedAt = finishedAtRef.current
        const withinGrace =
          finishedAt !== null && Date.now() - finishedAt < POST_FINISH_KEY_GRACE_MS

        if (event.key === ' ') {
          event.preventDefault()
          if (!withinGrace) current.onSpaceReplay()
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (!withinGrace) current.onEnterNextSnippet()
          return
        }

        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        current.focusInput()
        current.onTab()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        current.onEscapeReset()
        return
      }

      const sanitizedKey = sanitizeTypedValue(event.key)
      const isPrintable = event.key.length === 1 && sanitizedKey.length > 0

      if (!isPrintable) {
        return
      }

      if (!current.isInputFocused()) {
        event.preventDefault()
        current.focusInput()

        if (current.status === 'idle') {
          current.onPrintable(sanitizedKey)
          return
        }

        current.onPrintable(current.typedValue + sanitizedKey)
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [])
}
