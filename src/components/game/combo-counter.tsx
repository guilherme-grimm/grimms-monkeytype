type ComboCounterProps = {
  streak: number
  errorPulseToken: number
  snippetClearedToken: number
}

// Threshold ladder. Below first threshold we hide entirely so the early-run
// chrome stays clean; the counter is a reward, not a HUD readout.
const SHOW_AT = 10
const GLOW_AT = 25
const ROAR_AT = 50

function tierClass(streak: number) {
  if (streak >= ROAR_AT) return 'combo-counter combo-counter-roar'
  if (streak >= GLOW_AT) return 'combo-counter combo-counter-glow'
  return 'combo-counter'
}

export function ComboCounter({ streak, errorPulseToken, snippetClearedToken }: ComboCounterProps) {
  if (streak < SHOW_AT) {
    return null
  }

  return (
    <div
      className={tierClass(streak)}
      data-error-token={errorPulseToken}
      data-cleared-token={snippetClearedToken}
      aria-label={`combo ${streak}`}
    >
      <span className="combo-counter-label">combo</span>
      <span className="combo-counter-value">{streak}</span>
    </div>
  )
}
