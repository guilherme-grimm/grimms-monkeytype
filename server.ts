import { existsSync } from 'node:fs'
import { join, normalize } from 'node:path'

import serverEntry from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)
const clientRoot = join(import.meta.dir, 'dist', 'client')

function getStaticFilePath(pathname: string) {
  const safePathname = pathname === '/' ? '' : pathname.replace(/^\/+/, '')
  const normalizedPath = normalize(safePathname)

  if (normalizedPath.startsWith('..')) {
    return null
  }

  const filePath = join(clientRoot, normalizedPath)
  return existsSync(filePath) ? filePath : null
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
