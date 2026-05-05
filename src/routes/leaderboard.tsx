import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

import { AuthChip } from '#/components/auth/auth-chip'
import { isSupportedLanguage } from '#/lib/game/normalization'
import { languages, type LanguageId } from '#/lib/game/types'
import { getLeaderboardByLanguage } from '#/server/leaderboard'

const getLeaderboardByLanguageServerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { language: LanguageId }) => data)
  .handler(async ({ data }) => {
    return getLeaderboardByLanguage(data.language, 25)
  })

export const Route = createFileRoute('/leaderboard')({
  validateSearch: (search) => ({
    language: isSupportedLanguage(search.language) ? search.language : 'javascript',
  }),
  loaderDeps: ({ search }) => ({ language: search.language }),
  loader: async ({ deps }) => ({
    entries: await getLeaderboardByLanguageServerFn({ data: { language: deps.language } }),
  }),
  component: LeaderboardPage,
})

function LeaderboardPage() {
  const { language } = Route.useSearch()
  const { entries } = Route.useLoaderData()

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
                  <article key={`${entry.language}-${entry.userId}`} className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="eyebrow text-[var(--color-muted)]">#{index + 1}</p>
                        <div className="mt-2 flex items-center gap-3">
                          {entry.userImage ? (
                            <img src={entry.userImage} alt="" className="h-10 w-10 rounded-sm border border-[var(--color-border-soft)]" referrerPolicy="no-referrer" />
                          ) : null}
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-[var(--color-text-strong)]">{entry.userName}</p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">
                              {entry.wpm.toFixed(1)} wpm • {entry.accuracy.toFixed(1)}% accuracy • {entry.snippetsCompleted} snippets
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-semibold terminal-text">{entry.score}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--color-muted)]">
                  No leaderboard runs found yet for {language}.
                </article>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
