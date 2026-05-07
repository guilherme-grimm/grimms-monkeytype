import type { Rank } from '#/lib/game/scoring'

import { PALETTE, RANK_BORDER, RANK_GLOW, RANK_LETTER } from './colors'

export type RunCardInput = {
	rank: Rank
	score: number
	wpm: number
	accuracy: number
	snippetsCompleted: number
	language: string
	mode: string
	userName: string
}

export function renderRunCard(input: RunCardInput) {
	const { rank, score, wpm, accuracy, snippetsCompleted, language, mode, userName } = input

	return (
		<div
			style={{
				width: '1200px',
				height: '630px',
				display: 'flex',
				flexDirection: 'column',
				backgroundColor: PALETTE.bg,
				backgroundImage:
					'linear-gradient(180deg, rgba(132, 226, 114, 0.04) 0%, rgba(0, 0, 0, 0) 60%), repeating-linear-gradient(0deg, rgba(132, 226, 114, 0.05) 0px, rgba(132, 226, 114, 0.05) 1px, transparent 1px, transparent 4px)',
				padding: '56px 64px',
				fontFamily: 'JetBrains Mono',
				color: PALETTE.text,
				border: `4px solid ${PALETTE.border}`,
			}}
		>
			{/* Top bar: brand + language/mode */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					width: '100%',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div
						style={{
							fontSize: 32,
							fontWeight: 700,
							color: PALETTE.primaryGlow,
							letterSpacing: '-0.02em',
						}}
					>
						typer.grimm0.dev
					</div>
					<div
						style={{
							marginTop: 6,
							fontSize: 18,
							color: PALETTE.muted,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
						}}
					>
						run complete
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-end',
					}}
				>
					<div
						style={{
							fontSize: 24,
							color: PALETTE.primaryGlow,
							fontWeight: 700,
						}}
					>
						{language}
					</div>
					<div
						style={{
							display: 'flex',
							marginTop: 6,
							fontSize: 18,
							color: PALETTE.muted,
							textTransform: 'uppercase',
							letterSpacing: '0.1em',
						}}
					>
						{`${mode} mode`}
					</div>
				</div>
			</div>

			{/* Hero: rank tile + score */}
			<div
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 64,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						width: 280,
						height: 280,
						border: `6px solid ${RANK_BORDER[rank]}`,
						boxShadow: `0 0 60px ${RANK_GLOW[rank]}`,
						borderRadius: 8,
						backgroundColor: 'rgba(8, 14, 8, 0.6)',
						marginBottom: 24,
					}}
				>
					<span
						style={{
							fontSize: 220,
							fontWeight: 700,
							color: RANK_LETTER[rank],
							lineHeight: 1,
							// optical centering: glyph baseline sits below geometric centre,
							// nudge up so the letter reads centred inside the tile.
							marginTop: -8,
						}}
					>
						{rank}
					</span>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
					}}
				>
					<span
						style={{
							fontSize: 168,
							fontWeight: 700,
							color: PALETTE.textStrong,
							lineHeight: 1,
							letterSpacing: '-0.03em',
						}}
					>
						{score}
					</span>
					<span
						style={{
							marginTop: 12,
							fontSize: 24,
							color: PALETTE.muted,
							textTransform: 'uppercase',
							letterSpacing: '0.18em',
						}}
					>
						score
					</span>
				</div>
			</div>

			{/* Stats row */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					gap: 48,
					padding: '20px 0',
					border: `1px solid ${PALETTE.border}`,
					borderLeft: 'none',
					borderRight: 'none',
				}}
			>
				<Stat label="wpm" value={wpm.toFixed(1)} />
				<span style={{ fontSize: 28, color: PALETTE.muted }}>•</span>
				<Stat label="accuracy" value={`${accuracy.toFixed(1)}%`} />
				<span style={{ fontSize: 28, color: PALETTE.muted }}>•</span>
				<Stat label="snippets" value={String(snippetsCompleted)} />
			</div>

			{/* Bottom: user */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginTop: 28,
				}}
			>
				<div
					style={{
						display: 'flex',
						fontSize: 26,
						color: PALETTE.textStrong,
						fontWeight: 700,
					}}
				>
					{`@${userName}`}
				</div>
				<div
					style={{
						fontSize: 18,
						color: PALETTE.muted,
						letterSpacing: '0.1em',
						textTransform: 'uppercase',
					}}
				>
					beat this run →
				</div>
			</div>
		</div>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
			}}
		>
			<span
				style={{
					fontSize: 44,
					fontWeight: 700,
					color: PALETTE.textStrong,
					lineHeight: 1,
				}}
			>
				{value}
			</span>
			<span
				style={{
					marginTop: 6,
					fontSize: 18,
					color: PALETTE.muted,
					textTransform: 'uppercase',
					letterSpacing: '0.15em',
				}}
			>
				{label}
			</span>
		</div>
	)
}
