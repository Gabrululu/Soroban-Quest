import {
  decodeStrKey,
  deriveAssetContractId,
  deriveContractId,
  encodeStrKey,
} from "@/lib/stellar/strkey";
import { decodeScVal, invokeContractEnvelope, type ScArg } from "@/lib/stellar/xdr";

export const HORIZON = "https://horizon-testnet.stellar.org";
export const SOROBAN_RPC = "https://soroban-testnet.stellar.org";

/** Horizon or Soroban RPC did not answer; callers turn this into a "try again" message. */
export class NetworkUnavailable extends Error {}

async function horizon<T>(pathOrUrl: string): Promise<T | null> {
  const res = await fetch(pathOrUrl.startsWith("http") ? pathOrUrl : `${HORIZON}${pathOrUrl}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new NetworkUnavailable(`Horizon ${res.status}`);
  return (await res.json()) as T;
}

async function rpcCall<T>(method: string, params?: unknown): Promise<T> {
  const res = await fetch(SOROBAN_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new NetworkUnavailable(`Soroban RPC ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message?: string } };
  if (body.error || !body.result) {
    throw new NetworkUnavailable(`Soroban RPC: ${body.error?.message ?? "sin resultado"}`);
  }
  return body.result;
}

// ---------------------------------------------------------------------------
// Contracts and the player's history
// ---------------------------------------------------------------------------

/** base64 XDR LedgerKey of a contract's instance entry (persistent contract data). */
function contractInstanceKey(contractId: string): string {
  const bytes: number[] = [];
  const push32 = (n: number) =>
    bytes.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
  push32(6); // LedgerEntryType.CONTRACT_DATA
  push32(1); // ScAddressType.SC_ADDRESS_TYPE_CONTRACT
  bytes.push(...decodeStrKey("contract", contractId));
  push32(20); // ScValType.SCV_LEDGER_KEY_CONTRACT_INSTANCE
  push32(1); // ContractDataDurability.PERSISTENT
  return btoa(String.fromCharCode(...bytes));
}

export async function contractExists(contractId: string): Promise<boolean> {
  const result = await rpcCall<{ entries?: unknown[] }>("getLedgerEntries", {
    keys: [contractInstanceKey(contractId)],
  });
  return (result.entries?.length ?? 0) > 0;
}

interface HorizonOperation {
  type: string;
  function?: string;
  address?: string;
  salt?: string;
  transaction_successful?: boolean;
  transaction_hash: string;
  created_at: string;
  asset_balance_changes?: { type: string; from?: string; to?: string; amount: string }[] | null;
}

/**
 * Small pages: a 200-operation Horizon page is ~115 KB of JSON, and parsing several of them was the
 * main Worker CPU risk for accounts with long histories. Most lookups stop on the first page.
 */
const HISTORY_PAGE_SIZE = 50;
const MAX_HISTORY_PAGES = 20; // up to 1 000 operations

/** Walk the player's operations, newest first, until `visit` returns true. */
async function scanOperations(
  address: string,
  visit: (op: HorizonOperation) => boolean | Promise<boolean>,
) {
  let url = `/accounts/${address}/operations?order=desc&limit=${HISTORY_PAGE_SIZE}`;
  for (let page = 0; page < MAX_HISTORY_PAGES; page++) {
    const body = await horizon<{
      _embedded?: { records?: HorizonOperation[] };
      _links?: { next?: { href?: string } };
    }>(url);
    const records = body?._embedded?.records ?? [];
    for (const op of records) {
      if (op.transaction_successful !== false && (await visit(op))) return;
    }
    const next = body?._links?.next?.href;
    if (records.length < HISTORY_PAGE_SIZE || !next) return;
    url = next;
  }
}

export interface Deployment {
  createdAt: string;
  /** Known when found through Horizon. */
  hash?: string;
  ledger?: number;
}

const STELLAR_EXPERT = "https://api.stellar.expert/explorer/testnet";

