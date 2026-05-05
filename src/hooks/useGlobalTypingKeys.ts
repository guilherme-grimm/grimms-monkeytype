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
  onSpaceRestart: () => void
}

export function useGlobalTypingKeys(callbacks: Callbacks) {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const current = callbacksRef.current

      if (current.status === 'finished') {
        if (event.key === ' ') {
          event.preventDefault()
          current.onSpaceRestart()
        }

        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        current.focusInput()
        current.onTab()
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
