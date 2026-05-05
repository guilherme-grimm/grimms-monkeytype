import serverEntry from './dist/server/server.js'

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  fetch: serverEntry.fetch,
})

console.log(`typer.grimm0.dev listening on http://0.0.0.0:${port}`)
