import { statSync } from 'node:fs'
import { join, normalize } from 'node:path'

import { migrate } from 'drizzle-orm/libsql/migrator'
// @ts-expect-error — generated build output, no .d.ts emitted
import serverEntry from './dist/server/server.js'
import { db } from './src/server/db'

await migrate(db, { migrationsFolder: './drizzle' })

const port = Number(process.env.PORT ?? 3000)
const clientRoot = join(import.meta.dir, 'dist', 'client')
const publicFilePaths = new Set([
  '/favicon.png',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/og.png',
])

function getStaticFilePath(pathname: string) {
  const isAssetPath = pathname.startsWith('/assets/')
  const isKnownPublicFile = publicFilePaths.has(pathname)

  if (!isAssetPath && !isKnownPublicFile) {
    return null
  }

  const safePathname = pathname.replace(/^\/+/, '')
  const normalizedPath = normalize(safePathname)

  if (normalizedPath.startsWith('..')) {
    return null
  }

  const filePath = join(clientRoot, normalizedPath)

  try {
    const stats = statSync(filePath)
    return stats.isFile() ? filePath : null
  } catch {
    return null
  }
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    const staticFilePath = getStaticFilePath(url.pathname)

    if (staticFilePath) {
      return new Response(Bun.file(staticFilePath))
    }

    return serverEntry.fetch(request)
  },
})

console.log(`typer.grimm0.dev listening on http://0.0.0.0:${port}`)
