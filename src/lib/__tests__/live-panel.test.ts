import { describe, it, expect } from "vitest";
import { isTodayOrTomorrow } from "../espn-match";

// Test hàm isTodayOrTomorrow thật (export từ espn-match.ts), không copy-paste logic.
// Trước đây file này tái định nghĩa lại hàm → test không bắt được regression nếu logic đổi.
describe("Live panel date filtering — isTodayOrTomorrow", () => {
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

  it("treats two calendar dates as equal regardless of time-of-day", () => {
    const morning = new Date();
    morning.setHours(9, 0, 0, 0);
    const evening = new Date();
    evening.setHours(21, 0, 0, 0);
    expect(isTodayOrTomorrow(morning)).toBe(isTodayOrTomorrow(evening));
  });

  it("returns false for invalid date", () => {
    expect(isTodayOrTomorrow(new Date("not-a-date"))).toBe(false);
  });
});
