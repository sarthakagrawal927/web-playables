export type DeptId = "eng" | "product" | "gtm" | "people" | "finance";

export interface DeptDef {
  id: DeptId;
  name: string;
  /** Medallion + header hue for this department. */
  hue: number;
  /** The department's power, in one line. */
  perk: string;
  /** Compact perk for tight row meta, e.g. "+8% eng". */
  short: string;
}

export interface GeneratorDef {
  id: string;
  dept: DeptId;
  name: string;
  flavor: string;
  emoji: string;
  baseCost: number;
  costGrowth: number;
  /** Revenue per second per unit (0 for hires whose power is indirect). */
  baseRate: number;
  /** Salary burn per second per unit; scales with funding rounds. */
  salary: number;
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

export const CLICK_BASE = 10;

/** totalEarned (this run) needed per investor point: gain = floor(sqrt(earned/PRESTIGE_UNIT)). */
export const PRESTIGE_UNIT = 10_000_000;
/** Revenue bonus per investor point. */
export const INVESTOR_BONUS = 0.02;

/** Each product hire multiplies engineering revenue. */
export const PRODUCT_ENG_BONUS = 0.08;
/** Each go-to-market hire multiplies click ("ship") earnings. */
export const GTM_CLICK_BONUS = 0.12;
/** Each people hire discounts all hiring costs… */
export const PEOPLE_DISCOUNT = 0.015;
/** …down to at most −30%. */
export const PEOPLE_DISCOUNT_CAP = 0.3;
/** Each finance hire extends the offline-earnings window. */
export const FINANCE_OFFLINE_BONUS_SECONDS = 45 * 60;
export const OFFLINE_BASE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_MAX_CAP_SECONDS = 24 * 3600;

export const DEPTS: DeptDef[] = [
  {
    id: "eng",
    name: "Engineering",
    hue: 150,
    perk: "Builds product. Earns revenue.",
    short: "builds",
  },
  {
    id: "product",
    name: "Product",
    hue: 258,
    perk: "+8% engineering revenue per hire",
    short: "+8% eng",
  },
  { id: "gtm", name: "Go-to-market", hue: 38, perk: "+12% per ship per hire", short: "+12% ship" },
  {
    id: "people",
    name: "People",
    hue: 320,
    perk: "−1.5% hire costs per hire",
    short: "−1.5% hires",
  },
  {
    id: "finance",
    name: "Finance",
    hue: 205,
    perk: "+45 min offline earnings per hire",
    short: "+45m offline",
  },
];

export function deptById(id: DeptId): DeptDef {
  return DEPTS.find((d) => d.id === id) ?? (DEPTS[0] as DeptDef);
}

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
  // Engineering — the revenue engine
  {
    id: "intern",
    dept: "eng",
    name: "Intern",
    flavor: "Ships bugs. Occasionally features.",
    emoji: "🧑‍💻",
    baseCost: 150,
    costGrowth: 1.15,
    baseRate: 5,
    salary: 1,
  },
  {
    id: "junior-dev",
    dept: "eng",
    name: "Junior dev",
    flavor: "Knows one framework. Deeply.",
    emoji: "👩‍💻",
    baseCost: 1_000,
    costGrowth: 1.15,
    baseRate: 20,
    salary: 5,
  },
  {
    id: "senior-dev",
    dept: "eng",
    name: "Senior dev",
    flavor: "Deletes more code than they write.",
    emoji: "🧙",
    baseCost: 11_000,
    costGrowth: 1.15,
    baseRate: 120,
    salary: 30,
  },
  {
    id: "staff-engineer",
    dept: "eng",
    name: "Staff engineer",
    flavor: "Writes the doc that ends the argument.",
    emoji: "🏗️",
    baseCost: 140_000,
    costGrowth: 1.15,
    baseRate: 700,
    salary: 180,
  },
  {
    id: "ai-copilot",
    dept: "eng",
    name: "AI copilot",
    flavor: "Autocompletes the whole sprint.",
    emoji: "🤖",
    baseCost: 14_000_000,
    costGrowth: 1.15,
    baseRate: 17_000,
    salary: 4_000,
  },
  {
    id: "acquisition",
    dept: "eng",
    name: "Competitor acquisition",
    flavor: "Their engineers ship for you now.",
    emoji: "🏢",
    baseCost: 3_300_000_000,
    costGrowth: 1.15,
    baseRate: 620_000,
    salary: 150_000,
  },

