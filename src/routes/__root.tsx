import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { DebugTrigger } from '#/components/dev/debug-trigger'
import { ToastProvider } from '#/components/ui/toast'
import { useGlobalButtonSound } from '#/hooks/useGlobalButtonSound'
import { useApplyImmersionCssVars } from '#/lib/game/immersion-prefs'
import { buildSeoMeta, SITE_NAME } from '#/lib/seo'
import appCss from '../styles.css?url'

const FIRST_PAINT_STYLE = `html{background:#010201;color:#ddffd8;}body[data-shell-state="booting"]{margin:0;visibility:hidden;opacity:0;}body[data-shell-state="ready"]{visibility:visible;opacity:1;transition:opacity 140ms ease-out;}`
const FIRST_PAINT_SCRIPT = `(function(){const root=document.documentElement;const defaults={vignetteDarkness:0.46,vignetteTransitionMs:320,metaOpacityDip:0.28,controlsOpacityDip:0.18,caretGlowCeilingPx:20,snippetSaturationLift:0.29,snapBackBrightness:0.82,snapBackDurationMs:260};const reveal=()=>{const tick=()=>{if(!document.body){window.requestAnimationFrame(tick);return;}document.body.setAttribute('data-shell-state','ready');root.setAttribute('data-shell-state','ready');};window.requestAnimationFrame(tick);};root.setAttribute('data-shell-state','booting');try{const raw=window.localStorage&&window.localStorage.getItem('typer.preferences');if(raw){const parsed=JSON.parse(raw);const immersion=parsed&&typeof parsed==='object'?parsed.immersion:null;if(immersion&&typeof immersion==='object'){root.style.setProperty('--debug-vignette-darkness',String(immersion.vignette===false?0:immersion.vignetteDarkness??defaults.vignetteDarkness));root.style.setProperty('--debug-vignette-transition',String(immersion.vignetteTransitionMs??defaults.vignetteTransitionMs)+'ms');root.style.setProperty('--debug-meta-opacity-dip',String(immersion.chromeDimming===false?0:immersion.metaOpacityDip??defaults.metaOpacityDip));root.style.setProperty('--debug-controls-opacity-dip',String(immersion.chromeDimming===false?0:immersion.controlsOpacityDip??defaults.controlsOpacityDip));root.style.setProperty('--debug-caret-glow-ceiling',String(immersion.caretGlowEscalation===false?0:immersion.caretGlowCeilingPx??defaults.caretGlowCeilingPx)+'px');root.style.setProperty('--debug-snippet-saturation-lift',String(immersion.snippetSaturation===false?0:immersion.snippetSaturationLift??defaults.snippetSaturationLift));root.style.setProperty('--debug-snapback-brightness',String(immersion.snapBack===false?1:immersion.snapBackBrightness??defaults.snapBackBrightness));root.style.setProperty('--debug-snapback-duration',String(immersion.snapBackDurationMs??defaults.snapBackDurationMs)+'ms');}}}catch{}if(document.readyState==='loading'){window.addEventListener('DOMContentLoaded',reveal,{once:true});}else{reveal();}window.addEventListener('pageshow',reveal,{once:true});window.setTimeout(reveal,900);})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#010201' },
      ...buildSeoMeta({
        title: `${SITE_NAME} | Code typing game`,
        description:
          'Practice typing code snippets in a fast browser game with programming languages, scoring, and leaderboards.',
        path: '/',
      }),
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
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useApplyImmersionCssVars()
  useGlobalButtonSound()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{FIRST_PAINT_STYLE}</style>
        <HeadContent />
        <script>{FIRST_PAINT_SCRIPT}</script>
        <noscript>
          <style>{'body{visibility:visible!important;opacity:1!important;}'}</style>
        </noscript>
        <script
          defer
          src="https://umami.grimm0.dev/script.js"
          data-website-id="268f096f-c6fe-4d76-9592-8cf0f35b33b9"
          data-domains="typer.grimm0.dev"
        />
      </head>
      <body
        data-shell-state="booting"
        suppressHydrationWarning
        className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased"
      >
        <ToastProvider>{children}</ToastProvider>
        {import.meta.env.DEV ? <DebugTrigger /> : null}
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
            The path you asked for does not exist in this terminal. Head back and start a run or
            inspect the leaderboard.
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
