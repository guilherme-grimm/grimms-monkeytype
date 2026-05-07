import { useState } from 'react'

import { DebugPanel } from './debug-panel'

export function DebugTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open debug panel"
        className="debug-trigger"
      >
        DEV
      </button>
      <DebugPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
