type SentryBrowser = typeof import("@sentry/react");

let sentry: Promise<SentryBrowser> | undefined;

/** Start browser error reporting when VITE_SENTRY_DSN is set; a no-op otherwise. */
export function initClientMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (import.meta.env.SSR || !dsn || typeof window === "undefined" || sentry) return;
  sentry = import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        // Text and form fields are masked by default; wallet addresses never leave as text.
        Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ],
      // Sampled to stay inside the free plan: 10 % of page loads traced, and a replay only
      // when a session hits an error.
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
    return Sentry;
  });
}

/** Report an error caught by a boundary (those never reach window.onerror). */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  void sentry?.then((Sentry) => Sentry.captureException(error, { extra: context }));
}
