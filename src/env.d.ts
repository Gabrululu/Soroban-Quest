/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin of the deployed site, used for absolute social-card URLs. */
  readonly VITE_SITE_URL?: string;
  /** Sentry DSN for browser error reporting (public by design). */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
