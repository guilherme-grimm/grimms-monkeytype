import { useEffect, useId, useState } from 'react'

import {
	difficultyPresets,
	PRESET_TOOLTIPS,
	type DifficultyPreset,
} from '#/lib/game/difficulty'
import {
	type ImmersionPrefs,
	resetImmersionPrefs,
	setImmersionPref,
	useImmersionPrefs,
} from '#/lib/game/immersion-prefs'
import {
	loadStoredPreferences,
	saveStoredPreferences,
} from '#/lib/game/storage'

type SettingsDrawerProps = {
	open: boolean
	onClose: () => void
	// Optional: when the drawer is opened from inside an active /play session,
	// the parent passes its live state so the drawer mirrors it instead of
	// reading from storage and going out of sync. Omitting these makes the
	// drawer self-contained (home page case).
	difficulty?: DifficultyPreset
	onDifficultyChange?: (next: DifficultyPreset) => void
	typingSoundEnabled?: boolean
	onTypingSoundChange?: (next: boolean) => void
}

export function SettingsDrawer({
	open,
	onClose,
	difficulty: controlledDifficulty,
	onDifficultyChange,
	typingSoundEnabled: controlledSound,
	onTypingSoundChange,
}: SettingsDrawerProps) {
	const titleId = useId()

	// Self-contained mode (no controlled props): hold local state mirrored from
	// storage so the home-page drawer just works without a parent wiring it up.
	const [localDifficulty, setLocalDifficulty] = useState<DifficultyPreset>('normal')
	const [localSound, setLocalSound] = useState<boolean>(true)
	// Preview the description for whichever preset is currently hovered/focused;
	// falls back to the selected preset. The floating `.has-tooltip` pattern got
	// clipped by the drawer's overflow boundary, so we render the description
	// inline instead and just swap which preset's text is shown.
	const [hoveredPreset, setHoveredPreset] = useState<DifficultyPreset | null>(null)

	useEffect(() => {
		if (!open) return
		if (controlledDifficulty !== undefined && controlledSound !== undefined) return
		const stored = loadStoredPreferences()
		if (stored?.difficultyPreset) setLocalDifficulty(stored.difficultyPreset)
		if (typeof stored?.typingSoundEnabled === 'boolean') setLocalSound(stored.typingSoundEnabled)
	}, [open, controlledDifficulty, controlledSound])

	// Esc to close. Scoped to the drawer being open so we don't fight the
	// /play route's Esc-to-reset binding when the drawer isn't shown.
	useEffect(() => {
		if (!open) return
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				event.preventDefault()
				event.stopPropagation()
				onClose()
			}
		}
		window.addEventListener('keydown', onKey, { capture: true })
		return () => window.removeEventListener('keydown', onKey, { capture: true })
	}, [open, onClose])

	const difficulty = controlledDifficulty ?? localDifficulty
	const typingSoundEnabled = controlledSound ?? localSound

	function handleDifficultyChange(next: DifficultyPreset) {
		if (onDifficultyChange) {
			onDifficultyChange(next)
		} else {
			setLocalDifficulty(next)
			saveStoredPreferences({ difficultyPreset: next })
		}
	}

	function handleSoundChange(next: boolean) {
		if (onTypingSoundChange) {
			onTypingSoundChange(next)
		} else {
			setLocalSound(next)
			saveStoredPreferences({ typingSoundEnabled: next })
		}
	}

	if (!open) return null

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			className="settings-drawer-backdrop"
			onClick={onClose}
		>
			<aside
				className="settings-drawer"
				onClick={(event) => event.stopPropagation()}
			>
				<header className="settings-drawer-header">
					<p className="eyebrow text-[var(--color-accent-glow)]">~/typer/settings.cfg</p>
					<h2 id={titleId} className="text-2xl font-semibold terminal-text">Settings</h2>
					<button
						className="settings-drawer-close"
						onClick={onClose}
						aria-label="Close settings"
						type="button"
					>
						×
					</button>
				</header>

				<section className="settings-drawer-section">
					<p className="eyebrow text-[var(--color-muted)]">difficulty</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{difficultyPresets.map((preset) => (
							<button
								key={preset}
								type="button"
								className={preset === difficulty ? 'button-primary' : 'button-secondary'}
								onMouseEnter={() => setHoveredPreset(preset)}
								onMouseLeave={() => setHoveredPreset(null)}
								onFocus={() => setHoveredPreset(preset)}
								onBlur={() => setHoveredPreset(null)}
								onClick={() => handleDifficultyChange(preset)}
							>
								{preset}
							</button>
						))}
					</div>
					<p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
						{PRESET_TOOLTIPS[hoveredPreset ?? difficulty]}
					</p>
				</section>

				<section className="settings-drawer-section">
					<p className="eyebrow text-[var(--color-muted)]">typing sound</p>
					<div className="mt-3 flex items-center gap-3">
						<button
							type="button"
							className={typingSoundEnabled ? 'button-accent' : 'button-secondary'}
							onClick={() => handleSoundChange(!typingSoundEnabled)}
						>
							sound {typingSoundEnabled ? 'on' : 'off'}
						</button>
						<span className="text-sm text-[var(--color-muted)]">
							Phosphor click on every keystroke. Pitches up on streaks.
						</span>
					</div>
				</section>

				<ImmersionSection />
			</aside>
		</div>
	)
}

