import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { isSupportedLanguage } from '#/lib/game/normalization'
import { loadLocalBestScores, loadStoredPreferences, saveStoredPreferences } from '#/lib/game/storage'
import { languages } from '#/lib/game/types'
import type { LanguageId, LocalBestScore } from '#/lib/game/types'

export const Route = createFileRoute('/')({
  validateSearch: (search) => ({
    language: isSupportedLanguage(search.language) ? search.language : undefined,
  }),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(search.language ?? 'javascript')
  const [localBestScores, setLocalBestScores] = useState<Partial<Record<LanguageId, LocalBestScore>>>({})

  useEffect(() => {
    const preferences = loadStoredPreferences()
    const fallbackLanguage = search.language ?? preferences?.lastLanguage ?? 'javascript'
    setSelectedLanguage(fallbackLanguage)
    setLocalBestScores(loadLocalBestScores())
  }, [search.language])

  useEffect(() => {
    saveStoredPreferences({ lastLanguage: selectedLanguage })
  }, [selectedLanguage])

  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <section className="hero-grid gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="eyebrow terminal-text">typer.grimm0.dev</p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              <span className="glitch-text">Monkeytype</span>{' '}
              <span className="terminal-text">for code.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              Real code blocks, thirty second rounds, and a phosphor terminal feel. Type straight through. Newlines are visual. Tabs jump indentation.
            </p>
          </div>

          <div className="panel scan-lines max-w-2xl overflow-hidden">
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

              <div className="flex flex-wrap gap-3">
                <Link className="button-primary no-underline" to="/play" search={{ language: selectedLanguage }}>
                  Start run
                </Link>
                <span className="button-accent pointer-events-none opacity-75">first keypress starts timer</span>
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
                  <article key={language} className="pixel-border bg-[var(--color-panel-soft)] px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow text-[var(--color-muted)]">{language}</p>
                        <p className="mt-3 text-3xl font-semibold terminal-text">{bestScore?.score ?? '--'}</p>
                      </div>

                      <div className="text-right text-sm text-[var(--color-muted)]">
                        <p>{bestScore ? `${bestScore.accuracy}% accuracy` : 'no run yet'}</p>
                        <p>{bestScore ? `${bestScore.snippetsCompleted} snippets` : 'play to save a local best'}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