/**
 * stellar.expert indexes every contract's creator: one ~1 KB request instead of walking the
 * player's history. Only ever used to accept; any other answer falls back to Horizon, so an outage
 * or indexing delay there can't reject a legitimate deployment.
 */
async function creatorFromStellarExpert(
  contractId: string,
): Promise<{ creator: string; created: number } | null> {
  try {
    const res = await fetch(`${STELLAR_EXPERT}/contract/${contractId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { creator?: string; created?: number };
    return body.creator && body.created ? { creator: body.creator, created: body.created } : null;
  } catch {
    return null;
  }
}

/**
 * Proof that `address` deployed `contractId`: stellar.expert's index first, then the
 * create-contract operation in the player's Horizon history (deployer + salt derive the ID).
 */
export async function findDeployment(
  address: string,
  contractId: string,
): Promise<Deployment | null> {
  const indexed = await creatorFromStellarExpert(contractId);
  if (indexed?.creator === address) {
    return { createdAt: new Date(indexed.created * 1000).toISOString() };
  }

  let found: Deployment | null = null;
  await scanOperations(address, async (op) => {
    if (
      op.type !== "invoke_host_function" ||
      !op.function?.includes("CreateContract") ||
      op.address !== address ||
      !op.salt ||
      (await deriveContractId(address, op.salt)) !== contractId
    ) {
      return false;
    }
    const tx = await horizon<{ ledger: number }>(`/transactions/${op.transaction_hash}`);
    found = { hash: op.transaction_hash, createdAt: op.created_at, ledger: tx?.ledger ?? 0 };
    return true;
  });
  return found;
}

/** Token movements into / out of `contractId` in operations the player sent (deposit, release…). */
export async function tokenFlows(address: string, contractId: string) {
  const flows = { into: 0, outOf: 0 };
  await scanOperations(address, (op) => {
    for (const change of op.asset_balance_changes ?? []) {
      if (change.type !== "transfer") continue;
      if (change.to === contractId && change.from === address) flows.into++;
      if (change.from === contractId) flows.outOf++;
    }
    return flows.into > 0 && flows.outOf > 0;
  });
  return flows;
}

// ---------------------------------------------------------------------------
// Contract events (Soroban RPC keeps ~7 days)
// ---------------------------------------------------------------------------

export interface ContractEvent {
  /** First topic, e.g. "ticket_bought" for a `TicketBought` #[contractevent]. */
  name: string | undefined;
  /** Second topic when it is an address (the #[topic] field). */
  account: string | undefined;
}

const decodeTopic = (value: string | undefined): unknown =>
  value ? decodeScVal(value) : undefined;

const isStrKey = (v: unknown): v is string => typeof v === "string" && /^[GC][A-Z2-7]{55}$/.test(v);

/** RPC scans at most ~10k ledgers per call, so the retention window takes a dozen pages. */
const MAX_EVENT_PAGES = 15;

/**
 * Ledgers close every ~5-6 s; assuming 4 s overestimates how many closed since the deployment, so
 * the estimated start lands before it and no early event is missed.
 */
const MIN_SECONDS_PER_LEDGER = 4;

export async function contractEvents(
  contractId: string,
  deployment: Deployment,
): Promise<{ events: ContractEvent[]; olderThanRetention: boolean }> {
  const health = await rpcCall<{
    latestLedger: number;
    latestLedgerCloseTime: string;
    oldestLedger: number;
  }>("getHealth");
  const deployedLedger =
    deployment.ledger ??
    health.latestLedger -
      Math.ceil(
        (Number(health.latestLedgerCloseTime) - Date.parse(deployment.createdAt) / 1000) /
          MIN_SECONDS_PER_LEDGER,
      );
  const startLedger = Math.max(deployedLedger, health.oldestLedger);
  const events: ContractEvent[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const result = await rpcCall<{
      events: { topic?: string[]; inSuccessfulContractCall?: boolean }[];
      cursor?: string;
    }>("getEvents", {
      ...(cursor ? {} : { startLedger }),
      filters: [{ type: "contract", contractIds: [contractId] }],
      pagination: cursor ? { cursor, limit: 1000 } : { limit: 1000 },
    });
    for (const e of result.events) {
      if (e.inSuccessfulContractCall === false) continue;
      const name = decodeTopic(e.topic?.[0]);
      const account = decodeTopic(e.topic?.[1]);
      events.push({
        name: typeof name === "string" ? name : undefined,
        account: isStrKey(account) ? account : undefined,
      });
    }
    cursor = result.cursor;
    // Cursors are TOIDs: the ledger sequence lives in the upper 32 bits.
    const scannedTo = cursor ? Number(BigInt(cursor.split("-")[0] ?? "0") >> 32n) : Infinity;
    if (!cursor || scannedTo >= health.latestLedger) break;
  }
  return { events, olderThanRetention: deployedLedger < health.oldestLedger };
}

// ---------------------------------------------------------------------------
// Simulation (free, never submitted)
// ---------------------------------------------------------------------------

/**
 * A fresh, unused account address. Simulations only need an address, not a key pair, and
 * Keypair.random() costs several ms of Worker CPU (pure-JS ed25519 key generation).
 */
export function randomAccountAddress(): string {
  return encodeStrKey("account", crypto.getRandomValues(new Uint8Array(32)));
}

export type SimulationOutcome = { ok: true; value: unknown } | { ok: false; error: string };

/**
 * Simulate `contractId.fn(...args)` as sent by `source`. With authMode "enforce" every
 * require_auth must be satisfied by real signatures — and simulations carry none — so a call that
 * succeeds in enforce mode needed no one's authorization.
 */
export async function simulateCall(
  contractId: string,
  fn: string,
  args: ScArg[],
  options: { source?: string; authMode?: "enforce" | "record" } = {},
): Promise<SimulationOutcome> {
  const transaction = invokeContractEnvelope(
    options.source ?? randomAccountAddress(),
    contractId,
    fn,
    args,
  );
  // Raw RPC call that reads only the error and the return value: decoding the rest of the
  // simulation (events, footprint, state changes) is what made this the most CPU-hungry check.
  const result = await rpcCall<{ error?: string; results?: { xdr?: string }[] }>(
    "simulateTransaction",
    { transaction, authMode: options.authMode ?? "record" },
  );
  if (result.error) return { ok: false, error: result.error };
  const retval = result.results?.[0]?.xdr;
  return { ok: true, value: retval ? decodeScVal(retval) : undefined };
}

// ---------------------------------------------------------------------------
// Classic assets issued by the player
// ---------------------------------------------------------------------------

interface HorizonAsset {
  asset_code: string;
  asset_issuer: string;
  accounts: { authorized: number };
  balances: Record<string, string>;
  claimable_balances_amount?: string;
  liquidity_pools_amount?: string;
  contracts_amount?: string;
}

export interface IssuedAsset {
  code: string;
  supply: number;
  holders: number;
}

/** The asset issued by `issuer` whose Stellar Asset Contract is `contractId`, if any. */
export async function issuedAssetBySac(
  issuer: string,
  contractId: string,
): Promise<IssuedAsset | null> {
  const body = await horizon<{ _embedded?: { records?: HorizonAsset[] } }>(
    `/assets?asset_issuer=${issuer}&limit=200`,
  );
  for (const record of body?._embedded?.records ?? []) {
    const sac = await deriveAssetContractId(record.asset_code, record.asset_issuer);
    if (sac !== contractId) continue;
    const amounts = [
      ...Object.values(record.balances),
      record.claimable_balances_amount,
      record.liquidity_pools_amount,
      record.contracts_amount,
    ];
    const supply = amounts.reduce((sum, v) => sum + Number(v ?? 0), 0);
    return { code: record.asset_code, supply, holders: record.accounts.authorized };
  }
  return null;
}
