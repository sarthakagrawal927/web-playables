import { describe, expect, it } from "vitest";
import { GENERATORS } from "../src/content";
import {
  applyOffline,
  availableUpgrades,
  buyGenerator,
  buyUpgrade,
  clickPower,
  generatorCost,
  productionPerSec,
  shipClick,
  tick,
} from "../src/sim";
import { type GameState, initialState } from "../src/state";

const intern = GENERATORS[0];
if (!intern) throw new Error("content missing");

function richState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(), cash: 1e12, ...overrides };
}

describe("economy math", () => {
  it("generator cost grows geometrically", () => {
    expect(generatorCost(intern, 0)).toBe(15);
    expect(generatorCost(intern, 1)).toBeCloseTo(15 * 1.15);
    expect(generatorCost(intern, 10)).toBeCloseTo(15 * 1.15 ** 10);
  });

  it("production sums owned generators times base rate", () => {
    const state = initialState();
    state.generators = { intern: 4, "junior-dev": 2 };
    expect(productionPerSec(state)).toBeCloseTo(4 * 0.5 + 2 * 2);
  });

  it("upgrades multiply their target generator and 'all' stacks", () => {
    const state = initialState();
    state.generators = { intern: 10 };
    state.upgrades = ["coffee-machine", "ci-pipeline"]; // intern x2, all x1.5
    expect(productionPerSec(state)).toBeCloseTo(10 * 0.5 * 2 * 1.5);
  });

  it("investor points boost production and clicks by 2% each", () => {
    const state = initialState();
    state.generators = { intern: 10 };
    state.investors = 25; // +50%
    expect(productionPerSec(state)).toBeCloseTo(10 * 0.5 * 1.5);
    expect(clickPower(state)).toBeCloseTo(1 * 1.5);
  });

  it("tick accrues production into cash and totalEarned", () => {
    const state = initialState();
    state.generators = { intern: 10 }; // 5/s
    tick(state, 2);
    expect(state.cash).toBeCloseTo(10);
    expect(state.totalEarned).toBeCloseTo(10);
  });

  it("shipClick earns click power and counts the click", () => {
    const state = initialState();
    state.upgrades = ["mech-keyboards"]; // click x2
    const earned = shipClick(state);
    expect(earned).toBeCloseTo(2);
    expect(state.cash).toBeCloseTo(2);
    expect(state.clicks).toBe(1);
  });
});

describe("purchases", () => {
  it("buyGenerator spends cash and increments count", () => {
    const state = initialState();
    state.cash = 20;
    expect(buyGenerator(state, "intern")).toBe(true);
    expect(state.cash).toBeCloseTo(5);
    expect(state.generators.intern).toBe(1);
  });

  it("buyGenerator rejects when broke or unknown", () => {
    const state = initialState();
    state.cash = 5;
    expect(buyGenerator(state, "intern")).toBe(false);
    expect(buyGenerator(richState(), "blockchain-guy")).toBe(false);
  });

  it("upgrades unlock by generator count and totalEarned", () => {
    const state = richState();
    expect(availableUpgrades(state).map((u) => u.id)).not.toContain("coffee-machine");
    state.generators = { intern: 5 };
    expect(availableUpgrades(state).map((u) => u.id)).toContain("coffee-machine");
    state.totalEarned = 250;
    expect(availableUpgrades(state).map((u) => u.id)).toContain("mech-keyboards");
  });

  it("buyUpgrade enforces unlock, affordability, and no repeats", () => {
    const state = initialState();
    state.generators = { intern: 5 };
    state.cash = 300;
    expect(buyUpgrade(state, "coffee-machine")).toBe(false); // too expensive
    state.cash = 500;
    expect(buyUpgrade(state, "coffee-machine")).toBe(true);
    expect(state.cash).toBeCloseTo(100);
    expect(buyUpgrade(state, "coffee-machine")).toBe(false); // already owned
  });
});

describe("offline progress", () => {
  it("equals the same duration of ticking", () => {
    const a = initialState();
    a.generators = { intern: 7 };
    const b = structuredClone(a);
    const earned = applyOffline(a, 3600);
    for (let i = 0; i < 3600; i++) tick(b, 1);
    expect(a.cash).toBeCloseTo(b.cash, 5);
    expect(earned).toBeCloseTo(3600 * 3.5);
  });
});
