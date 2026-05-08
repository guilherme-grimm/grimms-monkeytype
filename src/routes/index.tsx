import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'

import { AuthChip } from '#/components/auth/auth-chip'
import { SettingsButton } from '#/components/settings-button'
import { SettingsDrawer } from '#/components/settings-drawer'
import {
  DEFAULT_DIFFICULTY,
  type DifficultyPreset,
  difficultyPresets,
  isDifficultyPreset,
  PRESET_TOOLTIPS,
} from '#/lib/game/difficulty'
import { isSupportedLanguage } from '#/lib/game/normalization'
import {
  loadLocalBestScores,
  loadStoredPreferences,
  saveStoredPreferences,
} from '#/lib/game/storage'
import type { LanguageId, LocalBestScore } from '#/lib/game/types'
import { languages } from '#/lib/game/types'
import { getLeaderboardPreview } from '#/server/leaderboard'

const getLeaderboardPreviewServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  return getLeaderboardPreview(5)
})

export const Route = createFileRoute('/')({
  // Only emit the `language` key when it's a real value — returning
  // `{ language: undefined }` makes TanStack Router's stringifier drop it
  // and round-trip to `{}`, which fails the route-shape consistency check
  // and emits the "Generated path / for route __root__ did not match after
  // params.stringify" warning.
  validateSearch: (search) =>
    isSupportedLanguage(search.language) ? { language: search.language } : {},
  loader: async () => ({
    leaderboard: await getLeaderboardPreviewServerFn(),
  }),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const { leaderboard } = Route.useLoaderData()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(
    search.language ?? 'javascript',
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyPreset>(DEFAULT_DIFFICULTY)
  const [localBestScores, setLocalBestScores] = useState<
    Partial<Record<LanguageId, LocalBestScore>>
  >({})
  const [settingsOpen, setSettingsOpen] = useState(false)

  const selectedLeaderboard = leaderboard[selectedLanguage] ?? []

  useEffect(() => {
    const preferences = loadStoredPreferences()
    const fallbackLanguage = search.language ?? preferences?.lastLanguage ?? 'javascript'
    setSelectedLanguage(fallbackLanguage)
    if (isDifficultyPreset(preferences?.difficultyPreset)) {
      setSelectedDifficulty(preferences.difficultyPreset)
    }
    setLocalBestScores(loadLocalBestScores())
  }, [search.language])

  useEffect(() => {
    saveStoredPreferences({ lastLanguage: selectedLanguage })
  }, [selectedLanguage])

  function handleDifficultyChange(next: DifficultyPreset) {
    setSelectedDifficulty(next)
    saveStoredPreferences({ difficultyPreset: next })
  }

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex items-center justify-end gap-3 pb-4">
        <SettingsButton onClick={() => setSettingsOpen(true)} />
        <AuthChip />
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        difficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
      />
      <section className="hero-grid gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="eyebrow terminal-text">typer.grimm0.dev</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              <span className="glitch-text">Monkeytype</span>{' '}
              <span className="terminal-text">for code.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              Write code for fun while the agents do the heavy lifting. Hone the unused skill of
              touch typing.
            </p>
          </div>

          <div className="panel scan-lines max-w-2xl">
            <div className="terminal-header">
              <div className="terminal-dots text-[var(--color-accent)]">
                <span />
                <span className="text-yellow-400" />
                <span className="text-[var(--color-primary-glow)]" />
              </div>
              <span className="terminal-title">~/typer/session.cfg</span>
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6">
              <div>
                <p className="eyebrow text-[var(--color-muted)]">language</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {languages.map((language) => {
                    const active = language === selectedLanguage

                    return (
                      <button
                        type="button"
                        key={language}
                        className={active ? 'button-primary' : 'button-secondary'}
                        onClick={() => setSelectedLanguage(language)}
                      >
                        {language}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="eyebrow text-[var(--color-muted)]">difficulty</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {difficultyPresets.map((preset) => {
                    const active = preset === selectedDifficulty

                    return (
                      <button
                        type="button"
                        key={preset}
                        className={`has-tooltip ${active ? 'button-primary' : 'button-secondary'}`}
                        data-tooltip={PRESET_TOOLTIPS[preset]}
                        onClick={() => handleDifficultyChange(preset)}
                      >
                        {preset}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className="button-primary no-underline"
                  to="/play"
                  search={{ language: selectedLanguage }}
                >
                  Start run
                </Link>
                <span className="button-accent pointer-events-none opacity-75">
                  first keypress starts timer
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
            <span className="eyebrow terminal-text">rules</span>
            <span>line breaks are visual</span>
            <span>spaces still count</span>
            <span>tab jumps indent</span>
          </div>
        </div>

        <div className="panel scan-lines overflow-hidden">
          <div className="terminal-header">
            <div className="terminal-dots text-[var(--color-accent)]">
              <span />
              <span className="text-yellow-400" />
              <span className="text-[var(--color-primary-glow)]" />
            </div>
            <span className="terminal-title">~/typer/local-bests.log</span>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <p className="eyebrow text-[var(--color-accent-glow)]">returning visitor</p>
            <h2 className="mt-3 text-2xl font-semibold terminal-text">Local bests</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Stored in this browser for now. Global identity and leaderboards come next.
            </p>

            <div className="mt-6 grid gap-3">
              {languages.map((language) => {
                const bestScore = localBestScores[language]

                return (
                  <article
                    key={language}
                    className="pixel-border bg-[var(--color-panel-soft)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow text-[var(--color-muted)]">{language}</p>
                        <p className="mt-3 text-3xl font-semibold terminal-text">
                          {bestScore?.score ?? '--'}
                        </p>
                      </div>

                      <div className="text-right text-sm text-[var(--color-muted)]">
                        <p>{bestScore ? `${bestScore.accuracy}% accuracy` : 'no run yet'}</p>
                        <p>
                          {bestScore
                            ? `${bestScore.snippetsCompleted} snippets`
                            : 'play to save a local best'}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-8 border-t border-[var(--color-border-soft)] pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow text-[var(--color-accent-glow)]">leaderboard preview</p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">
                    {selectedLanguage} top runs
                  </h3>
                </div>
                <span className="pixel-border bg-[rgba(47,125,50,0.12)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--color-primary-glow)]">
                  top {selectedLeaderboard.length || 0}
                </span>
              </div>

              <div className="mt-3 flex justify-end">
                <Link
                  className="button-secondary no-underline"
                  to="/leaderboard"
                  search={{ language: selectedLanguage }}
                >
                  view full leaderboard
                </Link>
              </div>

              <div className="mt-4 grid gap-3">
                {selectedLeaderboard.length > 0 ? (
                  selectedLeaderboard.map((entry, index) => (
                    <article
                      key={`${entry.language}-${entry.userId}`}
                      className="min-w-0 pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4"
                    >
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="eyebrow text-[var(--color-muted)]">#{index + 1}</p>
                          <p className="mt-2 truncate text-lg font-semibold text-[var(--color-text-strong)]">
                            {entry.userName}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {entry.wpm.toFixed(1)} wpm • {entry.accuracy.toFixed(1)}% accuracy
                          </p>
                        </div>

                        <div className="whitespace-nowrap sm:shrink-0 sm:text-right">
                          <p className="text-2xl font-semibold terminal-text">{entry.score}</p>
                          <p className="mt-1 text-sm text-[var(--color-muted)]">
                            {entry.snippetsCompleted} snippets
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyLeaderboardState language={selectedLanguage} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function EmptyLeaderboardState(props: { language: LanguageId }) {
  return (
    <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--color-muted)]">
      No leaderboard runs seeded yet for {props.language}.
    </article>
  )
}
