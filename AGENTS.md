## Architecture rules

- Quests are data, not UI (verification rules included: `verification.events`, `verification.asset`): every quest lives in `src/lib/quests/data.ts` typed by `src/lib/quests/types.ts`, so new quests need no component changes.
- Player progress (XP, levels, items, achievements, hints) lives in the `ProgressProvider` context in `src/lib/game/`, persisted to localStorage — swap this single module for a backend when persistence lands.
- Quest verification runs server-side in `src/lib/stellar.functions.ts` against Horizon and Soroban testnet RPC; never trust a boolean sent from the client. The `arrival` quest proves address ownership with a SEP-53 signed challenge and returns an HMAC session token (each challenge is claimed once in D1); every later proof must carry that token and be tied to the address (payment sent from it, contract deployed by it), and a proof can only complete one quest.
- Use pnpm for every package operation.
- Contract quests are verified by `verifyQuest` → `src/lib/server/quest-checks.ts`, which reads the rules from the quest data on the server. After changing a quest or a check, run `pnpm e2e:testnet` (reference contracts in `contracts/`).
- Presentation uses Stellar semantic tokens in `src/styles.css` and a shared editorial shell; keep page-specific content in routes so the same brand language extends across every screen.
- Server-only code lives in `src/lib/server/` (import-protected from the client). Read Cloudflare bindings and secrets through `src/lib/server/runtime.ts`, which falls back to in-memory/`process.env` in local dev; bindings are declared in `wrangler.jsonc`.
- Keep `@sentry/cloudflare` out of static imports: `src/server.ts` loads it lazily, because a static import makes the bundler emit a circular helper import that crashes the Worker at startup. Verify production changes with `pnpm build` + `pnpm exec wrangler dev`, not only `pnpm dev`.
