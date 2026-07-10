import { describe, expect, it } from "vitest";
import { GENERATORS, generatorById } from "../src/content";
import {
  applyOffline,
  availableUpgrades,
  burnPerSec,
  buyGenerator,
  buyUpgrade,
  campaignCost,
  canLaunchCampaign,
  claimLuck,
  clickPower,
  companyAgeLabel,
  generatorCost,
  generatorVisible,
  grossPerSec,
  hireCost,
  launchCampaign,
  netPerSec,
  royaltiesPerSec,
  runwaySeconds,
  shipClick,
  startResearch,
  tick,
} from "../src/sim";
import { type GameState, initialState, STARTING_CASH } from "../src/state";

const intern = GENERATORS[0];
if (!intern) throw new Error("content missing");

function rich(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(), cash: 1e15, ...overrides };
}

describe("economy math", () => {
  it("starts with friends-and-family money", () => {
    expect(initialState().cash).toBe(STARTING_CASH);
  });

  it("generator cost grows geometrically", () => {
    expect(generatorCost(intern, 0)).toBe(150);
    expect(generatorCost(intern, 10)).toBeCloseTo(150 * 1.15 ** 10);
  });

  it("gross sums producing roles times base rate", () => {
    const state = initialState();
    state.generators = { intern: 4, "junior-dev": 2 };
    expect(grossPerSec(state)).toBeCloseTo(4 * 5 + 2 * 20);
  });

  it("clicks earn CLICK_BASE at start", () => {
    const state = initialState();
    expect(shipClick(state)).toBeCloseTo(10);
    expect(state.clicks).toBe(1);
  });
});

describe("archetype powers", () => {
  it("product hires multiply engineering only", () => {
    const state = initialState();
    state.generators = { intern: 10, "sales-rep": 1, "product-manager": 2 };
    // eng: 10×5 ×(1+0.08×2)=58 ; gtm: 60 unaffected by product
    expect(grossPerSec(state)).toBeCloseTo(10 * 5 * 1.16 + 60);
  });

  it("gtm hires multiply the ship click", () => {
    const state = initialState();
    state.generators = { "sales-rep": 5 };
    expect(clickPower(state)).toBeCloseTo(10 * (1 + 0.12 * 5));
  });

  it("people hires discount hiring, capped at 30%", () => {
    const state = rich();
    const base = generatorCost(intern, 0);
    state.generators = { recruiter: 10 };
    expect(hireCost(state, intern)).toBeCloseTo(base * 0.85);
    state.generators = { recruiter: 100 };
    expect(hireCost(state, intern)).toBeCloseTo(base * 0.7);
  });

  it("every department's entry role is visible from day one", () => {
    const state = initialState();
    for (const id of ["intern", "sales-rep", "product-manager", "recruiter", "cfo"]) {
      const def = generatorById(id);
      expect(def && generatorVisible(state, def)).toBe(true);
    }
    const growth = generatorById("growth-hacker");
    expect(growth && generatorVisible(state, growth)).toBe(false);
  });
});

describe("payroll, runway, and the clock", () => {
  it("salaries burn cash every tick and scale with rounds", () => {
    const state = initialState();
    state.generators = { intern: 10 }; // 10 × $1/s
    expect(burnPerSec(state)).toBeCloseTo(10);
    state.rounds = 2;
    expect(burnPerSec(state)).toBeCloseTo(10 * 1.25 ** 2);
  });

  it("net can go negative and runway counts down to the crash", () => {
    const state = initialState();
    state.cash = 100;
    state.generators = { "product-manager": 1 }; // $40/s salary, no revenue
    expect(netPerSec(state)).toBeCloseTo(-40);
    expect(runwaySeconds(state)).toBeCloseTo(2.5);
    const events = tick(state, 3);
    expect(state.cash).toBeLessThan(0);
    expect(events.crashed).toBe(true);
  });

  it("time passes: 30s = 1 month", () => {
    const state = initialState();
    tick(state, 30 * 13);
    expect(companyAgeLabel(state)).toBe("Y2 · M2");
  });
});

