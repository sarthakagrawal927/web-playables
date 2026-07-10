import type { Migration } from "@games/gamekit";

export const SAVE_VERSION = 2;

export interface ResearchState {
  /** research id in progress, or null */
  current: string | null;
  /** seconds of progress on `current` */
  progress: number;
  /** completed research ids — knowledge survives crashes */
  done: string[];
}

export interface BoostState {
  /** ad-campaign revenue multiplier (1 = none) and its remaining seconds */
  adMult: number;
  adRemaining: number;
  /** seconds until the next campaign can launch */
  adCooldown: number;
  /** remaining seconds of click frenzy from a lucky event */
  frenzyRemaining: number;
}

export interface GameState {
  cash: number;
  /** Gross revenue earned this run (a crash resets it); drives raises and unlocks. */
  totalEarned: number;
  clicks: number;
  /** generator id -> units hired */
  generators: Record<string, number>;
  /** purchased upgrade ids */
  upgrades: string[];
  /** investor points (permanent reputation; each +2% revenue) */
  investors: number;
  /** funding rounds raised this run; each raises salary expectations */
  rounds: number;
  /** investor points already banked this run (raise gain is incremental) */
  raisedThisRun: number;
  /** lifetime company crashes */
  crashes: number;
  /** lifetime ad campaigns launched */
  campaignsRun: number;
  /** milestone ids already celebrated (lifetime) */
  milestones: string[];
  research: ResearchState;
  boosts: BoostState;
  /** avatar seed of the player's founder character (null until chosen) */
  founder: number | null;
  /** avatar seeds of everyone hired this run, in hire order (display-capped) */
  team: number[];
  /** company age in simulated seconds (30s = 1 month); resets on crash */
  ageSeconds: number;
}

export function initialBoosts(): BoostState {
  return { adMult: 1, adRemaining: 0, adCooldown: 0, frenzyRemaining: 0 };
}

/** Friends-and-family money: enough to feel real, not enough to skip clicking. */
export const STARTING_CASH = 500;

export function initialState(): GameState {
  return {
    cash: STARTING_CASH,
    totalEarned: 0,
    clicks: 0,
    generators: {},
    upgrades: [],
    investors: 0,
    rounds: 0,
    raisedThisRun: 0,
    crashes: 0,
    campaignsRun: 0,
    milestones: [],
    research: { current: null, progress: 0, done: [] },
    boosts: initialBoosts(),
    founder: null,
    team: [],
    ageSeconds: 0,
  };
}

/** migrations[v] upgrades a version-v save to v+1. */
export const migrations: Record<number, Migration> = {
  // v1 → v2: the "build a real company" update — burn/runway, incremental
  // raises, crashes, campaigns, milestones, research, boosts.
  1: (state) => ({
    ...(state as object),
    raisedThisRun: 0,
    crashes: 0,
    campaignsRun: 0,
    milestones: [],
    research: { current: null, progress: 0, done: [] },
    boosts: initialBoosts(),
    founder: null,
    team: [],
    ageSeconds: 0,
  }),
};
