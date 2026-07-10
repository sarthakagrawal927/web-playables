// Pure game math. No DOM, no platform, no timers — everything here is
// deterministic in (state, inputs); dice take an injected roll for tests.
import {
  CAMPAIGN_COOLDOWN_SECONDS,
  CAMPAIGN_COST_SECONDS,
  CAMPAIGN_MIN_COST,
  CLICK_BASE,
  type DeptId,
  FINANCE_OFFLINE_BONUS_SECONDS,
  FRENZY_MULT,
  FRENZY_SECONDS,
  GENERATORS,
  type GeneratorDef,
  GTM_CLICK_BONUS,
  generatorById,
  INVESTOR_BONUS,
  MILESTONES,
  type MilestoneDef,
  OFFLINE_BASE_CAP_SECONDS,
  OFFLINE_MAX_CAP_SECONDS,
  PEOPLE_DISCOUNT,
  PEOPLE_DISCOUNT_CAP,
  PRESTIGE_UNIT,
  PRODUCT_ENG_BONUS,
  RESEARCH,
  type ResearchDef,
  researchById,
  rollCampaign,
  rollLuck,
  UPGRADES,
  type UpgradeDef,
  upgradeById,
} from "./content";
import { type GameState, STARTING_CASH } from "./state";

export function owned(state: GameState, generatorId: string): number {
  return state.generators[generatorId] ?? 0;
}

export function deptCount(state: GameState, dept: DeptId): number {
  let n = 0;
  for (const def of GENERATORS) if (def.dept === dept) n += owned(state, def.id);
  return n;
}

// ---- archetype powers ----------------------------------------------------

/** Product hires multiply engineering output. */
export function engMult(state: GameState): number {
  return 1 + PRODUCT_ENG_BONUS * deptCount(state, "product");
}

/** GTM hires multiply the ship click. */
export function gtmClickMult(state: GameState): number {
  return 1 + GTM_CLICK_BONUS * deptCount(state, "gtm");
}

/** People hires discount every hire, down to −30%. */
export function hireDiscount(state: GameState): number {
  return 1 - Math.min(PEOPLE_DISCOUNT_CAP, PEOPLE_DISCOUNT * deptCount(state, "people"));
}

/** Finance hires extend the offline-earnings window. */
export function offlineCapSeconds(state: GameState): number {
  return Math.min(
    OFFLINE_MAX_CAP_SECONDS,
    OFFLINE_BASE_CAP_SECONDS + FINANCE_OFFLINE_BONUS_SECONDS * deptCount(state, "finance"),
  );
}

// ---- multipliers ----------------------------------------------------------

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

export function researchMult(state: GameState): number {
  let mult = 1;
  for (const id of state.research.done) {
    const def = researchById(id);
    if (def) mult *= def.mult;
  }
  return mult;
}

/** Revenue per second for one unit, all multipliers applied (incl. ad boost). */
export function generatorUnitRate(state: GameState, def: GeneratorDef): number {
  if (def.baseRate === 0) return 0;
  const deptBonus = def.dept === "eng" ? engMult(state) : 1;
  return (
    def.baseRate *
    upgradeMult(state, def.id) *
    deptBonus *
    prestigeMult(state) *
    researchMult(state) *
    state.boosts.adMult
  );
}

/** Licensing revenue from shipped research — an IP-first company is viable. */
export function royaltiesPerSec(state: GameState): number {
  let total = 0;
  for (const id of state.research.done) {
    const def = researchById(id);
    if (def) total += def.royalty;
  }
  return total * prestigeMult(state) * state.boosts.adMult;
}

/** Gross revenue per second (team production + research royalties). */
export function grossPerSec(state: GameState): number {
  let total = royaltiesPerSec(state);
  for (const def of GENERATORS) {
    const count = owned(state, def.id);
    if (count > 0) total += count * generatorUnitRate(state, def);
  }
  return total;
}

/** Salary expectations grow 25% with every round raised. */
export function burnMult(state: GameState): number {
  return 1.25 ** state.rounds;
}

/** Payroll burn per second. */
export function burnPerSec(state: GameState): number {
  let total = 0;
  for (const def of GENERATORS) {
    const count = owned(state, def.id);
    if (count > 0) total += count * def.salary;
  }
  return total * burnMult(state);
}

export function netPerSec(state: GameState): number {
  return grossPerSec(state) - burnPerSec(state);
}

