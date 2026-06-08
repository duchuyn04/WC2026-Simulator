import { describe, it, expect, test } from "vitest";
import { getDependentKnockoutMatches, pruneKnockoutWinners } from "../knockout-sync";
import { seed } from "../../data";
import {
  generateRandomGroupResults,
  pickBracketWinners,
  computeAllStandings,
} from "./helpers/scenarios";
import { calculateGroupStandings } from "../standings";
import { rankThirdPlaceTeams } from "../third-place";
import { resolveKnockoutBracket } from "../bracket";

function groupAResults(winnerCode: string) {
  const group = seed.groups.find((g) => g.letter === "A")!;
  const results: Record<string, { home: number; away: number }> = {};
  for (const m of group.matches) {
    if (!m.home || !m.away) continue;
    const homeWins = m.home.code === winnerCode;
    results[m.id] = homeWins ? { home: 2, away: 0 } : { home: 0, away: 2 };
  }
  return results;
}

describe("pruneKnockoutWinners", () => {
  it("keeps valid picks when standings change but matchup stays the same", () => {
    const matchResults = groupAResults("MEX");
    const groupA = calculateGroupStandings(seed.groups[0], matchResults);
    expect(groupA.first.team.code).toBe("MEX");

    const standings = seed.groups.map((g) =>
      g.letter === "A" ? groupA : calculateGroupStandings(g, {})
    );
    const third = rankThirdPlaceTeams(standings);
    const resolved = resolveKnockoutBracket(
      seed.knockout,
      standings,
      third.qualifyingGroups,
      {},
      {}
    );
    const match79 = resolved.find((m) => m.matchNumber === 79)!;
    const mexId = match79.resolvedHome?.team?.id;
    expect(mexId).toBeTruthy();

    const { winners, removedCount } = pruneKnockoutWinners(matchResults, {}, { 79: mexId! });
    expect(removedCount).toBe(0);
    expect(winners[79]).toBe(mexId);
  });

  it("removes invalid R32 pick when group winner changes", () => {
    const mexResults = groupAResults("MEX");
    const standingsMex = seed.groups.map((g) =>
      g.letter === "A"
        ? calculateGroupStandings(g, mexResults)
        : calculateGroupStandings(g, {})
    );
    const thirdMex = rankThirdPlaceTeams(standingsMex);
    const resolvedMex = resolveKnockoutBracket(
      seed.knockout,
      standingsMex,
      thirdMex.qualifyingGroups,
      {},
      {}
    );
    const match79 = resolvedMex.find((m) => m.matchNumber === 79)!;
    const mexId = match79.resolvedHome!.team.id;

    const korResults = groupAResults("KOR");
    const { winners, removedCount } = pruneKnockoutWinners(korResults, {}, { 79: mexId });
    expect(removedCount).toBeGreaterThan(0);
    expect(winners[79]).toBeUndefined();
  });

  test.each(Array.from({ length: 20 }, (_, i) => i))(
    "random seed %i: prune keeps all valid picks",
    (seedNum) => {
      const matchResults = generateRandomGroupResults(seedNum);
      const standings = computeAllStandings(matchResults);
      const picks = pickBracketWinners(standings, "home");
      const { winners, removedCount } = pruneKnockoutWinners(matchResults, {}, picks);
      expect(removedCount).toBe(0);
      expect(Object.keys(winners).length).toBe(Object.keys(picks).length);
    }
  );

  it("cascades removal to dependent knockout picks", () => {
    const groupA = seed.groups.find((g) => g.letter === "A")!;
    const results = groupAResults("MEX");
    const standings = computeAllStandings(results);
    const picks = pickBracketWinners(standings, "home");
    const korResults = groupAResults("KOR");
    const { winners, removedCount } = pruneKnockoutWinners(korResults, {}, picks);
    expect(removedCount).toBeGreaterThan(0);
    const deps = getDependentKnockoutMatches(79);
    for (const dep of deps) {
      expect(winners[dep]).toBeUndefined();
    }
  });
});