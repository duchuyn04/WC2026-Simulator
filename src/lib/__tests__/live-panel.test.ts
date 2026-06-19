import { describe, it, expect } from "vitest";

// isTodayOrTomorrow logic (test the pure functions)
function isTodayOrTomorrow(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target.getTime() === today.getTime() || target.getTime() === tomorrow.getTime();
}

describe("Live panel date filtering", () => {
  it("returns true for today", () => {
    expect(isTodayOrTomorrow(new Date())).toBe(true);
  });

  it("returns true for tomorrow", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isTodayOrTomorrow(tomorrow)).toBe(true);
  });

  it("returns false for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isTodayOrTomorrow(yesterday)).toBe(false);
  });

  it("returns false for 3 days from now", () => {
    const future = new Date();
    future.setDate(future.getDate() + 3);
    expect(isTodayOrTomorrow(future)).toBe(false);
  });

  it("handles date crossing midnight correctly", () => {
    const now = new Date();
    const lateTonight = new Date(now);
    lateTonight.setHours(23, 59, 59, 999);
    expect(isTodayOrTomorrow(lateTonight)).toBe(true);
  });
});
