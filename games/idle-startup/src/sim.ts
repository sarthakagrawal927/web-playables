// Pure game math. No DOM, no platform, no timers — everything here is
// deterministic in (state, inputs) and covered by vitest.
import {
  CLICK_BASE,
  GENERATORS,
  type GeneratorDef,
  generatorById,
  INVESTOR_BONUS,
  PRESTIGE_UNIT,
  UPGRADES,
  type UpgradeDef,
  upgradeById,
} from "./content";
import type { GameState } from "./state";

export function owned(state: GameState, generatorId: string): number {
  return state.generators[generatorId] ?? 0;
}

export function generatorCost(def: GeneratorDef, ownedCount: number): number {
  return def.baseCost * def.costGrowth ** ownedCount;
}

export function prestigeMult(state: GameState): number {
  return 1 + INVESTOR_BONUS * state.investors;
}

function upgradeMult(state: GameState, target: string): number {
  let mult = 1;
  for (const id of state.upgrades) {
    const def = upgradeById(id);
    if (def && (def.target === target || def.target === "all")) mult *= def.mult;
  }
  return mult;
}

/** Revenue per second for one unit of a generator, all multipliers applied. */
export function generatorUnitRate(state: GameState, def: GeneratorDef): number {
  return def.baseRate * upgradeMult(state, def.id) * prestigeMult(state);
}

export function productionPerSec(state: GameState): number {
  let total = 0;
  for (const def of GENERATORS) {
    const count = owned(state, def.id);
    if (count > 0) total += count * generatorUnitRate(state, def);
  }
  return total;
}

export function clickPower(state: GameState): number {
  return CLICK_BASE * upgradeMult(state, "click") * prestigeMult(state);
}

function earn(state: GameState, amount: number): void {
  state.cash += amount;
  state.totalEarned += amount;
}

export function tick(state: GameState, dtSeconds: number): void {
  earn(state, productionPerSec(state) * dtSeconds);
}

/** The click action. Returns the amount earned (for UI particles). */
export function shipClick(state: GameState): number {
  const amount = clickPower(state);
  earn(state, amount);
  state.clicks += 1;
  return amount;
}

export function buyGenerator(state: GameState, generatorId: string): boolean {
  const def = generatorById(generatorId);
  if (!def) return false;
  const cost = generatorCost(def, owned(state, generatorId));
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.generators[generatorId] = owned(state, generatorId) + 1;
  return true;
}

export function upgradeUnlocked(state: GameState, def: UpgradeDef): boolean {
  const { generator, count, totalEarned } = def.unlock;
  if (generator !== undefined && owned(state, generator) < (count ?? 1)) return false;
  if (totalEarned !== undefined && state.totalEarned < totalEarned) return false;
  return true;
}

/** Upgrades the player can see in the shop right now. */
export function availableUpgrades(state: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => !state.upgrades.includes(u.id) && upgradeUnlocked(state, u));
}

export function buyUpgrade(state: GameState, upgradeId: string): boolean {
  const def = upgradeById(upgradeId);
  if (!def || state.upgrades.includes(upgradeId)) return false;
  if (!upgradeUnlocked(state, def) || state.cash < def.cost) return false;
  state.cash -= def.cost;
  state.upgrades.push(upgradeId);
  return true;
}

/** A generator shows in the team list once it's plausibly next. */
export function generatorVisible(state: GameState, index: number): boolean {
  const def = GENERATORS[index];
  if (!def) return false;
  if (index === 0 || owned(state, def.id) > 0) return true;
  const prev = GENERATORS[index - 1];
  if (prev && owned(state, prev.id) > 0) return true;
  return state.totalEarned >= def.baseCost * 0.4;
}

export function prestigeGain(state: GameState): number {
  return Math.floor(Math.sqrt(state.totalEarned / PRESTIGE_UNIT));
}

/** Cash this run still needed before the next investor point is available. */
export function earningsToNextInvestor(state: GameState): number {
  const nextGain = prestigeGain(state) + 1;
  return nextGain ** 2 * PRESTIGE_UNIT - state.totalEarned;
}

/** Raise a funding round: reset the run, keep investors. */
export function doPrestige(state: GameState): boolean {
  const gain = prestigeGain(state);
  if (gain < 1) return false;
  state.investors += gain;
  state.rounds += 1;
  state.cash = 0;
  state.totalEarned = 0;
  state.generators = {};
  state.upgrades = [];
  return true;
}

/** Grant capped offline production. Returns the amount earned. */
export function applyOffline(state: GameState, seconds: number): number {
  const amount = productionPerSec(state) * seconds;
  earn(state, amount);
  return amount;
}
