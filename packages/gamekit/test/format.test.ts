import { describe, expect, it } from "vitest";
import { formatDuration, formatNumber } from "../src/format";

describe("formatNumber", () => {
  it("keeps small numbers plain", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(7.25)).toBe("7.3");
    expect(formatNumber(999)).toBe("999");
  });

  it("applies K/M/B/T suffixes", () => {
    expect(formatNumber(1234)).toBe("1.23K");
    expect(formatNumber(1_000_000)).toBe("1M");
    expect(formatNumber(1.5e9)).toBe("1.5B");
    expect(formatNumber(2.345e12)).toBe("2.35T");
  });

  it("rolls into aa/ab suffixes past T", () => {
    expect(formatNumber(1e15)).toBe("1aa");
    expect(formatNumber(1e18)).toBe("1ab");
  });

  it("handles negatives and infinity", () => {
    expect(formatNumber(-1234)).toBe("-1.23K");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("∞");
  });
});

describe("formatDuration", () => {
  it("formats seconds, minutes, hours", () => {
    expect(formatDuration(42)).toBe("42s");
    expect(formatDuration(150)).toBe("2m 30s");
    expect(formatDuration(8130)).toBe("2h 15m");
  });
});
