import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Anchor to the working directory so this path is identical in dev (vite,
// cwd = project root) and in production (Docker WORKDIR /app, cwd = /app).
// The Dockerfile copies `assets/og-fonts` into /app/assets/og-fonts.
const fontsDir = process.env.OG_FONTS_DIR ?? join(process.cwd(), 'assets/og-fonts')

const regular = readFileSync(join(fontsDir, 'JetBrainsMono-Regular.ttf'))
const bold = readFileSync(join(fontsDir, 'JetBrainsMono-Bold.ttf'))

export const ogFonts = [
  { name: 'JetBrains Mono', data: regular, weight: 400 as const, style: 'normal' as const },
  { name: 'JetBrains Mono', data: bold, weight: 700 as const, style: 'normal' as const },
]
