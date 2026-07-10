import { describe, expect, it } from "vitest";
import { DEFAULT_OFFLINE_CAP_SECONDS, elapsedOfflineSeconds } from "../src/offline";

describe("elapsedOfflineSeconds", () => {
  it("computes elapsed seconds since the save", () => {
    expect(elapsedOfflineSeconds(1_000, 61_000)).toBe(60);
  });

  it("caps long absences at the default 8h", () => {
    const tenDaysMs = 10 * 24 * 3600 * 1000;
    expect(elapsedOfflineSeconds(0, tenDaysMs)).toBe(DEFAULT_OFFLINE_CAP_SECONDS);
  });

  it("honors a custom cap", () => {
    expect(elapsedOfflineSeconds(0, 100_000, 30)).toBe(30);
  });

  it("returns 0 for fresh saves, future timestamps, and non-finite input", () => {
    expect(elapsedOfflineSeconds(null, 1000)).toBe(0);
    expect(elapsedOfflineSeconds(5000, 1000)).toBe(0);
    expect(elapsedOfflineSeconds(Number.NaN, 1000)).toBe(0);
  });
});
