export interface GeneratorDef {
  id: string;
  name: string;
  flavor: string;
  emoji: string;
  baseCost: number;
  costGrowth: number;
  /** Revenue per second per unit. */
  baseRate: number;
}

export type UpgradeTarget = "click" | "all" | (string & {});

export interface UpgradeDef {
  id: string;
  name: string;
  flavor: string;
  cost: number;
  target: UpgradeTarget;
  mult: number;
  unlock: { generator?: string; count?: number; totalEarned?: number };
}

export const CLICK_BASE = 1;

/** totalEarned (this run) needed per investor point: gain = floor(sqrt(earned/PRESTIGE_UNIT)). */
export const PRESTIGE_UNIT = 1_000_000;
/** Revenue bonus per investor point. */
export const INVESTOR_BONUS = 0.02;

export const ROUND_NAMES = [
  "Bootstrapped",
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D",
  "Unicorn",
  "Decacorn",
  "IPO",
];

export function roundName(rounds: number): string {
  return ROUND_NAMES[Math.min(rounds, ROUND_NAMES.length - 1)] ?? "IPO";
}

/** The next round the player would raise. */
export function nextRoundName(rounds: number): string {
  return roundName(rounds + 1);
}

export const GENERATORS: GeneratorDef[] = [
  {
    id: "intern",
    name: "Intern",
    flavor: "Ships bugs. Occasionally features.",
    emoji: "🧑‍💻",
    baseCost: 15,
    costGrowth: 1.15,
    baseRate: 0.5,
  },
  {
    id: "junior-dev",
    name: "Junior dev",
    flavor: "Knows one framework. Deeply.",
    emoji: "👩‍💻",
    baseCost: 100,
    costGrowth: 1.15,
    baseRate: 2,
  },
  {
    id: "senior-dev",
    name: "Senior dev",
    flavor: "Deletes more code than they write.",
    emoji: "🧙",
    baseCost: 1_100,
    costGrowth: 1.15,
    baseRate: 12,
  },
  {
    id: "product-manager",
    name: "Product manager",
    flavor: "Turns chaos into roadmap.",
    emoji: "📋",
    baseCost: 12_000,
    costGrowth: 1.15,
    baseRate: 60,
  },
  {
    id: "sales-team",
    name: "Sales team",
    flavor: "Sells the feature you haven't shipped.",
    emoji: "📞",
    baseCost: 130_000,
    costGrowth: 1.15,
    baseRate: 320,
  },
  {
    id: "ai-copilot",
    name: "AI copilot",
    flavor: "Autocompletes the whole sprint.",
    emoji: "🤖",
    baseCost: 1_400_000,
    costGrowth: 1.15,
    baseRate: 1_700,
  },
  {
    id: "growth-team",
    name: "Growth team",
    flavor: "A/B tests the pricing page hourly.",
    emoji: "📈",
    baseCost: 20_000_000,
    costGrowth: 1.15,
    baseRate: 10_000,
  },
  {
    id: "acquisition",
    name: "Competitor acquisition",
    flavor: "If you can't beat them, buy them.",
    emoji: "🏢",
    baseCost: 330_000_000,
    costGrowth: 1.15,
    baseRate: 62_000,
  },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: "coffee-machine",
    name: "Coffee machine",
    flavor: "Interns work at 2× pour-over speed.",
    cost: 400,
    target: "intern",
    mult: 2,
    unlock: { generator: "intern", count: 5 },
  },
  {
    id: "mech-keyboards",
    name: "Mechanical keyboards",
    flavor: "Louder typing, bigger features. 2× per ship.",
    cost: 600,
    target: "click",
    mult: 2,
    unlock: { totalEarned: 200 },
  },
  {
    id: "pair-programming",
    name: "Pair programming",
    flavor: "Junior devs produce 2× (and argue 3×).",
    cost: 2_500,
    target: "junior-dev",
    mult: 2,
    unlock: { generator: "junior-dev", count: 5 },
  },
  {
    id: "ci-pipeline",
    name: "CI pipeline",
    flavor: "Green checks for everyone: +50% all revenue.",
    cost: 10_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 5_000 },
  },
  {
    id: "rubber-ducks",
    name: "Rubber duck fleet",
    flavor: "Senior devs debug 2× faster by explaining to ducks.",
    cost: 30_000,
    target: "senior-dev",
    mult: 2,
    unlock: { generator: "senior-dev", count: 5 },
  },
  {
    id: "dark-mode",
    name: "Dark mode",
    flavor: "The most requested feature. 3× per ship.",
    cost: 50_000,
    target: "click",
    mult: 3,
    unlock: { totalEarned: 25_000 },
  },
  {
    id: "okr-alignment",
    name: "OKR alignment",
    flavor: "PMs somehow 2× everything they touch.",
    cost: 250_000,
    target: "product-manager",
    mult: 2,
    unlock: { generator: "product-manager", count: 5 },
  },
  {
    id: "crm-nobody-updates",
    name: "A CRM nobody updates",
    flavor: "Sales still closes 2× with it open in a tab.",
    cost: 2_600_000,
    target: "sales-team",
    mult: 2,
    unlock: { generator: "sales-team", count: 5 },
  },
  {
    id: "microservices",
    name: "Microservices rewrite",
    flavor: "Nobody knows how it works now. +50% all revenue.",
    cost: 8_000_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 2_000_000 },
  },
  {
    id: "fine-tuning",
    name: "Fine-tuned models",
    flavor: "The copilot learned your codebase. 2× output.",
    cost: 30_000_000,
    target: "ai-copilot",
    mult: 2,
    unlock: { generator: "ai-copilot", count: 5 },
  },
  {
    id: "viral-launch",
    name: "Viral launch video",
    flavor: "Growth team hits the algorithm. 2× growth revenue.",
    cost: 400_000_000,
    target: "growth-team",
    mult: 2,
    unlock: { generator: "growth-team", count: 5 },
  },
  {
    id: "synergy",
    name: "Post-merger synergy",
    flavor: "The acquisitions finally integrate. 2× their revenue.",
    cost: 6_000_000_000,
    target: "acquisition",
    mult: 2,
    unlock: { generator: "acquisition", count: 5 },
  },
];

export function generatorById(id: string): GeneratorDef | undefined {
  return GENERATORS.find((g) => g.id === id);
}

export function upgradeById(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
