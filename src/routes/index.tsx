import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'

import { AuthChip } from '#/components/auth/auth-chip'
import { HomeOnboarding } from '#/components/home-onboarding'
import { SettingsButton } from '#/components/settings-button'
import { SettingsDrawer } from '#/components/settings-drawer'
import { useKonamiCode } from '#/hooks/useKonamiCode'
import { useSession } from '#/lib/auth-client'
import {
  DEFAULT_DIFFICULTY,
  type DifficultyPreset,
  difficultyPresets,
  isDifficultyPreset,
  PRESET_TOOLTIPS,
} from '#/lib/game/difficulty'
import {
  DEFAULT_MODS,
  MOD_TOGGLE_LABELS,
  type ModSet,
  modsMultiplier,
  normalizeMods,
} from '#/lib/game/mods'
import { isSupportedLanguage } from '#/lib/game/normalization'
import {
  DEFAULT_ROUND_SHAPE,
  isRoundShape,
  type RoundShape,
  roundShapes,
} from '#/lib/game/round-shape'
import {
  type LocalBestScoreMap,
  loadLocalBestScores,
  loadStoredPreferences,
  saveStoredPreferences,
} from '#/lib/game/storage'
import type { LanguageId } from '#/lib/game/types'
import { languageLabels, languages } from '#/lib/game/types'
import { buildCanonicalLink, buildHomeStructuredData, buildSeoMeta, SITE_NAME } from '#/lib/seo'
import { getLeaderboardPreview } from '#/server/leaderboard'

const getLeaderboardPreviewServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const [timed, survival] = await Promise.all([
    getLeaderboardPreview(5, 'timed'),
    getLeaderboardPreview(5, 'survival'),
  ])
  return { timed, survival }
})
const REPO_URL = 'https://github.com/guilherme-grimm/grimms-monkeytype'
const FRIEND_PROJECT = {
  label: 'Also try',
  title: 'Terminal Hack',
  callout: 'Try it and see how you fare against the others',
  bodyCopy: '1v1 typing battle of terminal commands, where the best hacker shall win',
  ctaLabel: 'play terminal.hack',
  url: 'https://terminalhack.shardweb.app/',
} as const

