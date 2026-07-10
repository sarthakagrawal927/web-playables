import { describe, expect, it } from "vitest";
import { DECISIONS, GENERATORS, generatorById } from "../src/content";
import {
  applyDecision,
  availableUpgrades,
  burnPerSec,
  buyGenerator,
  buyUpgrade,
  campaignCost,
  canLaunchCampaign,
  claimLuck,
  companyAgeLabel,
  currentQuest,
  doCrash,
  fireMate,
  generatorCost,
  generatorVisible,
  grossPerSec,
  hireCost,
  launchCampaign,
  managerShipsPerSec,
  netPerSec,
  recordHire,
  roleFull,
  royaltiesPerSec,
  runwaySeconds,
  shipValue,
  startResearch,
  tick,
  upgradeOffice,
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
    expect(generatorCost(intern, 0)).toBe(500);
    expect(generatorCost(intern, 10)).toBeCloseTo(500 * 1.15 ** 10);
  });

  it("gross sums producing roles times base rate", () => {
    const state = initialState();
    state.generators = { intern: 4, "junior-dev": 2 };
    expect(grossPerSec(state)).toBeCloseTo(4 * 260 + 2 * 520);
  });

  it("eng managers auto-ship at ship value", () => {
    const state = initialState();
    state.generators = { "eng-manager": 2 };
    expect(managerShipsPerSec(state)).toBeCloseTo(2 * 0.5 * shipValue(state));
    expect(grossPerSec(state)).toBeCloseTo(managerShipsPerSec(state));
  });
});

describe("archetype powers (all six departments differ)", () => {
  it("product hires multiply engineering only", () => {
    const state = initialState();
    state.generators = { intern: 10, "sales-rep": 1, "product-manager": 2 };
    expect(grossPerSec(state)).toBeCloseTo(10 * 260 * 1.16 + 700);
  });

  it("gtm hires multiply ship value", () => {
    const state = initialState();
    state.generators = { "sales-rep": 5 };
    expect(shipValue(state)).toBeCloseTo(2_000 * (1 + 0.12 * 5));
  });

  it("people hires discount hiring, capped at 30%", () => {
    const state = rich();
    const base = generatorCost(intern, 0);
    state.generators = { recruiter: 10 };
    expect(hireCost(state, intern)).toBeCloseTo(base * 0.85);
    state.generators = { recruiter: 100 };
    expect(hireCost(state, intern)).toBeCloseTo(base * 0.7);
  });

  it("the CFO trims payroll burn 15%", () => {
    const state = initialState();
    state.generators = { intern: 10, cfo: 1 };
    expect(burnPerSec(state)).toBeCloseTo((10 * 130 + 2500) * 0.85);
  });

  it("lawyers soften the per-round salary jump", () => {
    const state = initialState();
    state.generators = { intern: 10 };
    state.rounds = 2;
    expect(burnPerSec(state)).toBeCloseTo(1300 * 1.25 ** 2);
    state.generators = { intern: 10, lawyer: 5 };
    expect(burnPerSec(state)).toBeCloseTo((1300 + 5 * 1000) * 1.15 ** 2);
  });

  it("every department's entry role is visible from day one", () => {
    const state = initialState();
    for (const id of ["intern", "sales-rep", "product-manager", "recruiter", "cfo", "lawyer"]) {
      const def = generatorById(id);
      expect(def && generatorVisible(state, def)).toBe(true);
    }
  });

  it("C-suite roles are singletons", () => {
    const state = rich();
    const cfo = generatorById("cfo");
    expect(cfo && roleFull(state, cfo)).toBe(false);
    expect(buyGenerator(state, "cfo")).toBe(true);
    expect(cfo && roleFull(state, cfo)).toBe(true);
    expect(buyGenerator(state, "cfo")).toBe(false);
  });
});

describe("traits and firing", () => {
  it("shippers produce more; expensive taste raises payroll", () => {
    const state = initialState();
    state.generators = { intern: 2 };
    recordHire(state, 1, "A", "intern", "shipper"); // +0.25 output units
    expect(grossPerSec(state)).toBeCloseTo(2.25 * 260);
    recordHire(state, 2, "B", "intern", "expensive"); // +0.4 output, +0.5 pay
    expect(grossPerSec(state)).toBeCloseTo(2.65 * 260);
    expect(burnPerSec(state)).toBeCloseTo(2.5 * 130);
  });

  it("firing pays severance, drops headcount, and removes the trait", () => {
    const state = rich();
    state.generators = { intern: 1 };
    recordHire(state, 7, "Maya K.", "intern", "shipper");
    expect(grossPerSec(state)).toBeCloseTo(1.25 * 260);
    const paid = fireMate(state, 0);
    expect(paid).toBeCloseTo(130 * 30); // one month of intern salary
    expect(state.generators.intern).toBe(0);
    expect(state.team).toEqual([]);
    expect(grossPerSec(state)).toBe(0);
  });
});

describe("payroll, runway, and the clock", () => {
  it("net can go negative and runway counts down to the crash", () => {
    const state = initialState();
    state.cash = 1_300;
    state.generators = { "product-manager": 1 }; // $650/day salary, no revenue
    expect(netPerSec(state)).toBeCloseTo(-650);
    expect(runwaySeconds(state)).toBeCloseTo(2);
    const events = tick(state, 3);
    expect(events.crashed).toBe(true);
  });

  it("time passes: 30 days = 1 month", () => {
    const state = initialState();
    tick(state, 30 * 13);
    expect(companyAgeLabel(state)).toBe("Y2 · M2");
  });
});

