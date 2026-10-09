import { getRequestHeader } from "@tanstack/react-start/server";

/** Minimal shapes of the Cloudflare bindings declared in wrangler.jsonc. */
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta: { changes: number } }>;
}

interface D1Database {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<{ meta: { changes: number } }[]>;
}

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface CloudflareEnv {
  SOROBAN_QUEST_SECRET?: string;
  SENTRY_DSN?: string;
  QUEST_DB?: D1Database;
  VERIFY_LIMITER?: RateLimiter;
}

/** Nitro's cloudflare-module entry stores the Worker `env` here on every request; absent in dev. */
function cloudflareEnv(): CloudflareEnv {
  return (globalThis as { __env__?: CloudflareEnv }).__env__ ?? {};
}

/** Secrets and vars: Worker bindings in production, process.env in local dev. */
export function envVar(name: "SOROBAN_QUEST_SECRET" | "SENTRY_DSN"): string | undefined {
  return cloudflareEnv()[name] ?? process.env[name];
}

// ---------------------------------------------------------------------------
// Single-use keys (wallet challenges), backed by D1
// ---------------------------------------------------------------------------

const memoryClaims = new Map<string, number>(); // key -> expiry (ms); one process in dev

/**
 * Mark `key` as used; returns false if it was already used. In production this is one INSERT on
 * a primary key in D1, which is strongly consistent, so two concurrent claims can never both win.
 */
export async function claimOnce(key: string, ttlSeconds: number): Promise<boolean> {
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;
  const db = cloudflareEnv().QUEST_DB;

  if (!db) {
    if (import.meta.env.PROD) {
      throw new Error("Falta el binding de D1 QUEST_DB (revisa wrangler.jsonc).");
    }
    for (const [k, exp] of memoryClaims) if (exp < now) memoryClaims.delete(k);
    if (memoryClaims.has(key)) return false;
    memoryClaims.set(key, expiresAt);
    return true;
  }

  const [, insert] = await db.batch([
    db.prepare("DELETE FROM used_challenges WHERE expires_at < ?1").bind(now),
    db
      .prepare(
        "INSERT INTO used_challenges (nonce, expires_at) VALUES (?1, ?2) ON CONFLICT(nonce) DO NOTHING",
      )
      .bind(key, expiresAt),
  ]);
  return insert?.meta.changes === 1;
}

// ---------------------------------------------------------------------------
// Rate limiting (per client IP)
// ---------------------------------------------------------------------------

const DEV_LIMIT = { limit: 20, periodMs: 60_000 };
const memoryHits = new Map<string, number[]>();

const devLimiter: RateLimiter = {
  async limit({ key }) {
    const now = Date.now();
    const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < DEV_LIMIT.periodMs);
    hits.push(now);
    memoryHits.set(key, hits);
    return { success: hits.length <= DEV_LIMIT.limit };
  },
};

function clientIp(): string {
  return (
    getRequestHeader("cf-connecting-ip") ??
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

/** True when this client may run another verification right now. */
export async function allowVerification(): Promise<boolean> {
  const limiter = cloudflareEnv().VERIFY_LIMITER ?? devLimiter;
  const { success } = await limiter.limit({ key: `verify:${clientIp()}` });
  return success;
}
