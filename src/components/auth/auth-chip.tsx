import { useState } from 'react'

import { authClient, useSession } from '#/lib/auth-client'

import { SignInModal } from './sign-in-modal'

export function AuthChip() {
  const { data, isPending } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)

  if (isPending) {
    return <span className="pixel-border bg-[rgba(255,255,255,0.02)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">…</span>
  }

  if (!data?.user) {
    return (
      <>
        <button className="button-secondary" onClick={() => setModalOpen(true)}>
          sign in
        </button>
        <SignInModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  const user = data.user
  const displayName = user.name || user.email

  async function handleSignOut() {
    setSignOutPending(true)
    try {
      await authClient.signOut()
    } finally {
      setSignOutPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 pixel-border bg-[rgba(47,125,50,0.12)] px-3 py-1 text-[var(--color-primary-glow)]">
        {user.image ? (
          <img src={user.image} alt="" className="h-5 w-5 rounded-sm" referrerPolicy="no-referrer" />
        ) : null}
        <span className="text-xs uppercase tracking-[0.2em]">{displayName}</span>
      </span>
      <button className="button-secondary" disabled={signOutPending} onClick={handleSignOut}>
        {signOutPending ? '…' : 'sign out'}
      </button>
    </div>
  )
}
