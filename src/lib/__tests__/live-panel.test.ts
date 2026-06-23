import { describe, it, expect } from "vitest";
import { isWithinThreeDays } from "../espn-match";

// Test hàm isWithinThreeDays thật (export từ espn-match.ts), không copy-paste logic.
describe("Live panel date filtering — isWithinThreeDays", () => {
  it("returns true for today", () => {
    expect(isWithinThreeDays(new Date())).toBe(true);
  });

  it("returns true for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isWithinThreeDays(tomorrow)).toBe(true);
  });

  it("returns true for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isWithinThreeDays(yesterday)).toBe(true);
  });

  it("returns false for 3 days from now", () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    expect(isWithinThreeDays(future)).toBe(false);
  });

  it("returns false for 2 days ago", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(isWithinThreeDays(twoDaysAgo)).toBe(false);
  });

  it("handles date crossing midnight correctly", () => {
    const now = new Date();
    const lateTonight = new Date(now);
    lateTonight.setHours(23, 59, 59, 999);
    expect(isWithinThreeDays(lateTonight)).toBe(true);
  });

  it("treats two calendar dates as equal regardless of time-of-day", () => {
    const morning = new Date();
    morning.setHours(9, 0, 0, 0);
    const evening = new Date();
    evening.setHours(21, 0, 0, 0);
    expect(isWithinThreeDays(morning)).toBe(isWithinThreeDays(evening));
  });

  it("returns false for invalid date", () => {
    expect(isWithinThreeDays(new Date("not-a-date"))).toBe(false);
  });
});
