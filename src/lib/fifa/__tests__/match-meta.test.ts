import { describe, it, expect } from "vitest";
import { formatVietnamDateTime, formatVenue } from "../match-meta";

describe("formatVietnamDateTime", () => {
  it("converts UTC kickoff to Vietnam time", () => {
    // 2026-06-11T19:00:00Z = 02:00 ngày 12/06/2026 (VN, UTC+7)
    const result = formatVietnamDateTime("2026-06-11T19:00:00Z");
    expect(result).toContain("02:00");
    expect(result).toContain("12");
    expect(result).toContain("06");
    expect(result).toContain("2026");
  });
});

describe("formatVenue", () => {
  it("joins stadium and city", () => {
    expect(formatVenue("Mexico City Stadium", "Mexico City")).toBe(
      "Mexico City Stadium, Mexico City"
    );
  });
});