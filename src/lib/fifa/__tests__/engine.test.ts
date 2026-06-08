import { describe, it, expect } from "vitest";
import { calculateGroupStandings } from "../standings";
import { rankThirdPlaceTeams } from "../third-place";
import { resolveKnockoutBracket, getMatchesByStage } from "../bracket";
import { seed } from "../../data";
import type { GroupStanding } from "../types";

describe("calculateGroupStandings", () => {
  it("ranks teams by points from scores", () => {
    const group = seed.groups[0];
    const results: Record<string, { home: number; away: number }> = {};

    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      const homeWins =
        (m.home.code === "MEX" && m.away.code === "RSA") ||
        (m.home.code === "MEX" && m.away.code === "KOR") ||
        (m.home.code === "MEX" && m.away.code === "CZE") ||
        (m.home.code === "KOR" && m.away.code === "CZE") ||
        (m.home.code === "CZE" && m.away.code === "RSA");
      results[m.id] = homeWins ? { home: 2, away: 0 } : { home: 0, away: 2 };
    }

    const standing = calculateGroupStandings(group, results);
    expect(standing.first.team.code).toBe("MEX");
    expect(standing.ranked).toHaveLength(4);
  });
});

describe("rankThirdPlaceTeams", () => {
  it("picks top 8 third-place teams", () => {
    const standings: GroupStanding[] = seed.groups.map((g) =>
      calculateGroupStandings(g, {})
    );
    const result = rankThirdPlaceTeams(standings);
    expect(result.qualified).toHaveLength(8);
    expect(result.eliminated).toHaveLength(4);
    expect(result.qualifyingGroups).toMatch(/^[A-L](,[A-L]){7}$/);
  });
});

describe("resolveKnockoutBracket", () => {
  it("resolves R32 placeholders from group standings", () => {
    const standings: GroupStanding[] = seed.groups.map((g) => {
      const results: Record<string, { home: number; away: number }> = {};
      let i = 0;
      for (const m of g.matches) {
        if (!m.home || !m.away) continue;
        results[m.id] = { home: 3 - (i % 4), away: i % 4 };
        i++;
      }
      return calculateGroupStandings(g, results);
    });

    const third = rankThirdPlaceTeams(standings);
    const resolved = resolveKnockoutBracket(
      seed.knockout,
      standings,
      third.qualifyingGroups,
      {},
      {}
    );
    const stages = getMatchesByStage(resolved);

    expect(stages.r32).toHaveLength(16);
    const withTeams = stages.r32.filter((m) => m.resolvedHome?.team && m.resolvedAway?.team);
    expect(withTeams.length).toBeGreaterThan(0);
  });
});