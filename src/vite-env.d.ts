/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Real installed zx-kit version, injected by vite.config.ts. */
  readonly VITE_ZX_KIT_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
