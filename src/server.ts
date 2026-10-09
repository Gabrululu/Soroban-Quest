import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type SentryModule = typeof import("@sentry/cloudflare");

// Loaded lazily and only when SENTRY_DSN is set: a static import pulls the SDK into the entry
// chunk, where the bundler emits a circular helper import that crashes the Worker at startup.
let sentryModule: Promise<SentryModule> | undefined;

/**
 * Bad input, not bugs: malformed server-function payloads, unknown function IDs (scanners) and
 * failed input validation. They still return 500, but reporting them would only burn quota.
 */
function isClientInputError(error: unknown): boolean {
  for (let e = error, depth = 0; e instanceof Error && depth < 5; e = e.cause, depth++) {
    if (e.name === "ZodError") return true;
    if (/^Seroval Error|^Server function info not found/.test(e.message)) return true;
  }
  return false;
}

function reportServerError(error: unknown) {
  if (isClientInputError(error)) return;
  void sentryModule?.then((Sentry) => Sentry.captureException(error));
}

// Lets the server-function middleware in src/start.ts (also bundled for the browser) report
// errors without importing this server-only module.
(globalThis as { __reportServerError?: typeof reportServerError }).__reportServerError =
  reportServerError;

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";

  const body = contentType.includes("application/json") ? await response.clone().text() : "";
  if (!isH3SwallowedErrorBody(body)) {
    // e.g. src/start.ts error middleware already rendered the error page; report the cause.
    const cause = consumeLastCapturedError();
    if (cause) reportServerError(cause);
    return response;
  }

  const error = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(error);
  reportServerError(error);
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const app = {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      reportServerError(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

type WorkerEnv = { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string };
type WorkerHandler = Parameters<SentryModule["withSentry"]>[1];

let monitored: typeof app | undefined;

export default {
  async fetch(
    request: Request,
    env: WorkerEnv | undefined,
    ctx: { waitUntil?: unknown } | undefined,
  ) {
    // Sentry only in the Worker runtime with a DSN configured; local dev calls the app directly.
    if (env?.SENTRY_DSN && ctx?.waitUntil) {
      const Sentry = await (sentryModule ??= import("@sentry/cloudflare"));
      monitored ??= Sentry.withSentry(
        // No server tracing: it costs Worker CPU and the verifications already sit near the limit.
        (e: WorkerEnv) => ({
          dsn: e.SENTRY_DSN,
          environment: e.SENTRY_ENVIRONMENT ?? "production",
          tracesSampleRate: 0,
        }),
        app as unknown as WorkerHandler,
      ) as unknown as typeof app;
      return monitored.fetch(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  },
};
