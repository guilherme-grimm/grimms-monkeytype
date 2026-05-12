import { useEffect, useId, useState } from 'react'

import { authClient } from '#/lib/auth-client'

type HomeOnboardingProps = {
  open: boolean
  onDismiss: () => void
  isAnon: boolean
}

export function HomeOnboarding({ open, onDismiss, isAnon }: HomeOnboardingProps) {
  const titleId = useId()
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onDismiss()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [open, onDismiss])

  if (!open) return null

  async function handleSignIn() {
    onDismiss()
    setSignInError(null)
    setSigningIn(true)
    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: window.location.pathname + window.location.search,
      })
    } catch (cause) {
      setSigningIn(false)
      setSignInError(cause instanceof Error ? cause.message : 'Sign-in failed.')
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.65)] px-4"
      onClick={onDismiss}
    >
      <div
        className="panel scan-lines w-full max-w-xl bg-[rgba(10,10,10,0.97)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="terminal-header">
          <div className="terminal-dots text-[var(--color-accent-glow)]">
            <span />
            <span className="text-yellow-400" />
            <span className="text-[var(--color-primary-glow)]" />
          </div>
          <span className="terminal-title">~/typer/welcome.sh</span>
        </div>

        <div className="space-y-5 px-5 py-6 text-sm sm:text-base">
          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-accent-glow)]">welcome</p>
            <h2 id={titleId} className="text-2xl font-semibold terminal-text">
              Monkeytype for code.
            </h2>
            <p className="text-[var(--color-muted)]">
              Hone the unused skill of touch typing while the agents do the heavy lifting.
            </p>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-muted)]">the loop</p>
            <ul className="space-y-1 text-[var(--color-text-strong)]">
              <li>1. Pick language → round shape → difficulty.</li>
              <li>2. Type the snippet exactly. Spaces count; line breaks are visual.</li>
              <li>3. Score = base × multiplier. Bigger streaks, bigger numbers.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-muted)]">modes</p>
            <ul className="space-y-1 text-[var(--color-muted)]">
              <li>
                <span className="text-[var(--color-text-strong)]">timed</span> — classic 30-second
                sprint.
              </li>
              <li>
                <span className="text-[var(--color-text-strong)]">survival</span> — 25s safe
                practice, then endless. After warmup, one mistake or empty meter ends the run.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-muted)]">difficulty + mods</p>
            <p className="text-[var(--color-muted)]">
              <span className="text-[var(--color-text-strong)]">custom</span> unlocks mods (strict,
              case-sensitive, indent…) that compound the multiplier. Open the gear in the top right.
            </p>
          </div>

          <div className="space-y-2">
            <p className="eyebrow text-[var(--color-muted)]">leaderboard</p>
            <p className="text-[var(--color-muted)]">
              Global leaderboard per language + mode. Local bests always saved in this browser.
            </p>
          </div>

          {signInError ? (
            <p className="text-sm text-[var(--color-accent-glow)]">{signInError}</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            {isAnon && (
              <button
                type="button"
                className="button-accent"
                onClick={handleSignIn}
                disabled={signingIn}
              >
                {signingIn ? 'redirecting…' : 'sign in with github'}
              </button>
            )}
            <button type="button" className="button-primary" onClick={onDismiss}>
              got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
