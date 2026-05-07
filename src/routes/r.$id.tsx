import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

import { RankBadge } from '#/components/game/rank-badge'
import { rankFor } from '#/lib/game/scoring'
import { isSupportedLanguage } from '#/lib/game/normalization'
import { user, score as scoreTable } from '#/server/auth-schema'
import { db } from '#/server/db'

type SharedRun = {
	id: string
	score: number
	baseScore: number
	multiplier: number
	mode: string
	wpm: number
	accuracy: number
	correctChars: number
	snippetsCompleted: number
	language: string
	userName: string
}

const SITE_URL = 'https://typer.grimm0.dev'

const getSharedRunServerFn = createServerFn({ method: 'GET' })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }): Promise<SharedRun | null> => {
		const row = await db
			.select({
				id: scoreTable.id,
				score: scoreTable.score,
				baseScore: scoreTable.baseScore,
				multiplier: scoreTable.multiplier,
				mode: scoreTable.mode,
				wpm: scoreTable.wpm,
				accuracy: scoreTable.accuracy,
				correctChars: scoreTable.correctChars,
				snippetsCompleted: scoreTable.snippetsCompleted,
				language: scoreTable.language,
				userName: user.name,
			})
			.from(scoreTable)
			.innerJoin(user, eq(scoreTable.userId, user.id))
			.where(eq(scoreTable.id, data.id))
			.limit(1)
			.then((rows) => rows[0] ?? null)

		return row
	})

export const Route = createFileRoute('/r/$id')({
	loader: async ({ params }) => {
		const run = await getSharedRunServerFn({ data: { id: params.id } })
		if (!run) throw notFound()
		return { run }
	},
	head: ({ loaderData }) => {
		const run = loaderData?.run
		if (!run) return {}

		const rank = rankFor(run.score)
		const title = `${run.userName} — ${rank} rank on typer.grimm0.dev`
		const description = `${run.score} score • ${run.wpm.toFixed(1)} wpm • ${run.accuracy.toFixed(1)}% accuracy • ${run.snippetsCompleted} snippets in ${run.language}`
		const url = `${SITE_URL}/r/${run.id}`
		const image = `${SITE_URL}/api/og/${run.id}`

		return {
			meta: [
				{ title },
				{ name: 'description', content: description },

				{ property: 'og:type', content: 'website' },
				{ property: 'og:title', content: title },
				{ property: 'og:description', content: description },
				{ property: 'og:url', content: url },
				{ property: 'og:image', content: image },
				{ property: 'og:image:width', content: '1200' },
				{ property: 'og:image:height', content: '630' },

				{ name: 'twitter:card', content: 'summary_large_image' },
				{ name: 'twitter:title', content: title },
				{ name: 'twitter:description', content: description },
				{ name: 'twitter:image', content: image },
			],
		}
	},
	component: SharedRunPage,
})

function SharedRunPage() {
	const { run } = Route.useLoaderData()
	const rank = rankFor(run.score)
	const playLanguage = isSupportedLanguage(run.language) ? run.language : 'javascript'

	return (
		<main className="app-shell mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6">
			<section className="panel scan-lines overflow-hidden">
				<div className="terminal-header">
					<div className="terminal-dots text-[var(--color-accent)]">
						<span />
						<span className="text-yellow-400" />
						<span className="text-[var(--color-primary-glow)]" />
					</div>
					<span className="terminal-title">~/typer/runs/{run.id.slice(0, 8)}.log</span>
				</div>

				<div className="space-y-6 px-5 py-6 sm:px-6 sm:py-8">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<p className="eyebrow text-[var(--color-accent-glow)]">shared run</p>
							<h1 className="mt-2 text-3xl font-semibold terminal-text">
								{run.userName}
							</h1>
							<p className="mt-1 text-sm text-[var(--color-muted)]">
								{run.language} • {run.mode}
							</p>
						</div>
						<RankBadge rank={rank} />
					</div>

					<div className="result-shell p-5 sm:p-6">
						<div className="flex flex-wrap items-baseline gap-3">
							<h2 className="text-3xl font-semibold terminal-text">{run.score} score</h2>
							<p className="score-breakdown text-sm text-[var(--color-muted)]">
								<span className="score-breakdown-base">{run.baseScore}</span>
								<span className="score-breakdown-op" aria-hidden="true">×</span>
								<span
									className={`score-breakdown-mult score-breakdown-mult-${run.mode}`}
									title={`${run.mode} difficulty multiplier`}
								>
									{run.multiplier.toFixed(2)}
								</span>
								<span className="score-breakdown-op" aria-hidden="true">=</span>
								<span className="score-breakdown-total">{run.score}</span>
							</p>
						</div>

						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							<article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
								<p className="eyebrow text-[var(--color-muted)]">wpm</p>
								<p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
									{run.wpm.toFixed(1)}
								</p>
							</article>
							<article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
								<p className="eyebrow text-[var(--color-muted)]">accuracy</p>
								<p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
									{run.accuracy.toFixed(1)}%
								</p>
							</article>
							<article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
								<p className="eyebrow text-[var(--color-muted)]">correct chars</p>
								<p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
									{run.correctChars}
								</p>
							</article>
							<article className="pixel-border bg-[rgba(255,255,255,0.03)] px-4 py-3">
								<p className="eyebrow text-[var(--color-muted)]">snippets</p>
								<p className="mt-2 text-2xl font-semibold text-[var(--color-text-strong)]">
									{run.snippetsCompleted}
								</p>
							</article>
						</div>
					</div>

					<div className="flex flex-wrap gap-3 pt-2">
						<Link
							to="/play"
							search={{ language: playLanguage }}
							className="button-primary no-underline"
						>
							Challenge it
						</Link>
						<Link
							to="/"
							search={{ language: playLanguage }}
							className="button-accent no-underline"
						>
							Chicken out
						</Link>
						<Link
							to="/leaderboard"
							search={{ language: playLanguage }}
							className="button-secondary no-underline"
						>
							Leaderboard
						</Link>
						<Link to="/" search={{ language: undefined }} className="button-secondary no-underline">
							Home
						</Link>
					</div>
				</div>
			</section>
		</main>
	)
}