describe("hiring and upgrades", () => {
  it("buyGenerator spends discounted cash and increments count", () => {
    const state = initialState();
    state.cash = 200;
    expect(buyGenerator(state, "intern")).toBe(true);
    expect(state.cash).toBeCloseTo(50);
    expect(state.generators.intern).toBe(1);
    expect(buyGenerator(state, "intern")).toBe(false); // now too broke
  });

  it("upgrades unlock and multiply their target", () => {
    const state = rich();
    state.generators = { intern: 10 };
    const before = grossPerSec(state);
    expect(availableUpgrades(state).map((u) => u.id)).toContain("coffee-machine");
    expect(buyUpgrade(state, "coffee-machine")).toBe(true);
    expect(grossPerSec(state)).toBeCloseTo(before * 2);
    expect(buyUpgrade(state, "coffee-machine")).toBe(false);
  });
});

describe("dice: campaigns and luck", () => {
  it("campaigns cost money, roll outcomes, and cool down", () => {
    const state = rich();
    state.generators = { intern: 10 }; // gross 50 → cost max(1000, 1500)
    expect(campaignCost(state)).toBeCloseTo(1500);
    const outcome = launchCampaign(state, 0.05); // viral
    expect(outcome?.tier).toBe("viral");
    expect(state.boosts.adMult).toBe(5);
    expect(state.campaignsRun).toBe(1);
    expect(canLaunchCampaign(state)).toBe(false); // cooldown
    tick(state, 61);
    expect(state.boosts.adRemaining).toBe(0);
    expect(state.boosts.adMult).toBe(1);
    expect(canLaunchCampaign(state)).toBe(true);
  });

  it("a flop takes the money and gives nothing", () => {
    const state = rich();
    const cashBefore = state.cash;
    const outcome = launchCampaign(state, 0.95);
    expect(outcome?.tier).toBe("flop");
    expect(state.boosts.adMult).toBe(1);
    expect(state.cash).toBeLessThan(cashBefore);
  });

  it("luck grants cash or a click frenzy", () => {
    const state = initialState();
    const cash = claimLuck(state, 0.1);
    expect(cash.type).toBe("cash");
    expect(state.cash).toBeGreaterThanOrEqual(STARTING_CASH + 1000);
    const frenzy = claimLuck(state, 0.6);
    expect(frenzy.type).toBe("frenzy");
    expect(clickPower(state)).toBeCloseTo(10 * 7);
    tick(state, 16);
    expect(clickPower(state)).toBeCloseTo(10);
  });
});

describe("research", () => {
  it("takes time, then multiplies revenue and pays royalties", () => {
    const state = rich();
    state.generators = { intern: 10 }; // gross 50
    expect(startResearch(state)).toBe(true); // mvp: 60s, ×1.25, $500/s royalty
    expect(state.research.current).toBe("mvp");
    const events = tick(state, 60);
    expect(events.researchDone?.id).toBe("mvp");
    expect(royaltiesPerSec(state)).toBeCloseTo(500);
    expect(grossPerSec(state)).toBeCloseTo(500 + 10 * 5 * 1.25);
  });

  it("a research-heavy company earns with zero engineers", () => {
    const state = rich();
    state.research.done = ["mvp", "v2"];
    expect(grossPerSec(state)).toBeCloseTo(5_500);
  });
});

describe("offline progress", () => {
  it("grants net revenue, floored at zero when payroll exceeds it", () => {
    const a = initialState();
    a.generators = { intern: 10 }; // net 50-10=40/s
    const earned = applyOffline(a, 100);
    expect(earned).toBeCloseTo(4000);

    const b = initialState();
    b.generators = { "product-manager": 3 }; // pure burn
    expect(applyOffline(b, 100)).toBe(0);
    expect(b.cash).toBe(STARTING_CASH);
  });
});
