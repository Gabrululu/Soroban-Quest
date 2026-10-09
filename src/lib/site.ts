/** Public origin of the deployed site (e.g. https://sorobanquest.xyz), set at build time. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/+$/, "");

export const SITE_NAME = "Soroban Quest";
export const SITE_DESCRIPTION =
  "Aprende Stellar y Soroban construyendo: misiones reales en la red de pruebas, verificadas en cadena.";

/** Social crawlers need absolute URLs; falls back to a root-relative path when SITE_URL is unset. */
export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