  // Product — multiplies engineering
  {
    id: "product-manager",
    dept: "product",
    name: "Product manager",
    flavor: "Turns chaos into roadmap.",
    emoji: "📋",
    baseCost: 40_000,
    costGrowth: 1.22,
    baseRate: 0,
    salary: 40,
  },
  {
    id: "designer",
    dept: "product",
    name: "Designer",
    flavor: "Moves it 2px left. Revenue up.",
    emoji: "🎨",
    baseCost: 900_000,
    costGrowth: 1.22,
    baseRate: 0,
    salary: 250,
  },

  // Go-to-market — multiplies the ship click, closes some deals too
  {
    id: "sales-rep",
    dept: "gtm",
    name: "Sales rep",
    flavor: "Sells the feature you haven't shipped.",
    emoji: "📞",
    baseCost: 3_000,
    costGrowth: 1.17,
    baseRate: 60,
    salary: 20,
  },
  {
    id: "growth-hacker",
    dept: "gtm",
    name: "Growth hacker",
    flavor: "A/B tests the pricing page hourly.",
    emoji: "📈",
    baseCost: 2_000_000,
    costGrowth: 1.17,
    baseRate: 2_600,
    salary: 800,
  },
  {
    id: "cmo",
    dept: "gtm",
    name: "CMO",
    flavor: "Makes the launch trend before lunch.",
    emoji: "📣",
    baseCost: 80_000_000,
    costGrowth: 1.17,
    baseRate: 40_000,
    salary: 12_000,
  },

  // People — makes every hire cheaper
  {
    id: "recruiter",
    dept: "people",
    name: "Recruiter",
    flavor: "Knows everyone. Closes anyone.",
    emoji: "🤝",
    baseCost: 150_000,
    costGrowth: 1.3,
    baseRate: 0,
    salary: 120,
  },
  {
    id: "chief-of-staff",
    dept: "people",
    name: "Chief of staff",
    flavor: "The org chart finally makes sense.",
    emoji: "🗂️",
    baseCost: 30_000_000,
    costGrowth: 1.3,
    baseRate: 0,
    salary: 7_000,
  },

