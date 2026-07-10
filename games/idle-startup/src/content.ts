export type DeptId = "eng" | "product" | "gtm" | "people" | "finance" | "legal";

export interface DeptDef {
  id: DeptId;
  name: string;
  icon: string;
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
  /** Hard cap on hires for this role (C-suite is a party of one). */
  max?: number;
}

export type UpgradeTarget = "click" | "all" | (string & {});

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  flavor: string;
  cost: number;
  target: UpgradeTarget;
  mult: number;
  unlock: { generator?: string; count?: number; totalEarned?: number };
}

/** Value of one shipped feature (managers do the shipping). */
export const SHIP_VALUE = 2_000;

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
/** Each lawyer softens the salary jump each round causes… */
export const LEGAL_SOFTEN = 0.02;
/** …but rounds always cost at least +5%. */
export const LEGAL_SOFTEN_FLOOR = 1.05;

/** Each finance hire trims payroll burn… */
export const FINANCE_BURN_DISCOUNT = 0.15;
/** …down to at most −40%. */
export const FINANCE_BURN_DISCOUNT_CAP = 0.4;

export const DEPTS: DeptDef[] = [
  {
    id: "eng",
    name: "Engineering",
    icon: "🛠️",
    hue: 150,
    perk: "Builds product. Earns revenue.",
    short: "builds",
  },
  {
    id: "product",
    name: "Product",
    icon: "📐",
    hue: 258,
    perk: "+8% engineering revenue per hire",
    short: "+8% eng",
  },
  {
    id: "gtm",
    name: "Go-to-market",
    icon: "📣",
    hue: 38,
    perk: "+12% per ship per hire",
    short: "+12% ship",
  },
  {
    id: "people",
    name: "People",
    icon: "🤝",
    hue: 320,
    perk: "−1.5% hire costs per hire",
    short: "−1.5% hires",
  },
  {
    id: "finance",
    name: "Finance",
    icon: "🧮",
    hue: 205,
    perk: "−15% payroll burn per finance hire",
    short: "−15% burn",
  },
  {
    id: "legal",
    name: "Legal",
    icon: "⚖️",
    hue: 0,
    perk: "softens round salary jumps −2% per hire",
    short: "softer rounds",
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
    baseCost: 500,
    costGrowth: 1.15,
    baseRate: 260,
    salary: 130,
  },
  {
    id: "junior-dev",
    dept: "eng",
    name: "Junior dev",
    flavor: "Knows one framework. Deeply.",
    emoji: "👩‍💻",
    baseCost: 3_000,
    costGrowth: 1.15,
    baseRate: 520,
    salary: 280,
  },
  {
    id: "senior-dev",
    dept: "eng",
    name: "Senior dev",
    flavor: "Deletes more code than they write.",
    emoji: "🧙",
    baseCost: 12_000,
    costGrowth: 1.15,
    baseRate: 1_100,
    salary: 600,
  },
  {
    id: "staff-engineer",
    dept: "eng",
    name: "Staff engineer",
    flavor: "Writes the doc that ends the argument.",
    emoji: "🏗️",
    baseCost: 60_000,
    costGrowth: 1.15,
    baseRate: 2_600,
    salary: 1_400,
  },
  {
    id: "eng-manager",
    dept: "eng",
    name: "Manager",
    flavor: "Ships for you. Runs the standup.",
    emoji: "🧑‍💼",
    baseCost: 25_000,
    costGrowth: 1.2,
    baseRate: 0,
    salary: 700,
  },
  {
    id: "ai-copilot",
    dept: "eng",
    name: "AI copilot",
    flavor: "Autocompletes the whole sprint.",
    emoji: "🤖",
    baseCost: 400_000,
    costGrowth: 1.15,
    baseRate: 9_000,
    salary: 4_000,
  },
  {
    id: "acquisition",
    dept: "eng",
    name: "Competitor acquisition",
    flavor: "Their engineers ship for you now.",
    emoji: "🏢",
    baseCost: 50_000_000,
    costGrowth: 1.15,
    baseRate: 300_000,
    salary: 160_000,
  },

  // Product — multiplies engineering
  {
    id: "product-manager",
    dept: "product",
    name: "Product manager",
    flavor: "Turns chaos into roadmap.",
    emoji: "📋",
    baseCost: 30_000,
    costGrowth: 1.22,
    baseRate: 0,
    salary: 650,
  },
  {
    id: "designer",
    dept: "product",
    name: "Designer",
    flavor: "Moves it 2px left. Revenue up.",
    emoji: "🎨",
    baseCost: 90_000,
    costGrowth: 1.22,
    baseRate: 0,
    salary: 550,
  },

  // Go-to-market — multiplies the ship click, closes some deals too
  {
    id: "sales-rep",
    dept: "gtm",
    name: "Sales rep",
    flavor: "Sells the feature you haven't shipped.",
    emoji: "📞",
    baseCost: 8_000,
    costGrowth: 1.17,
    baseRate: 700,
    salary: 350,
  },
  {
    id: "growth-hacker",
    dept: "gtm",
    name: "Growth hacker",
    flavor: "A/B tests the pricing page hourly.",
    emoji: "📈",
    baseCost: 150_000,
    costGrowth: 1.17,
    baseRate: 4_200,
    salary: 2_200,
  },
  {
    id: "cmo",
    dept: "gtm",
    name: "CMO",
    flavor: "Makes the launch trend before lunch.",
    emoji: "📣",
    baseCost: 3_000_000,
    costGrowth: 1.17,
    baseRate: 30_000,
    salary: 15_000,
    max: 1,
  },

  // People — makes every hire cheaper
  {
    id: "recruiter",
    dept: "people",
    name: "Recruiter",
    flavor: "Knows everyone. Closes anyone.",
    emoji: "🤝",
    baseCost: 40_000,
    costGrowth: 1.3,
    baseRate: 0,
    salary: 400,
  },
  {
    id: "chief-of-staff",
    dept: "people",
    name: "Chief of staff",
    flavor: "The org chart finally makes sense.",
    emoji: "🗂️",
    baseCost: 800_000,
    costGrowth: 1.3,
    baseRate: 0,
    salary: 1_500,
    max: 1,
  },

  // Legal — reads the term sheet before you sign it
  {
    id: "lawyer",
    dept: "legal",
    name: "Startup lawyer",
    flavor: "Reads the fine print you signed anyway.",
    emoji: "⚖️",
    baseCost: 200_000,
    costGrowth: 1.3,
    baseRate: 0,
    salary: 1_000,
  },

  // Finance — keeps the burn honest
  {
    id: "cfo",
    dept: "finance",
    name: "CFO",
    flavor: "Finds money you didn't know you had.",
    emoji: "🧮",
    baseCost: 1_500_000,
    costGrowth: 1.35,
    baseRate: 0,
    salary: 2_500,
    max: 1,
  },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: "coffee-machine",
    emoji: "☕",
    name: "Coffee machine",
    flavor: "Interns work at 2× pour-over speed.",
    cost: 3_000,
    target: "intern",
    mult: 2,
    unlock: { generator: "intern", count: 5 },
  },
  {
    id: "mech-keyboards",
    emoji: "⌨️",
    name: "Mechanical keyboards",
    flavor: "Louder typing, bigger features. 2× per ship.",
    cost: 5_000,
    target: "click",
    mult: 2,
    unlock: { totalEarned: 10_000 },
  },
  {
    id: "pair-programming",
    emoji: "🧑‍🤝‍🧑",
    name: "Pair programming",
    flavor: "Junior devs produce 2× (and argue 3×).",
    cost: 20_000,
    target: "junior-dev",
    mult: 2,
    unlock: { generator: "junior-dev", count: 5 },
  },
  {
    id: "ci-pipeline",
    emoji: "✅",
    name: "CI pipeline",
    flavor: "Green checks for everyone: +50% all revenue.",
    cost: 80_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 200_000 },
  },
  {
    id: "rubber-ducks",
    emoji: "🦆",
    name: "Rubber duck fleet",
    flavor: "Senior devs debug 2× faster by explaining to ducks.",
    cost: 250_000,
    target: "senior-dev",
    mult: 2,
    unlock: { generator: "senior-dev", count: 5 },
  },
  {
    id: "dark-mode",
    emoji: "🌙",
    name: "Dark mode",
    flavor: "The most requested feature. 3× per ship.",
    cost: 400_000,
    target: "click",
    mult: 3,
    unlock: { totalEarned: 1_000_000 },
  },
  {
    id: "crm-nobody-updates",
    emoji: "📇",
    name: "A CRM nobody updates",
    flavor: "Sales still closes 2× with it open in a tab.",
    cost: 500_000,
    target: "sales-rep",
    mult: 2,
    unlock: { generator: "sales-rep", count: 5 },
  },
  {
    id: "okr-alignment",
    emoji: "🎯",
    name: "OKR alignment",
    flavor: "Everyone rows the same direction: +50% all revenue.",
    cost: 3_000_000,
    target: "all",
    mult: 1.5,
    unlock: { generator: "product-manager", count: 3 },
  },
  {
    id: "design-system",
    emoji: "📐",
    name: "Design system",
    flavor: "Staff engineers stop rebuilding buttons. 2× output.",
    cost: 7_000_000,
    target: "staff-engineer",
    mult: 2,
    unlock: { generator: "staff-engineer", count: 5 },
  },
  {
    id: "viral-launch",
    emoji: "🎬",
    name: "Viral launch video",
    flavor: "Growth hits the algorithm. 2× their revenue.",
    cost: 25_000_000,
    target: "growth-hacker",
    mult: 2,
    unlock: { generator: "growth-hacker", count: 5 },
  },
  {
    id: "microservices",
    emoji: "🧩",
    name: "Microservices rewrite",
    flavor: "Nobody knows how it works now. +50% all revenue.",
    cost: 60_000_000,
    target: "all",
    mult: 1.5,
    unlock: { totalEarned: 30_000_000 },
  },
  {
    id: "fine-tuning",
    emoji: "🧠",
    name: "Fine-tuned models",
    flavor: "The copilot learned your codebase. 2× output.",
    cost: 250_000_000,
    target: "ai-copilot",
    mult: 2,
    unlock: { generator: "ai-copilot", count: 5 },
  },
  {
    id: "synergy",
    emoji: "🤝",
    name: "Post-merger synergy",
    flavor: "The acquisitions finally integrate. 2× their revenue.",
    cost: 5_000_000_000,
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
    cost: 15_000,
    seconds: 60,
    mult: 1.25,
    royalty: 800,
  },
  {
    id: "v2",
    name: "Product v2",
    flavor: "The rewrite that actually ships. ×1.5 revenue.",
    cost: 120_000,
    seconds: 180,
    mult: 1.5,
    royalty: 6_000,
  },
  {
    id: "mobile-app",
    name: "Mobile app",
    flavor: "Now in your pocket. ×1.75 revenue.",
    cost: 1_000_000,
    seconds: 300,
    mult: 1.75,
    royalty: 40_000,
  },
  {
    id: "ai-features",
    name: "AI features",
    flavor: "The board demanded it. ×2 revenue.",
    cost: 20_000_000,
    seconds: 480,
    mult: 2,
    royalty: 400_000,
  },
  {
    id: "moonshot",
    name: "Moonshot lab",
    flavor: "Nobody knows what they do in there. ×3 revenue.",
    cost: 1_000_000_000,
    seconds: 900,
    mult: 3,
    royalty: 4_000_000,
  },
];

