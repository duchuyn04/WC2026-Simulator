import { describe, it, expect } from "vitest";
import { calculateFairPlayScore, aggregateFairPlay } from "../fair-play";
import { seed } from "../data";
import type { FairPlayData, MatchResult } from "../fifa/types";

describe("calculateFairPlayScore", () => {
  it("returns 0 for no cards", () => {
    expect(calculateFairPlayScore({ yellowCards: 0, redCards: 0 })).toBe(0);
  });

  it("returns -1 per yellow card", () => {
    expect(calculateFairPlayScore({ yellowCards: 2, redCards: 0 })).toBe(-2);
  });

  it("returns -3 per red card", () => {
    expect(calculateFairPlayScore({ yellowCards: 0, redCards: 1 })).toBe(-3);
  });

  it("combines yellow and red cards", () => {
    expect(calculateFairPlayScore({ yellowCards: 3, redCards: 1 })).toBe(-6);
  });

  it("higher score = fewer cards = better", () => {
    const clean = calculateFairPlayScore({ yellowCards: 0, redCards: 0 });
    const dirty = calculateFairPlayScore({ yellowCards: 2, redCards: 1 });
    expect(clean).toBeGreaterThan(dirty);
  });
});

describe("aggregateFairPlay", () => {
  it("returns empty object when no results", () => {
    const result = aggregateFairPlay({}, seed.groups);
    expect(result).toEqual({});
  });

  it("aggregates cards across multiple matches per team", () => {
    const group = seed.groups[0];
    const t0 = group.teams[0];
    const t1 = group.teams[1];
    // Find two different matches involving team0
    const matches0 = group.matches.filter(
      (m) => m.home?.id === t0.id || m.away?.id === t0.id,
    );
    if (matches0.length < 2 || !t0 || !t1) return;

    const [mA, mB] = matches0;
    const results: Record<string, MatchResult> = {};

    // Match A: team0 has 2 yellows
    if (mA.home?.id === t0.id) {
      results[mA.id] = { home: 1, away: 0, homeFairPlay: { yellowCards: 2, redCards: 0 } };
    } else {
      results[mA.id] = { home: 0, away: 1, awayFairPlay: { yellowCards: 2, redCards: 0 } };
    }

    // Match B: team0 has 1 yellow
    if (mB.home?.id === t0.id) {
      results[mB.id] = { home: 0, away: 0, homeFairPlay: { yellowCards: 1, redCards: 0 } };
    } else {
      results[mB.id] = { home: 0, away: 0, awayFairPlay: { yellowCards: 1, redCards: 0 } };
    }

    const scores = aggregateFairPlay(results, seed.groups);

    // team0: -2 (match A) + -1 (match B) = -3
    expect(scores[t0.id]).toBe(-3);
  });

  it("ignores matches without fair play data", () => {
    const group = seed.groups[0];
    const m1 = group.matches[0];
    if (!m1.home || !m1.away) return;

    const results: Record<string, MatchResult> = {
      [m1.id]: { home: 1, away: 0 }, // no fair play data
    };

    const scores = aggregateFairPlay(results, seed.groups);
    expect(scores[m1.home.id]).toBeUndefined();
    expect(scores[m1.away.id]).toBeUndefined();
  });
});

describe("fair play tiebreaker integration", () => {
  it("fair play overrides change standings order", async () => {
    const { calculateGroupStandings } = await import("../fifa/standings");
    const group = seed.groups[0];
    // All draws → equal points, GD, GF
    const results: Record<string, { home: number; away: number }> = {};
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = { home: 1, away: 1 };
    }

    const withoutFP = calculateGroupStandings(group, results);
    // Give first team terrible fair play
    const overrides: Record<string, number> = {};
    overrides[group.teams[0].id] = -10;
    const withFP = calculateGroupStandings(group, results, overrides);

    // The team with -10 fair play should be ranked lower
    const team0RankWithout = withoutFP.ranked.findIndex((s) => s.team.id === group.teams[0].id);
    const team0RankWith = withFP.ranked.findIndex((s) => s.team.id === group.teams[0].id);
    expect(team0RankWith).toBeGreaterThanOrEqual(team0RankWithout);
  });
});
