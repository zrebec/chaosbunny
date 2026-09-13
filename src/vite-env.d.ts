/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** chaosBunny's own version (package.json), injected by vite.config.ts. */
  readonly VITE_APP_VERSION?: string
  /** Real installed zx-kit version, injected by vite.config.ts. */
  readonly VITE_ZX_KIT_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Vite serves any file as a string with `?raw` — the tests read the docs that way. */
declare module '*?raw' {
  const content: string
  export default content
}
