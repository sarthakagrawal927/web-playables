import { describe, expect, it } from "vitest";
import {
  doCrash,
  earningsToNextInvestor,
  raiseGain,
  raiseRound,
  recordHire,
  tick,
} from "../src/sim";
import { initialState, STARTING_CASH } from "../src/state";

describe("funding rounds (raise until you crash)", () => {
  it("raise gain is floor(sqrt(earned / 10M)), incremental within a run", () => {
    const state = initialState();
    expect(raiseGain(state)).toBe(0);
    state.totalEarned = 10_000_000;
    expect(raiseGain(state)).toBe(1);
    state.totalEarned = 90_000_000;
    expect(raiseGain(state)).toBe(3);
    state.raisedThisRun = 2;
    expect(raiseGain(state)).toBe(1);
  });

  it("reports earnings needed for the next point", () => {
    const state = initialState();
    expect(earningsToNextInvestor(state)).toBe(10_000_000);
    state.totalEarned = 10_000_000;
    // gain 1 pending; the point after that lands at 40M
    expect(earningsToNextInvestor(state)).toBe(30_000_000);
  });

  it("raising banks investors, injects cash, and does NOT reset the run", () => {
    const state = initialState();
    state.totalEarned = 40_000_000;
    state.generators = { intern: 5 };
    const gained = raiseRound(state);
    expect(gained).toBe(2);
    expect(state.investors).toBe(2);
    expect(state.rounds).toBe(1);
    expect(state.cash).toBeCloseTo(STARTING_CASH + 2 * 2_500_000);
    expect(state.generators.intern).toBe(5); // the company keeps running
    expect(state.equity).toBeCloseTo(0.85); // diluted 15%
    expect(raiseRound(state)).toBe(0); // nothing new to bank
  });

  it("each round raises salary expectations 25%", () => {
    const state = initialState();
    state.generators = { intern: 10 };
    state.cash = 1_000_000;
    state.questIndex = 999; // keep quest rewards out of the payroll math
    const before = state.cash;
    tick(state, 1);
    const drainAt0 = before + 2600 - 1300 - state.cash; // sanity: net positive

    state.rounds = 3;
    const cash2 = state.cash;
    tick(state, 1);
    expect(state.cash - cash2).toBeCloseTo(2600 - 1300 * 1.25 ** 3);
    expect(drainAt0).toBeCloseTo(0);
  });

  it("a crash resets the run but keeps reputation and knowledge", () => {
    const state = initialState();
    state.investors = 7;
    state.crashes = 0;
    state.totalEarned = 5_000_000;
    state.rounds = 3;
    state.raisedThisRun = 2;
    state.generators = { intern: 50 };
    state.upgrades = ["coffee-machine"];
    state.research.done = ["mvp"];
    state.research.current = "v2";
    state.research.progress = 100;
    state.ageSeconds = 900;
    recordHire(state, 123, "Maya K.", "intern", "shipper");

    doCrash(state);
    expect(state.crashes).toBe(1);
    expect(state.investors).toBe(7); // reputation survives
    expect(state.research.done).toEqual(["mvp"]); // knowledge survives
    expect(state.cash).toBe(STARTING_CASH);
    expect(state.totalEarned).toBe(0);
    expect(state.generators).toEqual({});
    expect(state.upgrades).toEqual([]);
    expect(state.rounds).toBe(0);
    expect(state.raisedThisRun).toBe(0);
    expect(state.team).toEqual([]);
    expect(state.roleMods).toEqual({});
    expect(state.equity).toBe(1);
    expect(state.ageSeconds).toBe(0);
    expect(state.research.current).toBeNull();
  });

  it("team members are recorded in hire order with a display cap", () => {
    const state = initialState();
    for (let i = 0; i < 60; i++) recordHire(state, i, `P${i}`, "intern");
    expect(state.team.length).toBe(48);
    expect(state.team[47]).toEqual({ s: 59, n: "P59", r: "intern", t: "steady" });
  });
});
