import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { AuthChip } from '#/components/auth/auth-chip'
import { isSupportedLanguage } from '#/lib/game/normalization'
import { languages, type LanguageId } from '#/lib/game/types'
import { auth } from '#/server/auth'
import { getLeaderboardByLanguage, getUserBestRank, type UserRank } from '#/server/leaderboard'

const getLeaderboardByLanguageServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { language: LanguageId }) => data)
  .handler(async ({ data }) => {
    return getLeaderboardByLanguage(data.language, 25)
  })

const getMyRankServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { language: LanguageId }) => data)
  .handler(async ({ data }): Promise<UserRank | null> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return null
    return getUserBestRank(session.user.id, data.language)
  })

export const Route = createFileRoute('/leaderboard')({
  validateSearch: (search) => ({
    language: isSupportedLanguage(search.language) ? search.language : 'javascript',
  }),
  loaderDeps: ({ search }) => ({ language: search.language }),
  loader: async ({ deps }) => {
    const [entries, myRank] = await Promise.all([
      getLeaderboardByLanguageServerFn({ data: { language: deps.language } }),
      getMyRankServerFn({ data: { language: deps.language } }),
    ])
    return { entries, myRank }
  },
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { language } = Route.useSearch()
  const { entries, myRank } = Route.useLoaderData()

  const selfId = myRank?.entry.userId ?? null
  const showRankFooter = myRank !== null && myRank.rank > entries.length

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex justify-end pb-4">
        <AuthChip />
      </div>

      <section className="panel scan-lines overflow-hidden">
        <div className="terminal-header">
          <div className="terminal-dots text-[var(--color-accent)]">
            <span />
            <span className="text-yellow-400" />
            <span className="text-[var(--color-primary-glow)]" />
          </div>
          <span className="terminal-title">~/typer/leaderboard.log</span>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow text-[var(--color-accent-glow)]">global bests</p>
              <h1 className="text-3xl font-semibold terminal-text sm:text-4xl">Leaderboard</h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                All-time best runs per coder, per language. GitHub login is required to appear here.
                Difficulty multiplier is baked into the score — Hard runs ×1.25, Normal ×1.00, Easy ×0.85.
              </p>
            </div>

            <Link className="button-secondary no-underline" to="/" search={{ language: undefined }}>
              back home
            </Link>
          </div>

          <div>
            <p className="eyebrow text-[var(--color-muted)]">language</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {languages.map((value) => (
                <Link
                  key={value}
                  className={value === language ? 'button-primary no-underline' : 'button-secondary no-underline'}
                  to="/leaderboard"
                  search={{ language: value }}
                >
                  {value}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--color-border-soft)] pt-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-[var(--color-muted)]">standard mode</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">{language} top 25</h2>
              </div>
              <span className="pixel-border bg-[rgba(47,125,50,0.12)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-primary-glow)]">
                {entries.length} entries
              </span>
            </div>

            <div className="grid gap-3">
              {entries.length > 0 ? (
                entries.map((entry, index) => (
                  <LeaderboardRow
                    key={`${entry.language}-${entry.userId}`}
                    rank={index + 1}
                    entry={entry}
                    isSelf={entry.userId === selfId}
                  />
                ))
              ) : (
                <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--color-muted)]">
                  No leaderboard runs found yet for {language}.
                </article>
              )}
            </div>

            {showRankFooter && myRank ? (
              <div className="mt-6 border-t border-dashed border-[var(--color-border-soft)] pt-4">
                <p className="eyebrow text-[var(--color-muted)] mb-3">your standing</p>
                <LeaderboardRow rank={myRank.rank} entry={myRank.entry} isSelf />
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}

type LeaderboardRowProps = {
  rank: number
  entry: import('#/server/leaderboard').LeaderboardEntry
  isSelf: boolean
}

function LeaderboardRow({ rank, entry, isSelf }: LeaderboardRowProps) {
  return (
    <article
      className={`min-w-0 pixel-border px-4 py-4 ${
        isSelf
          ? 'bg-[rgba(132,226,114,0.08)] outline outline-1 outline-[rgba(132,226,114,0.5)]'
          : 'bg-[rgba(255,255,255,0.03)]'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-[var(--color-muted)]">
            #{rank}
            {isSelf ? <span className="ml-2 text-[var(--color-accent-glow)]">you</span> : null}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {entry.userImage ? (
              <img
                src={entry.userImage}
                alt=""
                className="h-10 w-10 rounded-sm border border-[var(--color-border-soft)]"
                referrerPolicy="no-referrer"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[var(--color-text-strong)]">{entry.userName}</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {entry.wpm.toFixed(1)} wpm • {entry.accuracy.toFixed(1)}% accuracy • {entry.snippetsCompleted} snippets
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
                {entry.mode} <span className="text-[var(--color-text-strong)]">×{entry.multiplier.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="whitespace-nowrap sm:shrink-0 sm:text-right">
          <p className="text-3xl font-semibold terminal-text">{entry.score}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            base {entry.baseScore}
          </p>
        </div>
      </div>
    </article>
  )
}
