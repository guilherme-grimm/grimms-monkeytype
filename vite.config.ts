import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  // @resvg/resvg-js loads native .node binaries that Vite/rolldown cannot
  // bundle. Keep it external so the server runtime resolves it from
  // node_modules at request time. Satori is left bundled (pure JS + wasm).
  optimizeDeps: {
    exclude: ['@resvg/resvg-js'],
  },
  ssr: {
    external: ['@resvg/resvg-js'],
  },
})

export default config
