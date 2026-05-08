import { createFileRoute } from '@tanstack/react-router'

import { generateOgPng } from '#/server/og/generate'

// 1×1 transparent PNG used as the 404 body so og:image still resolves to a
// valid image when the underlying score id is unknown.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

export const Route = createFileRoute('/api/og/$id')({
  server: {
    handlers: {
      GET: async ({ params }: { params: { id: string } }) => {
        const id = params.id.replace(/\.png$/, '')

        try {
          const png = await generateOgPng(id)
          if (!png) {
            return new Response(new Uint8Array(TRANSPARENT_PNG), {
              status: 404,
              headers: { 'Content-Type': 'image/png' },
            })
          }
          return new Response(new Uint8Array(png), {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          })
        } catch (err) {
          console.error('[og] render failed', { id, err })
          return new Response(new Uint8Array(TRANSPARENT_PNG), {
            status: 500,
            headers: { 'Content-Type': 'image/png' },
          })
        }
      },
    },
  },
})
