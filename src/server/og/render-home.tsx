import { PALETTE } from './colors'

// Homepage / fallback OG card. Used by the static /public/og.png that ships
// with the build, so anyone tweeting the bare site URL still unfurls a
// branded image. Same aesthetic as renderRunCard (scan-lines, pixel-border)
// but no run-specific data — pure brand.
export function renderHomeCard() {
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
        padding: '64px 72px',
        fontFamily: 'JetBrains Mono',
        color: PALETTE.text,
        border: `4px solid ${PALETTE.border}`,
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontSize: 28,
            color: PALETTE.muted,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          ~/typer/index.log
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 96,
            fontWeight: 700,
            color: PALETTE.primaryGlow,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          typer.grimm0.dev
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 36,
            color: PALETTE.textStrong,
            letterSpacing: '-0.01em',
          }}
        >
          a coding typing game built for speed.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 12,
            fontSize: 28,
            color: PALETTE.muted,
          }}
        >
          ignore tabs and line breaks. spaces count.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 22,
          color: PALETTE.muted,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        <div style={{ display: 'flex' }}>D · C · B · A · S</div>
        <div style={{ display: 'flex' }}>climb the leaderboard →</div>
      </div>
    </div>
  )
}
