import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

type SignInModalProps = {
  open: boolean
  onClose: () => void
}

export function SignInModal({ open, onClose }: SignInModalProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return null
  }

  async function handleSignIn() {
    setError(null)
    setPending(true)
    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: window.location.pathname + window.location.search,
      })
    } catch (cause) {
      setPending(false)
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] px-4"
      onClick={onClose}
    >
      <div
        className="panel scan-lines w-full max-w-md bg-[rgba(10,10,10,0.97)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="terminal-header">
          <div className="terminal-dots text-[var(--color-accent-glow)]">
            <span />
            <span className="text-yellow-400" />
            <span className="text-[var(--color-primary-glow)]" />
          </div>
          <span className="terminal-title">~/typer/auth.sh</span>
        </div>
        <div className="space-y-5 px-5 py-6 text-sm sm:text-base">
          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-accent-glow)]">sign in</p>
            <p className="text-[var(--color-text-strong)]">
              Pick a provider. Required only for the global leaderboard — anonymous play stays
              local.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="button-primary"
              disabled={pending}
              onClick={handleSignIn}
            >
              {pending ? 'redirecting…' : 'continue with github'}
            </button>
          </div>

          {error ? <p className="text-sm text-[var(--color-accent-glow)]">{error}</p> : null}

          <div className="flex justify-end pt-1">
            <button type="button" className="button-secondary" onClick={onClose}>
              cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
