import { QUESTS } from "@/lib/quests/data";
import { questDatabase, type D1Database } from "./runtime";

/** Quest slugs that count as bosses on the leaderboard. */
const BOSS_SLUGS = QUESTS.filter((q) => q.region === "boss").map((q) => q.slug);

export interface LeaderboardEntry {
  address: string;
  xp: number;
  quests: number;
  bosses: number;
}

export type RecordOutcome = "recorded" | "already-completed" | "proof-used";

interface ProgressStore {
  completedSlugs(address: string): Promise<string[]>;
  record(address: string, slug: string, proof: string, xp: number): Promise<RecordOutcome>;
  leaderboard(limit: number): Promise<LeaderboardEntry[]>;
}

// ---------------------------------------------------------------------------
// D1 (production)
// ---------------------------------------------------------------------------

function d1Store(db: D1Database): ProgressStore {
  return {
    async completedSlugs(address) {
      const { results } = await db
        .prepare("SELECT slug FROM completions WHERE address = ?1")
        .bind(address)
        .all<{ slug: string }>();
      return results.map((r) => r.slug);
    },

    async record(address, slug, proof, xp) {
      // The primary key (address, slug) and UNIQUE (address, proof) make this atomic.
      const { meta } = await db
        .prepare(
          `INSERT INTO completions (address, slug, proof, xp, completed_at)
           VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT DO NOTHING`,
        )
        .bind(address, slug, proof, xp, Date.now())
        .run();
      if (meta.changes === 1) return "recorded";
      const { results } = await db
        .prepare("SELECT slug FROM completions WHERE address = ?1 AND slug = ?2")
        .bind(address, slug)
        .all<{ slug: string }>();
      return results.length ? "already-completed" : "proof-used";
    },

    async leaderboard(limit) {
      const bosses = BOSS_SLUGS.map((_, i) => `?${i + 2}`).join(", ");
      const { results } = await db
        .prepare(
          `SELECT address, SUM(xp) AS xp, COUNT(*) AS quests,
                  SUM(CASE WHEN slug IN (${bosses}) THEN 1 ELSE 0 END) AS bosses,
                  MAX(completed_at) AS last
           FROM completions GROUP BY address
           ORDER BY xp DESC, last ASC LIMIT ?1`,
        )
        .bind(limit, ...BOSS_SLUGS)
        .all<LeaderboardEntry>();
      return results.map(({ address, xp, quests, bosses }) => ({ address, xp, quests, bosses }));
    },
  };
}

// ---------------------------------------------------------------------------
// Memory (local dev without wrangler)
// ---------------------------------------------------------------------------

const memory = new Map<string, Map<string, { proof: string; xp: number; at: number }>>();

const memoryStore: ProgressStore = {
  async completedSlugs(address) {
    return [...(memory.get(address)?.keys() ?? [])];
  },
  async record(address, slug, proof, xp) {
    const rows = memory.get(address) ?? new Map();
    memory.set(address, rows);
    if (rows.has(slug)) return "already-completed";
    if ([...rows.values()].some((r) => r.proof === proof)) return "proof-used";
    rows.set(slug, { proof, xp, at: Date.now() });
    return "recorded";
  },
  async leaderboard(limit) {
    return [...memory.entries()]
      .map(([address, rows]) => ({
        address,
        xp: [...rows.values()].reduce((sum, r) => sum + r.xp, 0),
        quests: rows.size,
        bosses: [...rows.keys()].filter((s) => BOSS_SLUGS.includes(s)).length,
        last: Math.max(...[...rows.values()].map((r) => r.at)),
      }))
      .sort((a, b) => b.xp - a.xp || a.last - b.last)
      .slice(0, limit)
      .map(({ address, xp, quests, bosses }) => ({ address, xp, quests, bosses }));
  },
};

export function progressStore(): ProgressStore {
  const db = questDatabase();
  return db ? d1Store(db) : memoryStore;
}