/** Seconds of cash left at current net burn; Infinity when net >= 0. */
export function runwaySeconds(state: GameState): number {
  const net = netPerSec(state);
  if (net >= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, state.cash / -net);
}

export function clickPower(state: GameState): number {
  const frenzy = state.boosts.frenzyRemaining > 0 ? FRENZY_MULT : 1;
  return (
    CLICK_BASE *
    upgradeMult(state, "click") *
    gtmClickMult(state) *
    prestigeMult(state) *
    researchMult(state) *
    frenzy
  );
}

// ---- the tick --------------------------------------------------------------

export interface TickEvents {
  crashed: boolean;
  researchDone: ResearchDef | null;
  milestones: MilestoneDef[];
}

function checkMilestones(state: GameState, gross: number, net: number): MilestoneDef[] {
  const hit: MilestoneDef[] = [];
  for (const m of MILESTONES) {
    if (state.milestones.includes(m.id)) continue;
    if (m.check(state, { gross, net })) {
      state.milestones.push(m.id);
      hit.push(m);
    }
  }
  return hit;
}

/** 30 real seconds = 1 company month. */
export const MONTH_SECONDS = 30;

export function companyMonths(state: GameState): number {
  return Math.floor(state.ageSeconds / MONTH_SECONDS);
}

/** "Y2 · M3" — company age for the header clock. */
export function companyAgeLabel(state: GameState): string {
  const months = companyMonths(state);
  return `Y${Math.floor(months / 12) + 1} · M${(months % 12) + 1}`;
}

/** Advance the company by dt seconds. Returns the events the UI reacts to. */
export function tick(state: GameState, dtSeconds: number): TickEvents {
  const gross = grossPerSec(state);
  const burn = burnPerSec(state);
  state.cash += (gross - burn) * dtSeconds;
  state.totalEarned += gross * dtSeconds;
  state.ageSeconds += dtSeconds;

  // boost timers
  const b = state.boosts;
  if (b.adRemaining > 0) {
    b.adRemaining = Math.max(0, b.adRemaining - dtSeconds);
    if (b.adRemaining === 0) b.adMult = 1;
  }
  if (b.adCooldown > 0) b.adCooldown = Math.max(0, b.adCooldown - dtSeconds);
  if (b.frenzyRemaining > 0) b.frenzyRemaining = Math.max(0, b.frenzyRemaining - dtSeconds);

  // research progress
  let researchDone: ResearchDef | null = null;
  const r = state.research;
  if (r.current) {
    const def = researchById(r.current);
    if (def) {
      r.progress += dtSeconds;
      if (r.progress >= def.seconds) {
        r.done.push(def.id);
        r.current = null;
        r.progress = 0;
        researchDone = def;
      }
    } else {
      r.current = null;
      r.progress = 0;
    }
  }

  const crashed = state.cash < 0;
  const milestones = checkMilestones(state, gross, netPerSec(state));
  return { crashed, researchDone, milestones };
}

/** The click action. Returns the amount earned (for UI particles). */
export function shipClick(state: GameState): number {
  const amount = clickPower(state);
  state.cash += amount;
  state.totalEarned += amount;
  state.clicks += 1;
  return amount;
}

// ---- hiring & upgrades ------------------------------------------------------

export function generatorCost(def: GeneratorDef, ownedCount: number): number {
  return def.baseCost * def.costGrowth ** ownedCount;
}

/** What the next unit actually costs, with the People discount applied. */
export function hireCost(state: GameState, def: GeneratorDef): number {
  return generatorCost(def, owned(state, def.id)) * hireDiscount(state);
}