describe("quests and decisions", () => {
  it("the quest chain pays out through tick and advances", () => {
    const state = initialState();
    state.generators = { intern: 1 };
    const cashBefore = state.cash;
    const events = tick(state, 0.1);
    expect(events.quest?.id).toBe("first-intern");
    expect(state.questIndex).toBe(1);
    expect(state.cash).toBeGreaterThan(cashBefore);
    expect(currentQuest(state)?.id).not.toBe("first-intern");
  });

  it("the board asks for a decision every quarter", () => {
    const state = initialState();
    const events = tick(state, 91);
    expect(events.decisionDue?.id).toBe(DECISIONS[0]?.id);
    expect(tick(state, 1).decisionDue).toBeNull();
  });

  it("decisions apply temporary revenue/burn modifiers", () => {
    const state = initialState();
    state.generators = { intern: 10 }; // 2600/day gross, 1300/day burn
    const growth = DECISIONS[0];
    if (!growth) throw new Error("missing decision");
    applyDecision(state, growth, 0); // blitz: rev ×1.6, burn ×1.4, 30d
    expect(grossPerSec(state)).toBeCloseTo(2600 * 1.6);
    expect(burnPerSec(state)).toBeCloseTo(1300 * 1.4);
    tick(state, 31);
    expect(grossPerSec(state)).toBeCloseTo(2600);
    expect(burnPerSec(state)).toBeCloseTo(1300);
  });

  it("gambles resolve by roll", () => {
    const state = initialState();
    state.generators = { intern: 10 };
    const acquirer = DECISIONS[1];
    if (!acquirer) throw new Error("missing decision");
    const cashBefore = state.cash;
    applyDecision(state, acquirer, 0, 0.1); // win: +45 days of gross
    expect(state.cash).toBeCloseTo(cashBefore + 2600 * 45);
  });
});

describe("dice: campaigns and luck", () => {
  it("campaigns cost money, roll outcomes, and cool down", () => {
    const state = rich();
    state.generators = { intern: 10 };
    expect(campaignCost(state)).toBeCloseTo(10 * 260 * 30);
    const outcome = launchCampaign(state, 0.05);
    expect(outcome?.tier).toBe("viral");
    expect(state.boosts.adMult).toBe(5);
    expect(canLaunchCampaign(state)).toBe(false);
    tick(state, 61);
    expect(state.boosts.adMult).toBe(1);
    expect(canLaunchCampaign(state)).toBe(true);
  });

  it("luck grants cash or a ship frenzy", () => {
    const state = initialState();
    const cash = claimLuck(state, 0.1);
    expect(cash.type).toBe("cash");
    expect(state.cash).toBeGreaterThanOrEqual(STARTING_CASH + 2000);
    const frenzy = claimLuck(state, 0.6);
    expect(frenzy.type).toBe("frenzy");
    expect(shipValue(state)).toBeCloseTo(2_000 * 7);
    tick(state, 16);
    expect(shipValue(state)).toBeCloseTo(2_000);
  });
});

describe("research", () => {
  it("takes time, then multiplies revenue and pays royalties", () => {
    const state = rich();
    state.generators = { intern: 10 };
    expect(startResearch(state)).toBe(true);
    const events = tick(state, 60);
    expect(events.researchDone?.id).toBe("mvp");
    expect(royaltiesPerSec(state)).toBeCloseTo(800);
    expect(grossPerSec(state)).toBeCloseTo(800 + 10 * 260 * 1.25);
  });

  it("a research-heavy company earns with zero engineers", () => {
    const state = rich();
    state.research.done = ["mvp", "v2"];
    expect(grossPerSec(state)).toBeCloseTo(800 + 6_000);
  });
});

describe("the office", () => {
  it("upgrading boosts morale (all revenue) and adds rent to burn", () => {
    const state = rich();
    state.generators = { intern: 10 }; // 2600/day gross, 1300/day payroll
    expect(upgradeOffice(state)?.id).toBe("coworking");
    expect(grossPerSec(state)).toBeCloseTo(2600 * 1.1);
    expect(burnPerSec(state)).toBeCloseTo(1300 + 150);
  });

  it("rent is not inflated by salary multipliers", () => {
    const state = rich();
    state.generators = { intern: 10 };
    state.rounds = 2;
    upgradeOffice(state);
    expect(burnPerSec(state)).toBeCloseTo(1300 * 1.25 ** 2 + 150);
  });

  it("a crash sends the company back to the garage", () => {
    const state = rich();
    upgradeOffice(state);
    doCrash(state);
    expect(state.officeIndex).toBe(0);
  });
});

describe("upgrades", () => {
  it("unlock and multiply their target", () => {
    const state = rich();
    state.generators = { intern: 10 };
    const before = grossPerSec(state);
    expect(availableUpgrades(state).map((u) => u.id)).toContain("coffee-machine");
    expect(buyUpgrade(state, "coffee-machine")).toBe(true);
    expect(grossPerSec(state)).toBeCloseTo(before * 2);
  });
});