const VISUAL_TOGGLES: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }> = [
	{ key: 'vignette', label: 'vignette', hint: 'radial fade as streak climbs' },
	{ key: 'chromeDimming', label: 'chrome dim', hint: 'meta + control labels recede' },
	{ key: 'caretGlowEscalation', label: 'caret glow', hint: 'caret pulse intensifies' },
	{ key: 'snippetSaturation', label: 'snippet lift', hint: 'past-typed text saturates' },
	{ key: 'snapBack', label: 'snap-back', hint: 'visual jolt on error' },
]

const AUDIO_TOGGLES: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }> = [
	{ key: 'audioGainEscalation', label: 'gain ramp', hint: 'streak → louder typing tone' },
	{ key: 'errorThunk', label: 'error thunk', hint: 'low thump when streak breaks' },
]

const VISUAL_SLIDERS: Array<{
	key: keyof ImmersionPrefs
	label: string
	min: number
	max: number
	step: number
	unit?: string
}> = [
		{ key: 'vignetteDarkness', label: 'vignette darkness', min: 0, max: 1, step: 0.01 },
		{ key: 'caretGlowCeilingPx', label: 'caret glow ceiling', min: 0, max: 30, step: 1, unit: 'px' },
		{ key: 'snippetSaturationLift', label: 'snippet saturation lift', min: 0, max: 0.6, step: 0.01 },
		{ key: 'snapBackBrightness', label: 'snap-back brightness', min: 0.4, max: 1.0, step: 0.01 },
		{ key: 'snapBackDurationMs', label: 'snap-back duration', min: 60, max: 400, step: 10, unit: 'ms' },
	]

const AUDIO_SLIDERS: Array<{
	key: keyof ImmersionPrefs
	label: string
	min: number
	max: number
	step: number
	unit?: string
}> = [
		{ key: 'audioGainCeiling', label: 'gain ramp ceiling', min: 0, max: 1.5, step: 0.05 },
		{ key: 'errorThunkVolume', label: 'thunk volume', min: 0, max: 0.05, step: 0.001 },
	]

function ImmersionSection() {
	const prefs = useImmersionPrefs()

	return (
		<section className="settings-drawer-section">
			<div className="flex items-center justify-between gap-3">
				<p className="eyebrow text-[var(--color-muted)]">immersion</p>
				<button type="button" className="button-secondary" onClick={() => resetImmersionPrefs()}>
					reset
				</button>
			</div>
			<p className="mt-2 text-sm text-[var(--color-muted)]">
				Feel free to mess with how you like it.
			</p>

			<div className="mt-4">
				<p className="eyebrow text-[var(--color-muted)] text-[10px]">visual</p>
				<ImmersionToggles specs={VISUAL_TOGGLES} prefs={prefs} />
				<ImmersionSliders specs={VISUAL_SLIDERS} prefs={prefs} />
			</div>

			<div className="mt-4">
				<p className="eyebrow text-[var(--color-muted)] text-[10px]">audio</p>
				<ImmersionToggles specs={AUDIO_TOGGLES} prefs={prefs} />
				<ImmersionSliders specs={AUDIO_SLIDERS} prefs={prefs} />
			</div>
		</section>
	)
}

function ImmersionToggles({
	specs,
	prefs,
}: {
	specs: Array<{ key: keyof ImmersionPrefs; label: string; hint: string }>
	prefs: ImmersionPrefs
}) {
	return (
		<div className="mt-2 flex flex-wrap gap-2">
			{specs.map((spec) => {
				const value = prefs[spec.key] as boolean
				return (
					<button
						key={spec.key as string}
						type="button"
						className={value ? 'button-accent' : 'button-secondary'}
						title={spec.hint}
						onClick={() => setImmersionPref(spec.key, !value as never)}
					>
						{spec.label}
					</button>
				)
			})}
		</div>
	)
}

function ImmersionSliders({
	specs,
	prefs,
}: {
	specs: Array<{
		key: keyof ImmersionPrefs
		label: string
		min: number
		max: number
		step: number
		unit?: string
	}>
	prefs: ImmersionPrefs
}) {
	return (
		<div className="mt-3 flex flex-col gap-2">
			{specs.map((spec) => {
				const value = prefs[spec.key] as number
				const decimals = spec.step < 1 ? Math.max(0, -Math.floor(Math.log10(spec.step))) : 0
				return (
					<label key={spec.key as string} className="flex flex-col gap-1 text-xs">
						<span className="flex items-center justify-between text-[var(--color-muted)]">
							<span>{spec.label}</span>
							<span className="tabular-nums text-[var(--color-text-strong)]">
								{value.toFixed(decimals)}
								{spec.unit ?? ''}
							</span>
						</span>
						<input
							type="range"
							min={spec.min}
							max={spec.max}
							step={spec.step}
							value={value}
							onChange={(event) => setImmersionPref(spec.key, Number(event.target.value) as never)}
							className="debug-slider"
						/>
					</label>
				)
			})}
		</div>
	)
}
