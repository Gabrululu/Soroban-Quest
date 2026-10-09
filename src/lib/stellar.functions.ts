import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { allowVerification, claimOnce, envVar } from "@/lib/server/runtime";
import { verifyMessageSignature } from "@/lib/stellar/signature";
import { isValidStrKey } from "@/lib/stellar/strkey";
import { getQuest } from "@/lib/quests/data";
import type { Quest } from "@/lib/quests/types";
import { HORIZON, NetworkUnavailable } from "@/lib/server/chain";
import { checkContractQuest, checkPayment } from "@/lib/server/quest-checks";
import { progressStore, type LeaderboardEntry } from "@/lib/server/progress-store";

export interface VerifyResult {
  ok: boolean;
  message: string;
  details?: Record<string, string>;
  /** Session token returned by verifyAccount; later verifications require it. */
  token?: string;
  /** Quests this account has completed on the server (returned with the session). */
  completed?: string[];
}

const accountAddress = z
  .string()
  .trim()
  .regex(
    /^G[A-Z2-7]{55}$/,
    "La dirección pública de Stellar debe comenzar con G y tener 56 caracteres.",
  )
  .refine(
    (v) => isValidStrKey("account", v),
    "La dirección tiene un checksum inválido. Revisa que la copiaste completa.",
  );

const CHALLENGE_PREFIX = "soroban-quest:verify";
const CHALLENGE_TTL_MS = 10 * 60_000;

/** HMAC key for challenges and session tokens. Set SOROBAN_QUEST_SECRET in production. */
function serverSecret(): string {
  const secret = envVar("SOROBAN_QUEST_SECRET");
  if (secret) return secret;
  if (import.meta.env.PROD) {
    throw new Error("Falta la variable de entorno SOROBAN_QUEST_SECRET.");
  }
  return "soroban-quest-dev-secret";
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(serverSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...mac))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Session token proving the holder signed a challenge with `address`'s key. */
const sessionToken = (address: string) => hmac(`session:${address}`);

async function hasValidSession(address: string, token: string): Promise<boolean> {
  return (await sessionToken(address)) === token;
}

const RATE_LIMITED_MESSAGE =
  "Demasiadas verificaciones seguidas desde tu conexión. Espera un minuto e inténtalo de nuevo.";

const RATE_LIMITED: VerifyResult = { ok: false, message: RATE_LIMITED_MESSAGE };

const NO_SESSION: VerifyResult = {
  ok: false,
  message: "Tu cuenta no está firmada. Vuelve a «La llegada» y firma el reto con tu billetera.",
};

/**
 * Step 1 of WALLET_CONNECTED: a single-line message the player signs with their wallet or
 * `stellar message sign`. The server MAC lets us accept only challenges we issued, statelessly.
 */
export const createChallenge = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ address: accountAddress }).parse(data))
  .handler(async ({ data }): Promise<{ challenge: string }> => {
    if (!(await allowVerification())) throw new Error(RATE_LIMITED_MESSAGE);
    const issuedAt = new Date().toISOString();
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const body = `${CHALLENGE_PREFIX}:${data.address}:${issuedAt}:${nonce}`;
    return { challenge: `${body}:${await hmac(body)}` };
  });

const accountSchema = z.object({
  address: accountAddress,
  challenge: z.string().trim().max(256),
  signature: z.string().trim().min(1, "Pega la firma del reto.").max(256),
});

/** WALLET_CONNECTED — the player signed our challenge and the account is funded on testnet. */
export const verifyAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => accountSchema.parse(data))
  .handler(async ({ data }): Promise<VerifyResult> => {
    if (!(await allowVerification())) return RATE_LIMITED;
    const parts = data.challenge.split(":");
    const [p1, p2, address, , , , nonce, mac] = parts;
    // ISO timestamps contain ":" too: prefix(2) + address + time(3 parts) + nonce + mac = 8.
    const issuedAt = parts.slice(3, 6).join(":");
    const body = parts.slice(0, 7).join(":");
    if (
      parts.length !== 8 ||
      `${p1}:${p2}` !== CHALLENGE_PREFIX ||
      !nonce ||
      !mac ||
      (await hmac(body)) !== mac
    ) {
      return { ok: false, message: "El reto no es válido. Genera uno nuevo." };
    }
    if (address !== data.address) {
      return { ok: false, message: "El reto se generó para otra cuenta. Genera uno nuevo." };
    }
    const age = Date.now() - Date.parse(issuedAt);
    if (!(age >= 0 && age <= CHALLENGE_TTL_MS)) {
      return { ok: false, message: "El reto expiró. Genera uno nuevo y fírmalo." };
    }
    if (!(await verifyMessageSignature(data.address, data.challenge, data.signature))) {
      return {
        ok: false,
        message: `La firma no corresponde a ${short(data.address)}. Firma el reto con esa misma cuenta.`,
      };
    }

    const res = await fetch(`${HORIZON}/accounts/${data.address}`);
    if (res.status === 404) {
      return {
        ok: false,
        message: "La cuenta aún no existe en la red de pruebas. Usa Friendbot para obtener fondos.",
      };
    }
    if (!res.ok) {
      return { ok: false, message: "Horizon no respondió. Inténtalo de nuevo en un momento." };
    }
    const account = (await res.json()) as {
      balances?: { asset_type: string; balance: string }[];
      sequence?: string;
    };
    const native = account.balances?.find((b) => b.asset_type === "native");
    const balance = Number(native?.balance ?? 0);
    if (balance <= 0) {
      return {
        ok: false,
        message: "Encontramos la cuenta, pero no tiene XLM. Usa Friendbot para obtener fondos.",
      };
    }
    // Single use: a leaked signed challenge can't be replayed to obtain another session.
    if (!(await claimOnce(`challenge:${nonce}`, CHALLENGE_TTL_MS / 1000))) {
      return { ok: false, message: "Este reto ya se usó. Genera uno nuevo y fírmalo." };
    }
    const store = progressStore();
    await store.record(data.address, "arrival", data.address, getQuest("arrival")?.rewards.xp ?? 0);
    return {
      ok: true,
      message: "Firma válida: la cuenta es tuya y tiene fondos en la red de pruebas.",
      details: { Cuenta: short(data.address), Saldo: `${balance.toFixed(2)} XLM` },
      token: await sessionToken(data.address),
      completed: await store.completedSlugs(data.address),
    };
  });

