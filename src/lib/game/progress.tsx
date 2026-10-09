import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QUESTS, getQuest } from "@/lib/quests/data";
import type { Quest, QuestStatus } from "@/lib/quests/types";
import { useServerFn } from "@tanstack/react-start";
import { getMyProgress } from "@/lib/stellar.functions";
import { levelProgress } from "./levels";

const STORAGE_KEY = "soroban-quest:progress:v1";

export interface QuestProgress {
  status: "IN_PROGRESS" | "COMPLETED";
  hintsUsed: number;
  proof?: string;
  completedAt?: string;
}

export interface ProgressState {
  username: string;
  xp: number;
  address?: string;
  /** Server-issued proof that the player signed a challenge with `address`. */
  addressToken?: string;
  streak: number;
  lastActiveDay?: string;
  quests: Record<string, QuestProgress>;
  achievements: { id: string; name: string; icon: string; at: string }[];
  items: { id: string; name: string; icon: string }[];
  transactionsVerified: number;
  contractsDeployed: number;
}

const INITIAL: ProgressState = {
  username: "Visitante",
  xp: 0,
  streak: 1,
  quests: {},
  achievements: [],
  items: [],
  transactionsVerified: 0,
  contractsDeployed: 0,
};

export interface CompletionSummary {
  quest: Quest;
  xp: number;
  item: { id: string; name: string; icon: string } | undefined;
  achievement: { id: string; name: string; icon: string } | undefined;
  next: Quest | undefined;
  stars: number;
  hintsUsed: number;
}

interface ProgressContextValue {
  state: ProgressState;
  level: ReturnType<typeof levelProgress>;
  statusOf: (slug: string) => QuestStatus;
  hintsUsed: (slug: string) => number;
  revealHint: (slug: string, index: number) => void;
  setUsername: (name: string) => void;
  setAddress: (address: string, token: string) => void;
  completeQuest: (slug: string, proof: string) => CompletionSummary | null;
  /** Apply quests the server says this account already completed (another device, etc.). */
  syncCompleted: (slugs: string[]) => void;
  /** Quest (other than `exceptSlug`) already completed with this proof, if any. */
  proofUsedBy: (proof: string, exceptSlug?: string) => Quest | undefined;
  currentQuest: Quest | undefined;
  completedCount: number;
  reset: () => void;
  hydrated: boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

/** Mark `quest` completed in `prev`, granting its XP, item and achievement once. */
function applyCompletion(
  prev: ProgressState,
  quest: Quest,
  entry: { proof?: string; completedAt: string },
): ProgressState {
  if (prev.quests[quest.slug]?.status === "COMPLETED") return prev;
  const { achievement, item } = quest.rewards;
  const type = quest.verification.type;
  return {
    ...prev,
    xp: prev.xp + quest.rewards.xp,
    transactionsVerified: prev.transactionsVerified + (type === "TRANSACTION_EXISTS" ? 1 : 0),
    contractsDeployed:
      prev.contractsDeployed +
      (type !== "TRANSACTION_EXISTS" && type !== "WALLET_CONNECTED" ? 1 : 0),
    quests: {
      ...prev.quests,
      [quest.slug]: {
        status: "COMPLETED",
        hintsUsed: prev.quests[quest.slug]?.hintsUsed ?? 0,
        ...(entry.proof !== undefined && { proof: entry.proof }),
        completedAt: entry.completedAt,
      },
    },
    achievements:
      achievement && !prev.achievements.some((a) => a.id === achievement.id)
        ? [...prev.achievements, { ...achievement, at: entry.completedAt }]
        : prev.achievements,
    items: item && !prev.items.some((i) => i.id === item.id) ? [...prev.items, item] : prev.items,
  };
}

function loadState(): ProgressState {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    return { ...INITIAL, ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return INITIAL;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    // streak bookkeeping
    const day = today();
    if (loaded.lastActiveDay && loaded.lastActiveDay !== day) {
      const diff =
        (new Date(day).getTime() - new Date(loaded.lastActiveDay).getTime()) / 86_400_000;
      loaded.streak = diff === 1 ? loaded.streak + 1 : 1;
    }
    loaded.lastActiveDay = day;
    // localStorage only exists in the browser, so saved progress can only be applied after
    // hydration; this one-time sync on mount is intentional.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState(loaded);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const statusOf = useCallback(
    (slug: string): QuestStatus => {
      const quest = getQuest(slug);
      if (!quest) return "LOCKED";
      const entry = state.quests[slug];
      if (entry?.status === "COMPLETED") return "COMPLETED";
      const unlocked = quest.prerequisites.every((p) => state.quests[p]?.status === "COMPLETED");
      if (!unlocked) return "LOCKED";
      return entry?.status === "IN_PROGRESS" ? "IN_PROGRESS" : "AVAILABLE";
    },
    [state.quests],
  );

  const revealHint = useCallback((slug: string, index: number) => {
    setState((prev) => {
      const entry = prev.quests[slug] ?? { status: "IN_PROGRESS" as const, hintsUsed: 0 };
      if (entry.hintsUsed >= index + 1) return prev;
      return {
        ...prev,
        quests: { ...prev.quests, [slug]: { ...entry, hintsUsed: index + 1 } },
      };
    });
  }, []);

  // Mirror of the latest state so completeQuest can build its summary synchronously:
  // a setState updater is not guaranteed to run before setState returns.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const proofUsedBy = useCallback(
    (proof: string, exceptSlug?: string): Quest | undefined => {
      const needle = proof.trim().toLowerCase();
      const slug = Object.keys(state.quests).find(
        (s) => s !== exceptSlug && state.quests[s]?.proof?.trim().toLowerCase() === needle,
      );
      return slug ? getQuest(slug) : undefined;
    },
    [state.quests],
  );

