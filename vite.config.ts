import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

// Variables the app cannot start without. Without them, src/services/
// supabaseClient.ts throws at load time, and the bundler then drops Supabase
// and everything that depends on it as dead code: the build "passes" but the
// app crashes on startup. Failing the build makes that mistake visible.
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const

// Puts the splash logo into index.html as a data: URL (D-071). The splash
// logo is the first thing painted; as a separate file it had to wait for a free
// connection behind the JavaScript files on HTTP/1.1, which delayed the first
// paint by ~0.4 s on a slow phone network. public/favicon.svg stays the only
// copy of the logo; it is still an <img>, so splash.css does not change.
function inlineSplashLogo(): Plugin {
  return {
    name: 'inline-splash-logo',
    transformIndexHtml(html) {
      const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url))
      const dataUrl = `data:image/svg+xml;base64,${svg.toString('base64')}`
      return html.replace(
        'id="splash-logo" src="/favicon.svg"',
        `id="splash-logo" src="${dataUrl}"`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    // loadEnv reads the .env files for this mode and the process environment
    // (where Netlify puts its settings); '.' is the project root.
    const env = loadEnv(mode, '.', 'VITE_')
    const missing = REQUIRED_ENV.filter((name) => !env[name])
    if (missing.length > 0) {
      throw new Error(
        `Missing ${missing.join(' and ')}. Add ${missing.length > 1 ? 'them' : 'it'} to .env.local (or the ` +
          `hosting environment) before running "vite build".`,
      )
    }
  }

  // "npm run dev:phone" runs Vite in the "phone" mode: it listens on the local
  // network (--host) and serves HTTPS with a self-signed certificate, because
  // phones only allow camera access (card scanning, D-061) over HTTPS. Plain
  // "npm run dev" stays on http://localhost.
  const isPhone = mode === 'phone'

  return {
    plugins: [react(), inlineSplashLogo(), ...(isPhone ? [basicSsl()] : [])],
  }
})
