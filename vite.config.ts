/// <reference types="vitest/config" />
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// M1: injeta a CSP estrita apenas no BUILD de produção (no dev quebraria o HMR/React-refresh,
// que usam scripts inline). frame-ancestors/X-Frame-Options exigem header HTTP (ver nginx/Render).
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; " +
  "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"

function cspMetaOnBuild(): Plugin {
  return {
    name: 'csp-meta-on-build',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '</title>',
        `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), cspMetaOnBuild()],
  build: {
    // Evita o script inline do polyfill de modulepreload (seria bloqueado por script-src 'self').
    modulePreload: { polyfill: false },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
