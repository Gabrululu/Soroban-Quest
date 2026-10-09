-- Server-verified quest completions: the source of truth for XP and the public leaderboard.
-- One row per (account, quest); a proof can complete only one quest per account.
CREATE TABLE IF NOT EXISTS completions (
  address TEXT NOT NULL,
  slug TEXT NOT NULL,
  proof TEXT NOT NULL,
  xp INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  PRIMARY KEY (address, slug),
  UNIQUE (address, proof)
);

CREATE INDEX IF NOT EXISTS completions_completed_at ON completions (completed_at);