  const completeQuest = useCallback((slug: string, proof: string): CompletionSummary | null => {
    const quest = getQuest(slug);
    const current = stateRef.current;
    if (!quest || current.quests[slug]?.status === "COMPLETED") return null; // no double XP

    const hints = current.quests[slug]?.hintsUsed ?? 0;
    const { achievement, item } = quest.rewards;
    setState((prev) =>
      applyCompletion(prev, quest, { proof, completedAt: new Date().toISOString() }),
    );

    return {
      quest,
      xp: quest.rewards.xp,
      item,
      achievement,
      next: quest.nextQuest ? getQuest(quest.nextQuest) : undefined,
      stars: Math.max(1, 5 - hints),
      hintsUsed: hints,
    };
  }, []);

  const syncCompleted = useCallback((slugs: string[]) => {
    const completedAt = new Date().toISOString();
    setState((prev) =>
      slugs.reduce((next, slug) => {
        const quest = getQuest(slug);
        return quest ? applyCompletion(next, quest, { completedAt }) : next;
      }, prev),
    );
  }, []);

  // The server is the source of truth: pull this account's completions once per session, so
  // progress follows the account across devices. A rejected token means the player must sign again.
  const fetchProgress = useServerFn(getMyProgress);
  const { address, addressToken } = state;
  useEffect(() => {
    if (!hydrated || !address || !addressToken) return;
    let cancelled = false;
    fetchProgress({ data: { address, token: addressToken } })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) syncCompleted(res.completed);
        else setState(({ addressToken: _expired, ...rest }) => rest);
      })
      .catch(() => {}); // offline: keep local progress
    return () => {
      cancelled = true;
    };
  }, [hydrated, address, addressToken, fetchProgress, syncCompleted]);

  const value = useMemo<ProgressContextValue>(() => {
    const completedCount = Object.values(state.quests).filter(
      (q) => q.status === "COMPLETED",
    ).length;
    const currentQuest =
      QUESTS.find((q) => !q.comingSoon && state.quests[q.slug]?.status === "IN_PROGRESS") ??
      QUESTS.find(
        (q) =>
          !q.comingSoon &&
          state.quests[q.slug]?.status !== "COMPLETED" &&
          q.prerequisites.every((p) => state.quests[p]?.status === "COMPLETED"),
      );

    return {
      state,
      level: levelProgress(state.xp),
      statusOf,
      hintsUsed: (slug: string) => state.quests[slug]?.hintsUsed ?? 0,
      revealHint,
      setUsername: (name: string) => setState((p) => ({ ...p, username: name })),
      setAddress: (address: string, addressToken: string) =>
        setState((p) => ({ ...p, address, addressToken })),
      completeQuest,
      syncCompleted,
      proofUsedBy,
      currentQuest,
      completedCount,
      reset: () => setState({ ...INITIAL, lastActiveDay: today() }),
      hydrated,
    };
  }, [state, statusOf, revealHint, completeQuest, syncCompleted, proofUsedBy, hydrated]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