export const Route = createFileRoute('/')({
  // Only emit the `language` key when it's a real value — returning
  // `{ language: undefined }` makes TanStack Router's stringifier drop it
  // and round-trip to `{}`, which fails the route-shape consistency check
  // and emits the "Generated path / for route __root__ did not match after
  // params.stringify" warning.
  validateSearch: (search) =>
    isSupportedLanguage(search.language) ? { language: search.language } : {},
  loader: async () => ({
    leaderboardByShape: await getLeaderboardPreviewServerFn(),
  }),
  head: () => ({
    meta: [
      ...buildSeoMeta({
        title: `${SITE_NAME} | Code typing game`,
        description:
          'Practice typing code snippets in a fast browser game with programming languages, scoring, and leaderboards.',
        path: '/',
      }),
      ...buildHomeStructuredData(),
    ],
    links: [buildCanonicalLink('/')],
  }),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  const { leaderboardByShape } = Route.useLoaderData()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageId>(
    search.language ?? 'javascript',
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyPreset>(DEFAULT_DIFFICULTY)
  const [selectedRoundShape, setSelectedRoundShape] = useState<RoundShape>(DEFAULT_ROUND_SHAPE)
  const [customMods, setCustomMods] = useState<ModSet>(DEFAULT_MODS)
  const [localBestScores, setLocalBestScores] = useState<LocalBestScoreMap>({})
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Default to true (= hide dot) for SSR parity; the storage-read effect flips
  // it to false only when the user has never opened the drawer.
  const [hasSeenSettingsHint, setHasSeenSettingsHint] = useState(true)
  // Default false for SSR parity; the storage-read effect flips it on only when
  // storage confirms the user has never dismissed the welcome modal.
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [binaryUnlocked, setBinaryUnlocked] = useState(false)
  const [showBinaryToast, setShowBinaryToast] = useState(false)
  const [glitching, setGlitching] = useState(false)
  const { data: session, isPending: sessionPending } = useSession()

  useKonamiCode(() => {
    setBinaryUnlocked((prev) => {
      if (!prev) {
        saveStoredPreferences({ binaryUnlocked: true })
      }
      return true
    })
    setSelectedLanguage('binary')
    setShowBinaryToast(true)
    setGlitching(true)
  })

  useEffect(() => {
    if (!showBinaryToast) return
    const handle = window.setTimeout(() => setShowBinaryToast(false), 4000)
    return () => window.clearTimeout(handle)
  }, [showBinaryToast])

  useEffect(() => {
    if (!glitching) return
    const handle = window.setTimeout(() => setGlitching(false), 700)
    return () => window.clearTimeout(handle)
  }, [glitching])

  const visibleLanguages = binaryUnlocked
    ? languages
    : languages.filter((language) => language !== 'binary')

  const selectedLeaderboard = leaderboardByShape[selectedRoundShape][selectedLanguage] ?? []

  useEffect(() => {
    const preferences = loadStoredPreferences()
    const fallbackLanguage = search.language ?? preferences?.lastLanguage ?? 'javascript'
    setSelectedLanguage(fallbackLanguage)
    if (isDifficultyPreset(preferences?.difficultyPreset)) {
      setSelectedDifficulty(preferences.difficultyPreset)
    }
    if (isRoundShape(preferences?.roundShape)) {
      setSelectedRoundShape(preferences.roundShape)
    }
    if (preferences?.customMods) {
      setCustomMods(normalizeMods(preferences.customMods))
    }
    setHasSeenSettingsHint(preferences?.settingsHintSeen === true)
    setOnboardingOpen(preferences?.hasSeenHomeOnboarding !== true)
    setBinaryUnlocked(preferences?.binaryUnlocked === true)
    setLocalBestScores(loadLocalBestScores())
  }, [search.language])

  useEffect(() => {
    saveStoredPreferences({ lastLanguage: selectedLanguage })
  }, [selectedLanguage])

  function handleDifficultyChange(next: DifficultyPreset) {
    setSelectedDifficulty(next)
    saveStoredPreferences({ difficultyPreset: next })
  }

  function handleRoundShapeChange(next: RoundShape) {
    setSelectedRoundShape(next)
    saveStoredPreferences({ roundShape: next })
  }

  function handleModsChange(next: ModSet) {
    setCustomMods(next)
    saveStoredPreferences({ customMods: next })
  }

  function handleDismissOnboarding() {
    setOnboardingOpen(false)
    saveStoredPreferences({ hasSeenHomeOnboarding: true })
  }

  return (
    <main
      className={`app-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 sm:py-10 ${
        glitching ? 'konami-glitch' : ''
      }`}
    >
      {glitching && <div className="konami-glitch-overlay" aria-hidden="true" />}
      {showBinaryToast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2 pixel-border bg-[var(--color-panel)] px-4 py-3 text-sm terminal-text shadow-lg"
        >
          &gt; konami.unlock OK · binary snippets available
        </div>
      )}
      <HomeOnboarding
        open={onboardingOpen && !sessionPending}
        onDismiss={handleDismissOnboarding}
        isAnon={!session?.user}
      />
      <div className="flex items-center justify-end gap-3 pb-4">
        <SettingsButton
          hasUnread={!hasSeenSettingsHint}
          onClick={() => {
            if (!hasSeenSettingsHint) {
              setHasSeenSettingsHint(true)
              saveStoredPreferences({ settingsHintSeen: true })
            }
            setSettingsOpen(true)
          }}
        />
        <AuthChip />
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        difficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
        roundShape={selectedRoundShape}
        onRoundShapeChange={handleRoundShapeChange}
        mods={customMods}
        onModsChange={handleModsChange}
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
                  {visibleLanguages.map((language) => {
                    const active = language === selectedLanguage

                    return (
                      <button
                        type="button"
                        key={language}
                        className={active ? 'button-primary' : 'button-secondary'}
                        onClick={() => setSelectedLanguage(language)}
                      >
                        {languageLabels[language]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="eyebrow text-[var(--color-muted)]">round shape</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {roundShapes.map((shape) => {
                    const active = shape === selectedRoundShape

                    return (
                      <button
                        type="button"
                        key={shape}
                        className={active ? 'button-primary' : 'button-secondary'}
                        onClick={() => handleRoundShapeChange(shape)}
                      >
                        {shape}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                  {selectedRoundShape === 'survival'
                    ? '25s safe warmup, then endless. Streak fuels the meter; after warmup, one mistake or empty meter ends the run.'
                    : 'Classic 30-second sprint. Score = base × difficulty multiplier.'}
                </p>
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

              {selectedDifficulty === 'custom' && (
                <ActiveModsSummary mods={customMods} onEdit={() => setSettingsOpen(true)} />
              )}

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

          <div className="panel-soft max-w-2xl px-4 py-4 sm:px-5">
            <p className="eyebrow text-[var(--color-accent-glow)]">open source</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-muted)] sm:text-base">
              Built in public. Read the code, file issues, or fork it into your own typing arena.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                className="button-secondary no-underline"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                github repo
              </a>
            </div>
          </div>

          <FriendProjectCard />
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
            <h2 className="mt-3 text-2xl font-semibold terminal-text">
              Local bests · {selectedRoundShape}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Stored in this browser, per mode. Switch round shape above to see the other set.
            </p>

            <div className="mt-6 grid gap-3">
              {visibleLanguages.map((language) => {
                const bestScore = localBestScores[language]?.[selectedRoundShape]

                return (
                  <article
                    key={language}
                    className="pixel-border bg-[var(--color-panel-soft)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow text-[var(--color-muted)]">
                          {languageLabels[language]}
                        </p>
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
                    {languageLabels[selectedLanguage]} · {selectedRoundShape} top runs
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
                  search={{ language: selectedLanguage, roundShape: selectedRoundShape }}
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
                  <EmptyLeaderboardState
                    language={selectedLanguage}
                    roundShape={selectedRoundShape}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function FriendProjectCard() {
  return (
    <div className="panel-soft max-w-2xl border-l-2 border-[var(--color-border-soft)] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="eyebrow text-[var(--color-muted)]">{FRIEND_PROJECT.label}</p>
        <span className="pixel-border bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
          terminal arena
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-semibold terminal-text">{FRIEND_PROJECT.title}</h2>
      <p className="mt-4 max-w-md text-lg font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)] sm:text-xl">
        {FRIEND_PROJECT.callout}
      </p>
      <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--color-muted)] sm:text-base">
        {FRIEND_PROJECT.bodyCopy}
      </p>

      <div className="mt-5 border-t border-[var(--color-border-soft)] pt-4">
        <a
          className="button-secondary no-underline opacity-90"
          href={FRIEND_PROJECT.url}
          target="_blank"
          rel="noreferrer"
        >
          {FRIEND_PROJECT.ctaLabel}
        </a>
      </div>
    </div>
  )
}

function ActiveModsSummary({ mods, onEdit }: { mods: ModSet; onEdit: () => void }) {
  const multiplier = modsMultiplier(mods)
  const activeLabels = (Object.keys(MOD_TOGGLE_LABELS) as Array<keyof typeof MOD_TOGGLE_LABELS>)
    .filter((key) => mods[key])
    .map((key) => MOD_TOGGLE_LABELS[key])
  if (mods.indentMode !== 'auto') {
    activeLabels.push(`indent: ${mods.indentMode}`)
  }
  const summary = activeLabels.length > 0 ? activeLabels.join(', ') : 'no toggles active'

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
      <span className="eyebrow text-[var(--color-muted)]">mods</span>
      <span
        className="tabular-nums text-[var(--color-text-strong)]"
        title="live multiplier from active mods"
      >
        ×{multiplier.toFixed(2)}
      </span>
      <span>—</span>
      <span className="min-w-0 flex-1 truncate">{summary}</span>
      <button type="button" className="button-accent" onClick={onEdit}>
        edit
      </button>
    </div>
  )
}

function EmptyLeaderboardState(props: { language: LanguageId; roundShape: RoundShape }) {
  return (
    <article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--color-muted)]">
      No leaderboard runs seeded yet for {languageLabels[props.language]} ({props.roundShape}).
    </article>
  )
}
