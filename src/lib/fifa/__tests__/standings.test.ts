import { describe, it, expect, test } from "vitest";
import { calculateGroupStandings, buildStandingsFromOrder } from "../standings";
import { seed } from "../../data";
import {
  makeGroupWinnerResults,
  makeGroupRoundRobinResults,
} from "./helpers/scenarios";

const GROUP_LETTERS = seed.groups.map((g) => g.letter);
const TEAM_CODES = seed.groups.flatMap((g) => g.teams.map((t) => t.code));

describe("calculateGroupStandings — points", () => {
  test.each(GROUP_LETTERS)("group %s: win awards 3 points", (letter) => {
    const group = seed.groups.find((g) => g.letter === letter)!;
    const winner = group.teams[0].code;
    const standing = calculateGroupStandings(group, makeGroupWinnerResults(group, winner));
    expect(standing.first.team.code).toBe(winner);
    expect(standing.first.points).toBe(9);
    expect(standing.fourth.points).toBeLessThan(standing.first.points);
  });

  test.each(GROUP_LETTERS)("group %s: draw awards 1 point each", (letter) => {
    const group = seed.groups.find((g) => g.letter === letter)!;
    const results: Record<string, { home: number; away: number }> = {};
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = { home: 1, away: 1 };
    }
    const standing = calculateGroupStandings(group, results);
    for (const s of standing.ranked) {
      expect(s.points).toBe(3);
      expect(s.drawn).toBe(3);
    }
  });

  test.each(GROUP_LETTERS)("group %s: empty results keep 4 ranked teams", (letter) => {
    const group = seed.groups.find((g) => g.letter === letter)!;
    const standing = calculateGroupStandings(group, {});
    expect(standing.ranked).toHaveLength(4);
    expect(standing.letter).toBe(letter);
  });
});

describe("calculateGroupStandings — partial results", () => {
  test.each(GROUP_LETTERS)("group %s: single match updates stats only for participants", (letter) => {
    const group = seed.groups.find((g) => g.letter === letter)!;
    const m = group.matches.find((x) => x.home && x.away)!;
    const standing = calculateGroupStandings(group, { [m.id]: { home: 3, away: 0 } });
    const played = standing.ranked.filter((s) => s.played > 0);
    expect(played).toHaveLength(2);
    expect(played.every((s) => s.played === 1)).toBe(true);
  });
});

describe("calculateGroupStandings — pattern sweep", () => {
  const patterns = Array.from({ length: 16 }, (_, i) => i);

  test.each(patterns.map((i) => [i] as [number]))(
    "pattern %i produces valid ordering for all 12 groups",
    (patternIndex) => {
      for (const group of seed.groups) {
        const standing = calculateGroupStandings(
          group,
          makeGroupRoundRobinResults(group, patternIndex)
        );
        expect(standing.ranked).toHaveLength(4);
        const ids = standing.ranked.map((s) => s.team.id);
        expect(new Set(ids).size).toBe(4);
        expect(standing.first.points).toBeGreaterThanOrEqual(standing.fourth.points);
      }
    }
  );
});

describe("calculateGroupStandings — tiebreakers", () => {
  it("breaks tie on goal difference", () => {
    const group = seed.groups[0];
    const results: Record<string, { home: number; away: number }> = {};
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = { home: 1, away: 1 };
    }
    const first = group.matches[0];
    if (first.home && first.away) {
      results[first.id] = { home: 3, away: 0 };
    }
    const standing = calculateGroupStandings(group, results);
    expect(standing.first.team.id).toBe(first.home!.id);
  });

  it("uses FIFA ranking when other stats tie", () => {
    const group = seed.groups[0];
    const results: Record<string, { home: number; away: number }> = {};
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = { home: 1, away: 1 };
    }
    const standing = calculateGroupStandings(group, results);
    const sorted = [...standing.ranked].sort(
      (a, b) => a.fifaRanking - b.fifaRanking
    );
    expect(standing.first.fifaRanking).toBe(sorted[0].fifaRanking);
  });

  it("respects fair play override", () => {
    const group = seed.groups[0];
    const results: Record<string, { home: number; away: number }> = {};
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = { home: 1, away: 1 };
    }
    const overrides: Record<string, number> = {};
    for (const t of group.teams) overrides[t.id] = t.code === "MEX" ? 10 : 0;
    const standing = calculateGroupStandings(group, results, overrides);
    expect(standing.first.team.code).toBe("MEX");
  });
});

describe("buildStandingsFromOrder", () => {
  test.each(GROUP_LETTERS)("group %s manual order sets 9/6/3/0 points", (letter) => {
    const group = seed.groups.find((g) => g.letter === letter)!;
    const order = [...group.teams].reverse();
    const standing = buildStandingsFromOrder(group, order);
    expect(standing.first.team.id).toBe(order[0].id);
    expect(standing.first.points).toBe(9);
    expect(standing.second.points).toBe(6);
    expect(standing.third.points).toBe(3);
    expect(standing.fourth.points).toBe(0);
  });

  test.each(TEAM_CODES.slice(0, 48))("each team %s can be group winner via manual order", (code) => {
    const group = seed.groups.find((g) => g.teams.some((t) => t.code === code))!;
    const team = group.teams.find((t) => t.code === code)!;
    const order = [team, ...group.teams.filter((t) => t.id !== team.id)];
    const standing = buildStandingsFromOrder(group, order);
    expect(standing.first.team.code).toBe(code);
  });
});