  // Finance — the company earns while you sleep
  {
    id: "cfo",
    dept: "finance",
    name: "CFO",
    flavor: "Finds money you didn't know you had.",
    emoji: "🧮",
    baseCost: 2_000_000,
    costGrowth: 1.35,
    baseRate: 0,
    salary: 2_500,
  },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: "coffee-machine",
    name: "Coffee machine",
    flavor: "Interns work at 2× pour-over speed.",
    cost: 4_000,
    target: "intern",
    mult: 2,
    unlock: { generator: "intern", count: 5 },
  },
  {
    id: "mech-keyboards",
    name: "Mechanical keyboards",
    flavor: "Louder typing, bigger features. 2× per ship.",
    cost: 6_000,
    target: "click",
    mult: 2,
    unlock: { totalEarned: 2_000 },
  },
  {
    id: "pair-programming",
    name: "Pair programming",
    flavor: "Junior devs produce 2× (and argue 3×).",
    cost: 25_000,
    target: "junior-dev",
    mult: 2,
    unlock: { generator: "junior-dev", count: 5 },
  },
  {
    id: "ci-pipeline",
    name: "CI pipeline",
    flavor: "Green checks for everyone: +50% all revenue.",
    cost: 100_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 50_000 },
  },
  {
    id: "rubber-ducks",
    name: "Rubber duck fleet",
    flavor: "Senior devs debug 2× faster by explaining to ducks.",
    cost: 300_000,
    target: "senior-dev",
    mult: 2,
    unlock: { generator: "senior-dev", count: 5 },
  },
  {
    id: "dark-mode",
    name: "Dark mode",
    flavor: "The most requested feature. 3× per ship.",
    cost: 500_000,
    target: "click",
    mult: 3,
    unlock: { totalEarned: 250_000 },
  },
  {
    id: "crm-nobody-updates",
    name: "A CRM nobody updates",
    flavor: "Sales still closes 2× with it open in a tab.",
    cost: 600_000,
    target: "sales-rep",
    mult: 2,
    unlock: { generator: "sales-rep", count: 5 },
  },
  {
    id: "okr-alignment",
    name: "OKR alignment",
    flavor: "Everyone rows the same direction: +50% all revenue.",
    cost: 4_000_000,
    target: "all",
    mult: 1.5,
    unlock: { generator: "product-manager", count: 3 },
  },
  {
    id: "design-system",
    name: "Design system",
    flavor: "Staff engineers stop rebuilding buttons. 2× output.",
    cost: 9_000_000,
    target: "staff-engineer",
    mult: 2,
    unlock: { generator: "staff-engineer", count: 5 },
  },
  {
    id: "viral-launch",
    name: "Viral launch video",
    flavor: "Growth hits the algorithm. 2× their revenue.",
    cost: 30_000_000,
    target: "growth-hacker",
    mult: 2,
    unlock: { generator: "growth-hacker", count: 5 },
  },
  {
    id: "microservices",
    name: "Microservices rewrite",
    flavor: "Nobody knows how it works now. +50% all revenue.",
    cost: 80_000_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 20_000_000 },
  },
  {
    id: "fine-tuning",
    name: "Fine-tuned models",
    flavor: "The copilot learned your codebase. 2× output.",
    cost: 300_000_000,
    target: "ai-copilot",
    mult: 2,
    unlock: { generator: "ai-copilot", count: 5 },
  },
  {
    id: "synergy",
    name: "Post-merger synergy",
    flavor: "The acquisitions finally integrate. 2× their revenue.",
    cost: 60_000_000_000,
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

// ---- Research (R&D lab): timed, linear, permanent multipliers. Knowledge
// survives crashes — the one thing investors can't take back.
export interface ResearchDef {
  id: string;
  name: string;
  flavor: string;
  cost: number;
  seconds: number;
  mult: number;
  /** Licensing revenue per second once shipped — research can BE the company. */
  royalty: number;
}

export const RESEARCH: ResearchDef[] = [
  {
    id: "mvp",
    name: "MVP polish",
    flavor: "Fewer crashes than the demo. ×1.25 revenue + royalties.",
    cost: 20_000,
    seconds: 60,
    mult: 1.25,
    royalty: 500,
  },
  {
    id: "v2",
    name: "Product v2",
    flavor: "The rewrite that actually ships. ×1.5 revenue.",
    cost: 500_000,
    seconds: 180,
    mult: 1.5,
    royalty: 5_000,
  },
  {
    id: "mobile-app",
    name: "Mobile app",
    flavor: "Now in your pocket. ×1.75 revenue.",
    cost: 10_000_000,
    seconds: 300,
    mult: 1.75,
    royalty: 50_000,
  },
  {
    id: "ai-features",
    name: "AI features",
    flavor: "The board demanded it. ×2 revenue.",
    cost: 200_000_000,
    seconds: 480,
    mult: 2,
    royalty: 500_000,
  },
  {
    id: "moonshot",
    name: "Moonshot lab",
    flavor: "Nobody knows what they do in there. ×3 revenue.",
    cost: 10_000_000_000,
    seconds: 900,
    mult: 3,
    royalty: 5_000_000,
  },
];

export function researchById(id: string): ResearchDef | undefined {
  return RESEARCH.find((r) => r.id === id);
}

// ---- Ad campaigns: pay, roll the dice, maybe go viral.
export const CAMPAIGN_COST_SECONDS = 30; // costs ~30s of gross revenue
export const CAMPAIGN_MIN_COST = 1_000;
export const CAMPAIGN_COOLDOWN_SECONDS = 60;

export interface CampaignOutcome {
  tier: "flop" | "hit" | "viral";
  mult: number;
  seconds: number;
  headline: string;
}

/** roll ∈ [0,1) → outcome. ~20% viral, ~50% hit, ~30% flop. */
export function rollCampaign(roll: number): CampaignOutcome {
  if (roll < 0.2) {
    return { tier: "viral", mult: 5, seconds: 45, headline: "IT WENT VIRAL! ×5 revenue" };
  }
  if (roll < 0.7) {
    return { tier: "hit", mult: 2, seconds: 45, headline: "Solid campaign — ×2 revenue" };
  }
  return { tier: "flop", mult: 1, seconds: 0, headline: "The ad flopped. Marketing shrugs." };
}

// ---- Lucky events: a bubble floats by; tap it, roll the dice.
export const LUCK_SPAWN_MEAN_SECONDS = 70;
export const LUCK_LIFETIME_SECONDS = 12;
export const FRENZY_MULT = 7;
export const FRENZY_SECONDS = 15;

export interface LuckOutcome {
  type: "cash" | "frenzy";
  /** multiple of gross revenue/sec granted as instant cash (cash type) */
  revenueSeconds?: number;
  minCash?: number;
  headline: string;
}

/** roll ∈ [0,1) → outcome. */
export function rollLuck(roll: number): LuckOutcome {
  if (roll < 0.45) {
    return {
      type: "cash",
      revenueSeconds: 120,
      minCash: 1_000,
      headline: "A VC slid into your DMs 💰",
    };
  }
  if (roll < 0.8) {
    return { type: "frenzy", headline: `Hacker News front page! ×${FRENZY_MULT} ships` };
  }
  return {
    type: "cash",
    revenueSeconds: 45,
    minCash: 500,
    headline: "Bug bounty paid out 🐛",
  };
}

// ---- Milestones: the story beats of building a company.
export interface MilestoneDef {
  id: string;
  name: string;
  emoji: string;
  /** One line of real company-building wisdom, shown at the celebration. */
  lesson: string;
  /** computed = { gross, net } revenue per second at check time */
  check(state: MilestoneView, computed: { gross: number; net: number }): boolean;
}

/** The slice of GameState milestones read (kept minimal for testability). */
export interface MilestoneView {
  totalEarned: number;
  generators: Record<string, number>;
  campaignsRun: number;
  rounds: number;
  crashes: number;
  investors: number;
  research: { done: string[] };
}

const teamSize = (s: MilestoneView) => Object.values(s.generators).reduce((a, b) => a + b, 0);

const deptSize = (s: MilestoneView, dept: DeptId) =>
  GENERATORS.filter((g) => g.dept === dept).reduce((a, g) => a + (s.generators[g.id] ?? 0), 0);

export const MILESTONES: MilestoneDef[] = [
  {
    id: "first-hire",
    name: "First hire",
    emoji: "🧑‍💻",
    lesson: "You now make money while you sleep — and payroll while you don't.",
    check: (s) => teamSize(s) >= 1,
  },
  {
    id: "first-1k",
    name: "First $10K earned",
    emoji: "💵",
    lesson: "Revenue is the only funding you never have to give back.",
    check: (s) => s.totalEarned >= 10_000,
  },
  {
    id: "first-campaign",
    name: "First marketing campaign",
    emoji: "📣",
    lesson: "Marketing is a dice roll. Roll it anyway — with money you can lose.",
    check: (s) => s.campaignsRun >= 1,
  },
  {
    id: "ramen-profitable",
    name: "Ramen profitable",
    emoji: "🍜",
    lesson: "Net positive means nobody can kill your company but you.",
    check: (_s, c) => c.net > 0 && c.gross >= 500,
  },
  {
    id: "first-research",
    name: "First research shipped",
    emoji: "🔬",
    lesson: "R&D pays twice: better product now, royalties forever.",
    check: (s) => s.research.done.length >= 1,
  },
  {
    id: "first-raise",
    name: "First round raised",
    emoji: "🎉",
    lesson: "Venture money buys speed, not safety. Your burn just went up.",
    check: (s) => s.rounds >= 1,
  },
  {
    id: "pmf",
    name: "Product-market fit",
    emoji: "🚀",
    lesson: "When revenue climbs without pushing, stop pushing and start scaling.",
    check: (_s, c) => c.gross >= 5_000,
  },
  {
    id: "real-office",
    name: "A real office",
    emoji: "🏟️",
    lesson: "Every hire adds output AND burn. Growth is a balance sheet.",
    check: (s) => teamSize(s) >= 25,
  },
  {
    id: "survivor",
    name: "Rose from the ashes",
    emoji: "🔥",
    lesson: "Startups die of running out of cash, not of bad ideas. You learned cheap.",
    check: (s) => s.crashes >= 1,
  },
  {
    id: "unicorn-club",
    name: "Unicorn club",
    emoji: "🦄",
    lesson: "Reputation compounds across companies. Investors bet on repeat founders.",
    check: (s) => s.investors >= 40,
  },
  {
    id: "ip-empire",
    name: "IP licensing empire",
    emoji: "🧪",
    lesson: "Own the IP and the product sells itself while you build the next one.",
    check: (s) => s.research.done.length >= 3,
  },
  {
    id: "sales-machine",
    name: "Sales machine",
    emoji: "🤑",
    lesson: "Distribution beats product more often than builders admit.",
    check: (s) => deptSize(s, "gtm") >= 15,
  },
  {
    id: "builders-guild",
    name: "Builders' guild",
    emoji: "🛠️",
    lesson: "Engineers compound — if product keeps them pointed somewhere.",
    check: (s) => deptSize(s, "eng") >= 30,
  },
];
