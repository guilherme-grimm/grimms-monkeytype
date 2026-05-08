import type { Rank } from '#/lib/game/scoring'

// Rank-conditional tweet body. The card already shows the score and stats, so
// the body is voice — short hook, no stats repeat. C/D ranks deliberately
// avoid bragging copy because the card itself isn't a flex at those tiers.
export function buildShareText(rank: Rank, url: string): string {
	switch (rank) {
		case 'S':
			return `S rank. catch up. ${url}`
		case 'A':
		case 'B':
			return `${rank} rank. ${url}`
		case 'C':
		case 'D':
			return `Just ran a typing sprint. ${url}`
	}
}