const short = (address: string) => `${address.slice(0, 4)}…${address.slice(-4)}`;

const questSchema = z.object({
  slug: z.string().min(1).max(64),
  proof: z.string().trim().min(1, "Ingresa primero el comprobante.").max(128),
  address: accountAddress,
  token: z.string().min(1),
});

/**
 * Every quest after the arrival: the rules come from the quest data on the server (never from the
 * client) and every proof must belong to the signed-in account.
 */
export const verifyQuest = createServerFn({ method: "POST" })
  .validator((data: unknown) => questSchema.parse(data))
  .handler(async ({ data }): Promise<VerifyResult> => {
    if (!(await allowVerification())) return RATE_LIMITED;
    if (!(await hasValidSession(data.address, data.token))) return NO_SESSION;
    const quest = getQuest(data.slug);
    if (!quest || quest.comingSoon) return { ok: false, message: "Esa misión no existe." };

    // Progress lives on the server: prerequisites are enforced here, not only in the browser.
    const store = progressStore();
    const done = new Set(await store.completedSlugs(data.address));
    const missing = quest.prerequisites.find((p) => !done.has(p));
    if (missing) {
      return {
        ok: false,
        message: `Primero completa la misión «${getQuest(missing)?.title ?? missing}».`,
      };
    }

    const result = await runQuestCheck(quest, data.proof, data.address);
    if (!result.ok) return result;
    const proof =
      quest.verification.type === "TRANSACTION_EXISTS" ? data.proof.toLowerCase() : data.proof;
    const outcome = await store.record(data.address, quest.slug, proof, quest.rewards.xp);
    if (outcome === "proof-used") {
      return {
        ok: false,
        message:
          "Ese comprobante ya completó otra de tus misiones. Cada misión necesita uno propio.",
      };
    }
    return result;
  });

/** Run the on-chain check for `quest`; network outages become a "try again" result. */
async function runQuestCheck(quest: Quest, proof: string, address: string): Promise<VerifyResult> {
  try {
    if (quest.verification.type === "WALLET_CONNECTED") {
      return { ok: false, message: "Esta misión se verifica firmando con tu billetera." };
    }
    if (quest.verification.type === "TRANSACTION_EXISTS") {
      if (!/^[a-fA-F0-9]{64}$/.test(proof)) {
        return {
          ok: false,
          message: "El hash de la transacción debe tener 64 caracteres hexadecimales.",
        };
      }
      return await checkPayment(proof.toLowerCase(), address);
    }
    if (!/^C[A-Z2-7]{55}$/.test(proof) || !isValidStrKey("contract", proof)) {
      return {
        ok: false,
        message: "El ID del contrato debe comenzar con C, tener 56 caracteres y estar completo.",
      };
    }
    return await checkContractQuest(quest, proof, address);
  } catch (error) {
    if (error instanceof NetworkUnavailable) {
      return {
        ok: false,
        message: "La red de pruebas no respondió a tiempo. Inténtalo de nuevo en un momento.",
      };
    }
    throw error;
  }
}

const progressSchema = z.object({ address: accountAddress, token: z.string().min(1) });

/** Quests the signed-in account has completed on the server, to sync another device. */
export const getMyProgress = createServerFn({ method: "POST" })
  .validator((data: unknown) => progressSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; completed: string[] }> => {
    if (!(await hasValidSession(data.address, data.token))) return { ok: false, completed: [] };
    return { ok: true, completed: await progressStore().completedSlugs(data.address) };
  });

/** Leaderboard reads scan the whole table, so each isolate reuses a result for a short while. */
const LEADERBOARD_TTL_MS = 30_000;
let leaderboardCache: { at: number; rows: LeaderboardEntry[] } | undefined;

export const getLeaderboard = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ limit: z.number().int().min(1).max(50) }).parse(data))
  .handler(async ({ data }): Promise<LeaderboardEntry[]> => {
    if (!leaderboardCache || Date.now() - leaderboardCache.at > LEADERBOARD_TTL_MS) {
      leaderboardCache = { at: Date.now(), rows: await progressStore().leaderboard(50) };
    }
    return leaderboardCache.rows.slice(0, data.limit);
  });
