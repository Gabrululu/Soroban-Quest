export interface LeaderboardRow {
  builder: string;
  xp: number;
  quests: number;
  bosses: number;
}

/**
 * Public ranking. Empty until progress is stored server-side: today XP lives only in each
 * player's browser, so there is nothing trustworthy to rank yet.
 */
export const LEADERBOARD: LeaderboardRow[] = [];
