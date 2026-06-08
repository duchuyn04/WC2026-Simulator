import { describe, it, expect } from "vitest";
import { isPlayedResult } from "../types";

describe("isPlayedResult", () => {
  it("requires both sides set and non-negative", () => {
    expect(isPlayedResult({ home: 2, away: 1 })).toBe(true);
    expect(isPlayedResult({ home: 2 })).toBe(false);
    expect(isPlayedResult({ away: 1 })).toBe(false);
    expect(isPlayedResult({ home: -1, away: 0 })).toBe(false);
  });
});