export function buyGenerator(state: GameState, generatorId: string): boolean {
  const def = generatorById(generatorId);
  if (!def) return false;
  const cost = hireCost(state, def);
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

/**
 * Every department's entry role is hireable from day one — betting on sales
 * before you can "afford" it is the player's call. Deeper roles appear once
 * the previous role in that department is filled, or earnings get close.
 */
export function generatorVisible(state: GameState, def: GeneratorDef): boolean {
  if (owned(state, def.id) > 0) return true;
  const deptRoles = GENERATORS.filter((g) => g.dept === def.dept);
  const index = deptRoles.findIndex((g) => g.id === def.id);
  if (index === 0) return true;
  const prev = deptRoles[index - 1];
  if (prev && owned(state, prev.id) > 0) return true;
  return state.totalEarned >= def.baseCost * 0.2;
}

// ---- funding rounds & crashes ------------------------------------------------

/** Cash each new investor point injects at a raise. */
export const INJECTION_PER_POINT = 2_500_000;

/** Investor points a raise would bank right now (incremental within the run). */
export function raiseGain(state: GameState): number {
  return Math.max(
    0,
    Math.floor(Math.sqrt(state.totalEarned / PRESTIGE_UNIT)) - state.raisedThisRun,
  );
}

/** Gross earnings still needed before the next investor point. */
export function earningsToNextInvestor(state: GameState): number {
  const nextGain = state.raisedThisRun + raiseGain(state) + 1;
  return nextGain ** 2 * PRESTIGE_UNIT - state.totalEarned;
}

/**
 * Raise a round: bank investor points, take the cash injection, and accept
 * bigger salary expectations. No reset — the treadmill only ends in a crash.
 */
export function raiseRound(state: GameState): number {
  const gain = raiseGain(state);
  if (gain < 1) return 0;
  state.investors += gain;
  state.raisedThisRun += gain;
  state.rounds += 1;
  state.cash += gain * INJECTION_PER_POINT;
  return gain;
}

/**
 * Out of runway: the company dies. Investors (reputation) and completed
 * research (knowledge) survive; everything else resets.
 */
export function doCrash(state: GameState): void {
  state.crashes += 1;
  state.cash = STARTING_CASH;
  state.totalEarned = 0;
  state.generators = {};
  state.upgrades = [];
  state.rounds = 0;
  state.raisedThisRun = 0;
  state.team = [];
  state.ageSeconds = 0;
  state.research.current = null;
  state.research.progress = 0;
  state.boosts.adMult = 1;
  state.boosts.adRemaining = 0;
  state.boosts.adCooldown = 0;
  state.boosts.frenzyRemaining = 0;
}

/** Remember a hire's face (display-capped so saves stay tiny). */
export function recordHire(state: GameState, seed: number): void {
  state.team.push(seed);
  if (state.team.length > 24) state.team.shift();
}

// ---- campaigns, luck, research actions ----------------------------------------

export function campaignCost(state: GameState): number {
  return Math.max(CAMPAIGN_MIN_COST, grossPerSec(state) * CAMPAIGN_COST_SECONDS);
}

export function canLaunchCampaign(state: GameState): boolean {
  return state.boosts.adCooldown === 0 && state.cash >= campaignCost(state);
}

/** Pay for an ad campaign and roll the dice. Returns null if not launchable. */
export function launchCampaign(state: GameState, roll: number) {
  if (!canLaunchCampaign(state)) return null;
  state.cash -= campaignCost(state);
  state.campaignsRun += 1;
  state.boosts.adCooldown = CAMPAIGN_COOLDOWN_SECONDS;
  const outcome = rollCampaign(roll);
  if (outcome.mult > 1) {
    state.boosts.adMult = outcome.mult;
    state.boosts.adRemaining = outcome.seconds;
  }
  return outcome;
}

/** Claim a lucky bubble; roll decides the prize. */
export function claimLuck(state: GameState, roll: number) {
  const outcome = rollLuck(roll);
  if (outcome.type === "cash") {
    const amount = Math.max(
      outcome.minCash ?? 0,
      grossPerSec(state) * (outcome.revenueSeconds ?? 0),
    );
    state.cash += amount;
    state.totalEarned += amount;
    return { ...outcome, amount };
  }
  state.boosts.frenzyRemaining = FRENZY_SECONDS;
  return { ...outcome, amount: 0 };
}

/** The next research available (linear track), or null when done/busy. */
export function nextResearch(state: GameState): ResearchDef | null {
  if (state.research.current) return null;
  return RESEARCH.find((r) => !state.research.done.includes(r.id)) ?? null;
}

export function startResearch(state: GameState): boolean {
  const def = nextResearch(state);
  if (!def || state.cash < def.cost) return false;
  state.cash -= def.cost;
  state.research.current = def.id;
  state.research.progress = 0;
  return true;
}

/** Grant capped offline production (net floored at 0 — payroll pauses too). */
export function applyOffline(state: GameState, seconds: number): number {
  const amount = Math.max(0, netPerSec(state)) * seconds;
  state.cash += amount;
  state.totalEarned += grossPerSec(state) * seconds * (amount > 0 ? 1 : 0);
  return amount;
}