export function researchById(id: string): ResearchDef | undefined {
  return RESEARCH.find((r) => r.id === id);
}

// ---- Ad campaigns: pay, roll the dice, maybe go viral.
export const CAMPAIGN_COST_SECONDS = 30; // costs ~30s of gross revenue
export const CAMPAIGN_MIN_COST = 5_000;
export const CAMPAIGN_COOLDOWN_SECONDS = 30;

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
export const LUCK_SPAWN_MEAN_SECONDS = 35;
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
      minCash: 5_000,
      headline: "A VC slid into your DMs 💰",
    };
  }
  if (roll < 0.8) {
    return { type: "frenzy", headline: `Hacker News front page! ×${FRENZY_MULT} ships` };
  }
  return {
    type: "cash",
    revenueSeconds: 45,
    minCash: 2_000,
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
    name: "First $100K earned",
    emoji: "💵",
    lesson: "Revenue is the only funding you never have to give back.",
    check: (s) => s.totalEarned >= 100_000,
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
    check: (_s, c) => c.net > 0 && c.gross >= 10_000,
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
    check: (_s, c) => c.gross >= 100_000,
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

// ---- clicking feel: crits and combos.
/** Each eng manager auto-ships this many times per second. */
export const MANAGER_SHIPS_PER_SEC = 0.5;
/** Pure flavor: what the copilots are really costing you. */
export const TOKENS_PER_COPILOT_PER_SEC = 250_000;

// ---- quest chain: the "what do I do next" engine.
export interface QuestView extends MilestoneView {
  clicks: number;
  research: { current: string | null; done: string[] };
  officeIndex: number;
}

export interface QuestDef {
  id: string;
  goal: string;
  emoji: string;
  reward: number;
  check(state: QuestView, computed: { gross: number }): boolean;
}

const hires = (s: QuestView) => Object.values(s.generators).reduce((a, b) => a + b, 0);

export const QUESTS: QuestDef[] = [
  {
    id: "first-intern",
    goal: "Hire your first intern",
    emoji: "🧑‍💻",
    reward: 1_000,
    check: (s) => (s.generators.intern ?? 0) >= 1,
  },
  {
    id: "interns-3",
    goal: "Grow to 3 interns",
    emoji: "☕",
    reward: 2_500,
    check: (s) => (s.generators.intern ?? 0) >= 3,
  },
  {
    id: "junior-1",
    goal: "Hire a junior dev",
    emoji: "👩‍💻",
    reward: 5_000,
    check: (s) => (s.generators["junior-dev"] ?? 0) >= 1,
  },
  {
    id: "manager-1",
    goal: "Hire an eng manager — they ship for you",
    emoji: "🧑‍💼",
    reward: 8_000,
    check: (s) => (s.generators["eng-manager"] ?? 0) >= 1,
  },
  {
    id: "earn-5k",
    goal: "Earn $50K in total",
    emoji: "💵",
    reward: 12_000,
    check: (s) => s.totalEarned >= 50_000,
  },
  {
    id: "campaign-1",
    goal: "Run your first ad campaign",
    emoji: "📣",
    reward: 20_000,
    check: (s) => s.campaignsRun >= 1,
  },
  {
    id: "sales-1",
    goal: "Hire someone in sales",
    emoji: "📞",
    reward: 30_000,
    check: (s) => (s.generators["sales-rep"] ?? 0) >= 1,
  },
  {
    id: "office-1",
    goal: "Move out of the garage",
    emoji: "🪑",
    reward: 40_000,
    check: (s) => s.officeIndex >= 1,
  },
  {
    id: "rate-200",
    goal: "Reach $5K/day revenue",
    emoji: "📈",
    reward: 50_000,
    check: (_s, c) => c.gross >= 5_000,
  },
  {
    id: "research-1",
    goal: "Start a research project",
    emoji: "🔬",
    reward: 100_000,
    check: (s) => s.research.current !== null || s.research.done.length > 0,
  },
  {
    id: "team-10",
    goal: "Grow the team to 10",
    emoji: "🏢",
    reward: 200_000,
    check: (s) => hires(s) >= 10,
  },
  {
    id: "pm-1",
    goal: "Hire a product manager",
    emoji: "📋",
    reward: 400_000,
    check: (s) => (s.generators["product-manager"] ?? 0) >= 1,
  },
  {
    id: "rate-2k",
    goal: "Reach $50K/day revenue",
    emoji: "💸",
    reward: 1_000_000,
    check: (_s, c) => c.gross >= 50_000,
  },
  {
    id: "earn-2m",
    goal: "Earn $20M in total",
    emoji: "🤑",
    reward: 2_500_000,
    check: (s) => s.totalEarned >= 20_000_000,
  },
  {
    id: "raise-1",
    goal: "Raise your first round",
    emoji: "🎉",
    reward: 5_000_000,
    check: (s) => s.rounds >= 1,
  },
  {
    id: "rate-20k",
    goal: "Reach $500K/day revenue",
    emoji: "🌊",
    reward: 12_000_000,
    check: (_s, c) => c.gross >= 500_000,
  },
  {
    id: "team-25",
    goal: "Grow the team to 25",
    emoji: "🏟️",
    reward: 40_000_000,
    check: (s) => hires(s) >= 25,
  },
];

// ---- candidate traits: some ship fast, some burn cash, some are steady.
export interface TraitDef {
  id: string;
  name: string;
  emoji: string;
  /** extra output, as a fraction of one unit (producers only) */
  rateBonus: number;
  /** extra salary, as a fraction of one unit */
  payBonus: number;
  blurb: string;
}

export const TRAITS: TraitDef[] = [
  {
    id: "steady",
    name: "Steady",
    emoji: "🧘",
    rateBonus: 0,
    payBonus: 0,
    blurb: "steady",
  },
  {
    id: "shipper",
    name: "Shipper",
    emoji: "🚀",
    rateBonus: 0.25,
    payBonus: 0,
    blurb: "+25% output",
  },
  {
    id: "expensive",
    name: "Expensive taste",
    emoji: "💸",
    rateBonus: 0.4,
    payBonus: 0.5,
    blurb: "+40% out · +50% pay",
  },
  {
    id: "slow",
    name: "Slow starter",
    emoji: "🐢",
    rateBonus: -0.2,
    payBonus: -0.2,
    blurb: "−20% out · −20% pay",
  },
];

/** roll ∈ [0,1) → trait; steady is the common case. */
export function rollTrait(roll: number): TraitDef {
  if (roll < 0.4) return TRAITS[0] as TraitDef;
  if (roll < 0.65) return TRAITS[1] as TraitDef;
  if (roll < 0.85) return TRAITS[3] as TraitDef;
  return TRAITS[2] as TraitDef;
}

export function traitById(id: string): TraitDef | undefined {
  return TRAITS.find((t) => t.id === id);
}

/** Severance: one month of salary to part ways. */
export const SEVERANCE_MONTHS_SECONDS = 30;

// ---- quarterly decisions: every 90 days the board wants an answer.
export interface DecisionEffect {
  /** instant cash, in days of gross revenue (can be negative) */
  cashDays?: number;
  /** temporary revenue multiplier … */
  rev?: number;
  /** … and/or burn multiplier … */
  burn?: number;
  /** … lasting this many days */
  days?: number;
  /** gamble: probability that `win` applies instead of `lose` */
  gamble?: { p: number; win: DecisionEffect; lose: DecisionEffect };
}

export interface DecisionOption {
  label: string;
  desc: string;
  effect: DecisionEffect;
}

export interface DecisionDef {
  id: string;
  title: string;
  blurb: string;
  options: DecisionOption[];
}

export const QUARTER_SECONDS = 90;

export const DECISIONS: DecisionDef[] = [
  {
    id: "growth-vs-discipline",
    title: "Board meeting: growth or discipline?",
    blurb: "The deck is due. What's the story this quarter?",
    options: [
      {
        label: "Blitz growth 📈",
        desc: "Revenue ×1.6 for 30d — but burn ×1.4 too",
        effect: { rev: 1.6, burn: 1.4, days: 30 },
      },
      {
        label: "Tighten belts ✂️",
        desc: "Burn ×0.7 for 30d — revenue dips ×0.9",
        effect: { rev: 0.9, burn: 0.7, days: 30 },
      },
      { label: "Stay the course 🧭", desc: "No changes. Boring is a strategy.", effect: {} },
    ],
  },
  {
    id: "acquirer-email",
    title: "An acquirer slid into your inbox",
    blurb: '"Quick call?" — it\'s never quick.',
    options: [
      {
        label: "Take the meeting 🤝",
        desc: "50/50: a fat term sheet (+45d revenue) or a distracted team (×0.85 for 20d)",
        effect: { gamble: { p: 0.5, win: { cashDays: 45 }, lose: { rev: 0.85, days: 20 } } },
      },
      {
        label: "Archive it 🗑️",
        desc: "The team never knows. Focus: +5d revenue now",
        effect: { cashDays: 5 },
      },
    ],
  },
  {
    id: "offsite",
    title: "The team wants an offsite",
    blurb: "Somewhere with a whiteboard and a pool.",
    options: [
      {
        label: "Book it 🏝️",
        desc: "Costs 15d of revenue — team ships ×1.25 for 45d",
        effect: { cashDays: -15, rev: 1.25, days: 45 },
      },
      {
        label: "Zoom offsite 💻",
        desc: "Free. Morale ×1.05 for 15d. Someone stays muted the whole time.",
        effect: { rev: 1.05, days: 15 },
      },
    ],
  },
  {
    id: "press-cycle",
    title: "A journalist is writing about your space",
    blurb: "You can shape the story — or gamble on it.",
    options: [
      {
        label: "Full access 📰",
        desc: "60%: glowing feature (×1.5 for 25d). 40%: hit piece (×0.8 for 25d)",
        effect: { gamble: { p: 0.6, win: { rev: 1.5, days: 25 }, lose: { rev: 0.8, days: 25 } } },
      },
      {
        label: "No comment 🤐",
        desc: "Safe. Nothing happens.",
        effect: {},
      },
    ],
  },
];

// ---- the office: morale up, rent up. Crash and it's back to the garage.
export interface OfficeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  /** rent per day, added to burn (unaffected by salary multipliers) */
  rent: number;
  /** morale: multiplies ALL revenue */
  morale: number;
}

export const OFFICES: OfficeDef[] = [
  { id: "garage", name: "The garage", emoji: "🚗", cost: 0, rent: 0, morale: 1 },
  { id: "coworking", name: "Coworking desks", emoji: "🪑", cost: 20_000, rent: 150, morale: 1.1 },
  { id: "loft", name: "Converted loft", emoji: "🏭", cost: 250_000, rent: 1_200, morale: 1.25 },
  { id: "office", name: "A real office", emoji: "🏢", cost: 3_000_000, rent: 8_000, morale: 1.45 },
  { id: "campus", name: "HQ campus", emoji: "🏛️", cost: 60_000_000, rent: 120_000, morale: 1.75 },
  {
    id: "tower",
    name: "Skyline tower",
    emoji: "🌆",
    cost: 1_500_000_000,
    rent: 2_000_000,
    morale: 2.2,
  },
];
