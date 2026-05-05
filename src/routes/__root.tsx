import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'typer.grimm0.dev',
      },
      {
        name: 'description',
        content:
          'A coding typing game built for speed. Ignore tabs and line breaks. Spaces count.',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon.png',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          defer
          src="https://umami.grimm0.dev/script.js"
          data-website-id="268f096f-c6fe-4d76-9592-8cf0f35b33b9"
          data-domains="typer.grimm0.dev"
        />
      </head>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
