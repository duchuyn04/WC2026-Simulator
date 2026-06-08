import { describe, it, expect } from "vitest";
import {
  getDisplayFitScale,
  clampBracketZoom,
  ensureMobileReadableZoom,
  resolveInitialBracketZoom,
  MOBILE_MIN_EFFECTIVE_SCALE,
} from "../bracket-viewport";

describe("getDisplayFitScale", () => {
  it("floors tiny fit scale on mobile", () => {
    expect(getDisplayFitScale(0.15, true)).toBe(MOBILE_MIN_EFFECTIVE_SCALE);
  });

  it("keeps larger fit scale on mobile", () => {
    expect(getDisplayFitScale(0.7, true)).toBe(0.7);
  });

  it("does not change desktop fit scale", () => {
    expect(getDisplayFitScale(0.15, false)).toBe(0.15);
  });
});

describe("clampBracketZoom", () => {
  it("allows higher zoom on mobile", () => {
    expect(clampBracketZoom(3.5, true)).toBe(3.5);
    expect(clampBracketZoom(3.5, false)).toBe(2.5);
  });
});

describe("ensureMobileReadableZoom", () => {
  it("bumps zoom when effective scale is too small", () => {
    const zoom = ensureMobileReadableZoom(1, 0.15, true);
    expect(MOBILE_MIN_EFFECTIVE_SCALE * zoom).toBeGreaterThanOrEqual(
      MOBILE_MIN_EFFECTIVE_SCALE
    );
  });
});

describe("resolveInitialBracketZoom", () => {
  it("uses mobile default zoom for fresh view", () => {
    expect(resolveInitialBracketZoom(1, 0.15, true)).toBeGreaterThan(1);
  });

  it("keeps saved desktop zoom on desktop", () => {
    expect(resolveInitialBracketZoom(1.75, 0.4, false)).toBe(1.75);
  });
});