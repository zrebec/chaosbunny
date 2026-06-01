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
