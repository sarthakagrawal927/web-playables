import type { Migration } from "@games/gamekit";

export const SAVE_VERSION = 1;

export interface GameState {
  cash: number;
  /** Earned this run (resets on prestige); drives prestige gain and unlocks. */
  totalEarned: number;
  clicks: number;
  /** generator id -> units owned */
  generators: Record<string, number>;
  /** purchased upgrade ids */
  upgrades: string[];
  /** investor points from funding rounds; each is +2% revenue, forever */
  investors: number;
  /** funding rounds raised */
  rounds: number;
}

export function initialState(): GameState {
  return {
    cash: 0,
    totalEarned: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    investors: 0,
    rounds: 0,
  };
}

/** migrations[v] upgrades a version-v save to v+1. Empty at v1 by definition. */
export const migrations: Record<number, Migration> = {};
