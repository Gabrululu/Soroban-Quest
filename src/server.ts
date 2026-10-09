import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type SentryModule = typeof import("@sentry/cloudflare");

// Loaded lazily and only when SENTRY_DSN is set: a static import pulls the SDK into the entry
// chunk, where the bundler emits a circular helper import that crashes the Worker at startup.
let sentryModule: Promise<SentryModule> | undefined;

function reportServerError(error: unknown) {
  void sentryModule?.then((Sentry) => Sentry.captureException(error));
}

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

type WorkerEnv = { SENTRY_DSN?: string };
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
        (e: WorkerEnv) => ({ dsn: e.SENTRY_DSN, tracesSampleRate: 0 }),
        app as unknown as WorkerHandler,
      ) as unknown as typeof app;
      return monitored.fetch(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  },
};
