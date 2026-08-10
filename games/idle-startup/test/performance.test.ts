import { describe, expect, it } from "vitest";
import { GENERATORS } from "../src/content";
import { tick } from "../src/sim";
import { initialState } from "../src/state";

const SIZES = [1_000, 10_000, 50_000];
const ITERATIONS = 3;

describe("idle startup tick performance", () => {
  it("scales deterministic company ticks", () => {
    const metrics: string[] = [];

    for (const size of SIZES) {
      let totalDuration = 0;
      let finalAge = 0;
      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        const state = initialState();
        state.cash = 1e30;
        state.generators = Object.fromEntries(GENERATORS.map((generator) => [generator.id, 10]));

        const startedAt = performance.now();
        for (let step = 0; step < size; step += 1) tick(state, 0.016);
        totalDuration += performance.now() - startedAt;
        finalAge = state.ageSeconds;
        expect(Number.isFinite(state.cash)).toBe(true);
      }
      expect(finalAge).toBeCloseTo(size * 0.016, 6);
      metrics.push(`size${size}=${(totalDuration / ITERATIONS).toFixed(3)}ms/op`);
    }

    console.log(`[benchmark] ${metrics.join(" ")} (${ITERATIONS} iterations)`);
  });
});
