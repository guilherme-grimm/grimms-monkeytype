import type { Rank } from '#/lib/game/scoring'

type RankBadgeProps = {
  rank: Rank
  isPersonalBest?: boolean
}

const TIER_CLASS: Record<Rank, string> = {
  S: 'rank-badge rank-badge-s',
  A: 'rank-badge rank-badge-a',
  B: 'rank-badge rank-badge-b',
  C: 'rank-badge rank-badge-c',
  D: 'rank-badge rank-badge-d',
}

export function RankBadge({ rank, isPersonalBest = false }: RankBadgeProps) {
  return (
    <div className="rank-badge-wrap">
      <div className={TIER_CLASS[rank]} aria-label={`rank ${rank}`}>
        <span className="rank-badge-letter">{rank}</span>
        <span className="rank-badge-shimmer" aria-hidden="true" />
      </div>
      {isPersonalBest ? (
        <span className="rank-badge-pb-tag" aria-label="new personal best">
          NEW BEST
        </span>
      ) : null}
    </div>
  )
}
