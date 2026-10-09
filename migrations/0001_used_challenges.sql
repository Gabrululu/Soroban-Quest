-- Wallet challenges already exchanged for a session token. The primary key makes claiming a
-- challenge atomic: D1 serializes writes on a single primary, so a replay can never succeed.
CREATE TABLE IF NOT EXISTS used_challenges (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS used_challenges_expires_at ON used_challenges (expires_at);
