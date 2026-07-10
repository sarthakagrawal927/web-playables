// Pure game math. No DOM, no platform, no timers — everything here is
// deterministic in (state, inputs); dice take an injected roll for tests.

import { formatNumber } from "@games/gamekit";
import {
  CAMPAIGN_COOLDOWN_SECONDS,
  CAMPAIGN_COST_SECONDS,
  CAMPAIGN_MIN_COST,
  DECISIONS,
  type DecisionDef,
  type DecisionEffect,
  type DeptId,
  FINANCE_BURN_DISCOUNT,
  FINANCE_BURN_DISCOUNT_CAP,
  FRENZY_MULT,
  FRENZY_SECONDS,
  GENERATORS,
  type GeneratorDef,
  GTM_CLICK_BONUS,
  generatorById,
  INVESTOR_BONUS,
  LEGAL_SOFTEN,
  LEGAL_SOFTEN_FLOOR,
  MANAGER_SHIPS_PER_SEC,
  MILESTONES,
  type MilestoneDef,
  PEOPLE_DISCOUNT,
  PEOPLE_DISCOUNT_CAP,
  PRESTIGE_UNIT,
  PRODUCT_ENG_BONUS,
  QUARTER_SECONDS,
  QUESTS,
  type QuestDef,
  RESEARCH,
  type ResearchDef,
  researchById,
  rollCampaign,
  rollLuck,
  SEVERANCE_MONTHS_SECONDS,
  SHIP_VALUE,
  TOKENS_PER_COPILOT_PER_SEC,
  traitById,
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

/** Finance hires trim payroll burn, down to −40%. */
export function financeBurnMult(state: GameState): number {
  return (
    1 - Math.min(FINANCE_BURN_DISCOUNT_CAP, FINANCE_BURN_DISCOUNT * deptCount(state, "finance"))
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
    state.boosts.adMult *
    state.boosts.decisionRev
  );
}

/** Licensing revenue from shipped research — an IP-first company is viable. */
export function royaltiesPerSec(state: GameState): number {
  let total = 0;
  for (const id of state.research.done) {
    const def = researchById(id);
    if (def) total += def.royalty;
  }
  return total * prestigeMult(state) * state.boosts.adMult * state.boosts.decisionRev;
}

/** Eng managers auto-ship: automated founder clicks, per second. */
export function managerShipsPerSec(state: GameState): number {
  const managers = owned(state, "eng-manager");
  if (managers === 0) return 0;
  return managers * MANAGER_SHIPS_PER_SEC * shipValue(state);
}

/** Pure flavor: what the AI copilots cost in tokens per day. */
export function tokensPerSec(state: GameState): number {
  return owned(state, "ai-copilot") * TOKENS_PER_COPILOT_PER_SEC;
}

/** Headcount in fractional units: count plus trait output bonuses. */
export function effectiveUnits(state: GameState, generatorId: string): number {
  return owned(state, generatorId) + (state.roleMods[generatorId]?.rate ?? 0);
}

/** Gross revenue per second (team + royalties + managers auto-shipping). */
export function grossPerSec(state: GameState): number {
  let total = royaltiesPerSec(state) + managerShipsPerSec(state);
  for (const def of GENERATORS) {
    if (owned(state, def.id) > 0)
      total += effectiveUnits(state, def.id) * generatorUnitRate(state, def);
  }
  return total;
}

/** Per-round salary jump; lawyers negotiate it down (never below +5%). */
export function roundJump(state: GameState): number {
  return Math.max(LEGAL_SOFTEN_FLOOR, 1.25 - LEGAL_SOFTEN * deptCount(state, "legal"));
}

/** Salary expectations compound with every round raised. */
export function burnMult(state: GameState): number {
  return roundJump(state) ** state.rounds;
}

/** Payroll burn per second, traits included. */
export function burnPerSec(state: GameState): number {
  let total = 0;
  for (const def of GENERATORS) {
    const count = owned(state, def.id);
    if (count > 0) total += (count + (state.roleMods[def.id]?.pay ?? 0)) * def.salary;
  }
  return total * burnMult(state) * financeBurnMult(state) * state.boosts.decisionBurn;
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

/** Value of one shipped feature — managers do the shipping now. */
export function shipValue(state: GameState): number {
  const frenzy = state.boosts.frenzyRemaining > 0 ? FRENZY_MULT : 1;
  return (
    SHIP_VALUE *
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
  /** quest completed this tick (reward already granted), if any */
  quest: QuestDef | null;
  /** the board wants a quarterly decision */
  decisionDue: DecisionDef | null;
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

/** One real second is one company day; 30 days make a month. */
export const MONTH_SECONDS = 30;

/** Format a real-seconds span as company time: "12d", "2mo 4d", "1y 2mo". */
export function gameDays(seconds: number): string {
  const days = Math.ceil(seconds);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) {
    const rest = days % 30;
    return rest > 0 ? `${months}mo ${rest}d` : `${months}mo`;
  }
  const years = Math.floor(months / 12);
  const restMo = months % 12;
  return restMo > 0 ? `${years}y ${restMo}mo` : `${years}y`;
}

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
  if (b.decisionRemaining > 0) {
    b.decisionRemaining = Math.max(0, b.decisionRemaining - dtSeconds);
    if (b.decisionRemaining === 0) {
      b.decisionRev = 1;
      b.decisionBurn = 1;
    }
  }

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

  // quest chain: one active goal at a time; reward lands instantly
  let quest: QuestDef | null = null;
  const active = QUESTS[state.questIndex];
  if (active?.check(state, { gross })) {
    state.cash += active.reward;
    state.totalEarned += active.reward;
    state.questIndex += 1;
    quest = active;
  }

  // quarterly board decision
  let decisionDue: DecisionDef | null = null;
  const quarter = Math.floor(state.ageSeconds / QUARTER_SECONDS);
  if (quarter > state.lastDecisionQuarter) {
    state.lastDecisionQuarter = quarter;
    decisionDue = DECISIONS[(quarter - 1) % DECISIONS.length] ?? null;
  }

  return { crashed, researchDone, milestones, quest, decisionDue };
}

/** Resolve a quarterly decision. Returns a one-line result for the toast. */
export function applyDecision(
  state: GameState,
  decision: DecisionDef,
  optionIndex: number,
  roll: number = Math.random(),
): string {
  const option = decision.options[optionIndex];
  if (!option) return "";
  let effect: DecisionEffect = option.effect;
  let flavor = "";
  if (effect.gamble) {
    const won = roll < effect.gamble.p;
    flavor = won ? "🎲 It paid off! " : "🎲 It backfired. ";
    effect = won ? effect.gamble.win : effect.gamble.lose;
  }
  if (effect.cashDays) {
    const amount = grossPerSec(state) * effect.cashDays;
    state.cash += amount;
    if (amount > 0) state.totalEarned += amount;
    flavor += `${amount >= 0 ? "+" : "−"}$${formatNumber(Math.abs(amount))}. `;
  }
  if (effect.days && (effect.rev || effect.burn)) {
    state.boosts.decisionRev = effect.rev ?? 1;
    state.boosts.decisionBurn = effect.burn ?? 1;
    state.boosts.decisionRemaining = effect.days;
    flavor += `Effects last ${effect.days}d.`;
  }
  return flavor.trim() || "Noted. Back to work.";
}

/** The goal currently on screen, or null when the chain is finished. */
export function currentQuest(state: GameState): QuestDef | null {
  return QUESTS[state.questIndex] ?? null;
}

// ---- transparency: every addition and multiplier, itemized -----------------

export interface BreakdownLine {
  label: string;
  value: string;
}

export interface Breakdown {
  revenue: BreakdownLine[];
  multipliers: BreakdownLine[];
  payroll: BreakdownLine[];
}

export function breakdown(state: GameState): Breakdown {
  const revenue: BreakdownLine[] = [];
  for (const dept of ["eng", "gtm"] as const) {
    let sum = 0;
    for (const def of GENERATORS) {
      if (def.dept !== dept) continue;
      const count = owned(state, def.id);
      if (count > 0) sum += count * generatorUnitRate(state, def);
    }
    if (sum > 0)
      revenue.push({
        label: dept === "eng" ? "Engineering" : "Go-to-market",
        value: `$${formatNumber(sum)}/day`,
      });
  }
  const managers = managerShipsPerSec(state);
  if (managers > 0)
    revenue.push({ label: "Managers shipping", value: `$${formatNumber(managers)}/day` });
  const royal = royaltiesPerSec(state);
  if (royal > 0)
    revenue.push({ label: "Research royalties", value: `$${formatNumber(royal)}/day` });

  const multipliers: BreakdownLine[] = [];
  const em = engMult(state);
  if (em > 1) multipliers.push({ label: `Product team (eng revenue)`, value: `×${em.toFixed(2)}` });
  const gm = gtmClickMult(state);
  if (gm > 1) multipliers.push({ label: "GTM team (per ship)", value: `×${gm.toFixed(2)}` });
  const pm = prestigeMult(state);
  if (pm > 1)
    multipliers.push({ label: `Investors (◆ ${state.investors})`, value: `×${pm.toFixed(2)}` });
  const rm = researchMult(state);
  if (rm > 1) multipliers.push({ label: "Research", value: `×${rm.toFixed(2)}` });
  if (state.boosts.adMult > 1)
    multipliers.push({ label: "Ad campaign (temporary)", value: `×${state.boosts.adMult}` });
  if (state.boosts.frenzyRemaining > 0)
    multipliers.push({ label: "Ship frenzy (temporary)", value: `×${FRENZY_MULT}` });
  for (const id of state.upgrades) {
    const def = upgradeById(id);
    if (def) {
      const target =
        def.target === "all"
          ? "everything"
          : def.target === "click"
            ? "per ship"
            : (generatorById(def.target)?.name ?? def.target);
      multipliers.push({ label: `${def.emoji} ${def.name} (${target})`, value: `×${def.mult}` });
    }
  }
  const hd = hireDiscount(state);
  if (hd < 1)
    multipliers.push({
      label: "People team (hire costs)",
      value: `−${Math.round((1 - hd) * 100)}%`,
    });

  const payroll: BreakdownLine[] = [];
  let base = 0;
  for (const def of GENERATORS) base += owned(state, def.id) * def.salary;
  if (base > 0) payroll.push({ label: "Base payroll", value: `$${formatNumber(base)}/day` });
  const bm = burnMult(state);
  if (bm > 1)
    payroll.push({ label: `Round expectations (${state.rounds})`, value: `×${bm.toFixed(2)}` });
  const fm = financeBurnMult(state);
  if (fm < 1) payroll.push({ label: "Finance team", value: `−${Math.round((1 - fm) * 100)}%` });
  const rj = roundJump(state);
  if (rj < 1.25)
    payroll.push({
      label: "Legal (round jump softened)",
      value: `+${Math.round((rj - 1) * 100)}%/round`,
    });

  return { revenue, multipliers, payroll };
}

// ---- hiring & upgrades ------------------------------------------------------

export function generatorCost(def: GeneratorDef, ownedCount: number): number {
  return def.baseCost * def.costGrowth ** ownedCount;
}

/** What the next unit actually costs, with the People discount applied. */
export function hireCost(state: GameState, def: GeneratorDef): number {
  return generatorCost(def, owned(state, def.id)) * hireDiscount(state);
}

/** True when a role is at its hard cap (C-suite is a party of one). */
export function roleFull(state: GameState, def: GeneratorDef): boolean {
  return def.max !== undefined && owned(state, def.id) >= def.max;
}

export function buyGenerator(state: GameState, generatorId: string): boolean {
  const def = generatorById(generatorId);
  if (!def) return false;
  if (roleFull(state, def)) return false;
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
/** Ownership handed over at every round. */
export const DILUTION_PER_ROUND = 0.15;
/** Company value ≈ a year of revenue × the growth-story multiple. */
export const VALUATION_MULTIPLE = 10;

export function valuation(state: GameState): number {
  return grossPerSec(state) * 365 * VALUATION_MULTIPLE;
}

/** What the founder's stake is worth right now. */
export function founderNetWorth(state: GameState): number {
  return valuation(state) * state.equity;
}

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
  state.equity *= 1 - DILUTION_PER_ROUND;
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
  state.roleMods = {};
  state.ageSeconds = 0;
  state.equity = 1;
  state.research.current = null;
  state.research.progress = 0;
  state.boosts.adMult = 1;
  state.boosts.adRemaining = 0;
  state.boosts.adCooldown = 0;
  state.boosts.frenzyRemaining = 0;
  state.boosts.decisionRev = 1;
  state.boosts.decisionBurn = 1;
  state.boosts.decisionRemaining = 0;
  state.lastDecisionQuarter = 0;
}

/** Remember a hire's face, name, role, and skills (display-capped). */
export function recordHire(
  state: GameState,
  seed: number,
  name: string,
  roleId: string,
  traitId = "steady",
): void {
  state.team.push({ s: seed, n: name, r: roleId, t: traitId });
  if (state.team.length > 48) state.team.shift();
  const trait = traitById(traitId);
  if (trait && (trait.rateBonus !== 0 || trait.payBonus !== 0)) {
    const mods = state.roleMods[roleId] ?? { rate: 0, pay: 0 };
    mods.rate += trait.rateBonus;
    mods.pay += trait.payBonus;
    state.roleMods[roleId] = mods;
  }
}

/** One month of that person's salary, paid to part ways. */
export function severanceCost(state: GameState, teamIndex: number): number {
  const mate = state.team[teamIndex];
  const def = mate && generatorById(mate.r);
  if (!mate || !def) return 0;
  const trait = traitById(mate.t);
  return def.salary * (1 + (trait?.payBonus ?? 0)) * SEVERANCE_MONTHS_SECONDS * burnMult(state);
}

/** Fire a teammate (severance due). Returns the severance paid, or null. */
export function fireMate(state: GameState, teamIndex: number): number | null {
  const mate = state.team[teamIndex];
  const def = mate && generatorById(mate.r);
  if (!mate || !def || owned(state, mate.r) === 0) return null;
  const cost = severanceCost(state, teamIndex);
  if (state.cash < cost) return null;
  state.cash -= cost;
  state.generators[mate.r] = owned(state, mate.r) - 1;
  const trait = traitById(mate.t);
  if (trait) {
    const mods = state.roleMods[mate.r] ?? { rate: 0, pay: 0 };
    mods.rate -= trait.rateBonus;
    mods.pay -= trait.payBonus;
    state.roleMods[mate.r] = mods;
  }
  state.team.splice(teamIndex, 1);
  return cost;
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
