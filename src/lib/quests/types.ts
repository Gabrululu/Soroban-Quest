export type Difficulty = "Introducción" | "Fácil" | "Intermedia" | "Difícil" | "Jefe";

/**
 * How a quest is proven on testnet. Every type except WALLET_CONNECTED and TRANSACTION_EXISTS
 * takes a contract ID that the player's registered account must have deployed.
 * - WALLET_CONNECTED: signed challenge from a funded account.
 * - TRANSACTION_EXISTS: a payment sent from the player's account.
 * - CONTRACT_EXISTS: the contract is live.
 * - CONTRACT_CALL: the player moved tokens into and out of the contract (Horizon balance changes).
 * - ASSET_ISSUED: the ID is the Stellar Asset Contract of an asset the player issued (`asset` rules).
 * - EVENT_EMITTED: the contract emitted the events in `events` (Soroban RPC).
 * - TESTS_PASSED: the server runs the exploit suite against the contract in simulation.
 * - CUSTOM: free-form boss quests, proven by the `events` rules.
 */
export type VerificationType =
  | "WALLET_CONNECTED"
  | "TRANSACTION_EXISTS"
  | "CONTRACT_EXISTS"
  | "CONTRACT_CALL"
  | "ASSET_ISSUED"
  | "EVENT_EMITTED"
  | "TESTS_PASSED"
  | "CUSTOM";

export interface EventRequirement {
  /** Accepted event names (first topic, e.g. "ticket_bought"); omit to accept any event. */
  names?: string[];
  /** Distinct addresses that must appear as the second topic across matching events. */
  minAccounts: number;
  /** Don't count the player's own address (e.g. "bought from another account"). */
  excludePlayer?: boolean;
  /** What the player has to do, shown when the requirement isn't met. */
  label: string;
}

export interface AssetRequirement {
  /** Exact circulating supply, in whole units. */
  supply: number;
  /** Accounts that must hold the asset (the issuer doesn't count). */
  minHolders: number;
}

export type QuestStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export type HintLevel = "Concepto" | "Orientación" | "Pseudocódigo" | "Código";

export interface Hint {
  level: HintLevel;
  title: string;
  body: string;
  code?: string;
}

export interface Objective {
  id: string;
  label: string;
}

export interface BuildStep {
  title: string;
  body?: string;
  command?: string;
  code?: string;
}

export interface Reward {
  xp: number;
  achievement?: { id: string; name: string; icon: string };
  item?: { id: string; name: string; icon: string };
}

export interface Quest {
  id: number;
  slug: string;
  title: string;
  icon: string;
  region: "lumina" | "dungeon" | "boss";
  description: string;
  story: string;
  difficulty: Difficulty;
  estimatedTime: string;
  xp: number;
  prerequisites: string[];
  objectives: Objective[];
  concepts: string[];
  build: BuildStep[];
  hints: Hint[];
  verification: {
    type: VerificationType;
    inputLabel: string;
    placeholder: string;
    helper: string;
    /** EVENT_EMITTED and CUSTOM. */
    events?: EventRequirement[];
    /** ASSET_ISSUED. */
    asset?: AssetRequirement;
  };
  rewards: Reward;
  nextQuest?: string;
  comingSoon?: boolean;
}
