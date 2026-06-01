import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

// The REAL zx-kit version actually installed (and therefore bundled) — read from
// node_modules at build time, injected so the game can show it (e.g. to confirm
// GitHub Pages is running the new version). Not just what package.json asks for.
const zxKitVersion = (JSON.parse(readFileSync('./node_modules/zx-kit/package.json', 'utf-8')) as { version: string }).version

export default defineConfig({
  base: './',
  define: {
    'import.meta.env.VITE_ZX_KIT_VERSION': JSON.stringify(zxKitVersion),
  },
  build: {
    target: 'es2023',
    outDir: 'dist',
  },
})
