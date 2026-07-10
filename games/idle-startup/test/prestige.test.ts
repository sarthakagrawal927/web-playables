import { describe, expect, it } from "vitest";
import { doPrestige, earningsToNextInvestor, prestigeGain } from "../src/sim";
import { initialState } from "../src/state";

describe("prestige (funding rounds)", () => {
  it("gain is floor(sqrt(earned / 1e6))", () => {
    const state = initialState();
    expect(prestigeGain(state)).toBe(0);
    state.totalEarned = 999_999;
    expect(prestigeGain(state)).toBe(0);
    state.totalEarned = 1_000_000;
    expect(prestigeGain(state)).toBe(1);
    state.totalEarned = 4_000_000;
    expect(prestigeGain(state)).toBe(2);
    state.totalEarned = 9_000_000;
    expect(prestigeGain(state)).toBe(3);
  });

  it("reports earnings needed for the next point", () => {
    const state = initialState();
    state.totalEarned = 250_000;
    expect(earningsToNextInvestor(state)).toBe(750_000);
    state.totalEarned = 1_000_000; // gain 1; next point at 4M
    expect(earningsToNextInvestor(state)).toBe(3_000_000);
  });

  it("refuses to prestige below the threshold", () => {
    const state = initialState();
    state.totalEarned = 500_000;
    expect(doPrestige(state)).toBe(false);
    expect(state.rounds).toBe(0);
  });

  it("resets the run but keeps investors and rounds", () => {
    const state = initialState();
    state.cash = 123;
    state.totalEarned = 4_200_000;
    state.clicks = 999;
    state.generators = { intern: 50 };
    state.upgrades = ["coffee-machine"];

    expect(doPrestige(state)).toBe(true);
    expect(state.investors).toBe(2);
    expect(state.rounds).toBe(1);
    expect(state.cash).toBe(0);
    expect(state.totalEarned).toBe(0);
    expect(state.generators).toEqual({});
    expect(state.upgrades).toEqual([]);
    // clicks are lifetime stats, not run progress
    expect(state.clicks).toBe(999);
  });

  it("stacks investors across repeated rounds", () => {
    const state = initialState();
    state.totalEarned = 1_000_000;
    doPrestige(state);
    state.totalEarned = 1_000_000;
    doPrestige(state);
    expect(state.investors).toBe(2);
    expect(state.rounds).toBe(2);
  });
});
