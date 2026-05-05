import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { ToastProvider } from '#/components/ui/toast'
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
  notFoundComponent: NotFound,
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
        <ToastProvider>
          {children}
        </ToastProvider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <main className="app-shell mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6">
      <section className="panel scan-lines overflow-hidden">
        <div className="terminal-header">
          <div className="terminal-dots text-[var(--color-accent)]">
            <span />
            <span className="text-yellow-400" />
            <span className="text-[var(--color-primary-glow)]" />
          </div>
          <span className="terminal-title">~/typer/not-found.log</span>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6 sm:py-8">
          <p className="eyebrow text-[var(--color-accent-glow)]">404</p>
          <h1 className="text-3xl font-semibold terminal-text sm:text-4xl">route not found</h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
            The path you asked for does not exist in this terminal. Head back and start a run or inspect the leaderboard.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <a className="button-primary no-underline" href="/">
              back home
            </a>
            <a className="button-secondary no-underline" href="/leaderboard">
              leaderboard
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
