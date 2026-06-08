import { describe, it, expect, test } from "vitest";
import { seed } from "../../data";
import { resolveKnockoutBracket } from "../bracket";
import { rankThirdPlaceTeams } from "../third-place";
import { getPodiumFromMatches } from "../podium";
import { pruneKnockoutWinners, getDependentKnockoutMatches } from "../knockout-sync";
import {
  allTeamsMap,
  computeAllStandings,
  generateRandomGroupResults,
  pickBracketWinners,
  resolveFullBracket,
  makeGroupWinnerResults,
} from "./helpers/scenarios";
import type { Team } from "../types";

describe("full simulation pipeline", () => {
  test.each(Array.from({ length: 50 }, (_, i) => i))(
    "seed %i: groups → third → R32 → picks → podium",
    (seedNum) => {
      const matchResults = generateRandomGroupResults(seedNum);
      const standings = computeAllStandings(matchResults);
      const { third, stages } = resolveFullBracket(standings);

      expect(third.qualified).toHaveLength(8);
      expect(stages.r32).toHaveLength(16);

      const picks = pickBracketWinners(standings, seedNum % 2 === 0 ? "home" : "away");
      const { winners: pruned, removedCount } = pruneKnockoutWinners(matchResults, {}, picks);
      expect(removedCount).toBe(0);
      expect(Object.keys(pruned).length).toBe(Object.keys(picks).length);

      const allTeams = allTeamsMap();
      const teamWinners: Record<number, Team> = {};
      for (const [num, id] of Object.entries(pruned)) {
        const t = allTeams.get(id);
        if (t) teamWinners[Number(num)] = t;
      }
      const resolved = resolveKnockoutBracket(
        seed.knockout,
        standings,
        third.qualifyingGroups,
        teamWinners,
        {}
      );
      const map = new Map(resolved.map((m) => [m.matchNumber, m]));
      for (const [num, teamId] of Object.entries(pruned)) {
        const m = map.get(Number(num))!;
        const valid =
          m.resolvedHome?.team?.id === teamId || m.resolvedAway?.team?.id === teamId;
        expect(valid).toBe(true);
      }

      const fullPicks = pickBracketWinners(standings, "home");
      const fullWinners: Record<number, Team> = {};
      for (const [num, id] of Object.entries(fullPicks)) {
        const t = allTeams.get(id);
        if (t) fullWinners[Number(num)] = t;
      }
      const finalResolved = resolveKnockoutBracket(
        seed.knockout,
        standings,
        third.qualifyingGroups,
        fullWinners,
        {}
      );
      const podium = getPodiumFromMatches(
        new Map(finalResolved.map((m) => [m.matchNumber, m]))
      );
      if (Object.keys(fullPicks).length >= 30) {
        expect(podium.champion).not.toBeNull();
      }
    }
  );
});

describe("group change → knockout slot update", () => {
  test.each(seed.groups.map((g) => g.teams.map((t) => t.code)).flat().slice(0, 36))(
    "group A winner %s updates match #79 home slot",
    (winnerCode) => {
      const groupA = seed.groups.find((g) => g.letter === "A")!;
      const results = makeGroupWinnerResults(groupA, winnerCode);
      const standings = computeAllStandings(results);
      const { resolved } = resolveFullBracket(standings);
      const m79 = resolved.find((m) => m.matchNumber === 79)!;
      const groupStanding = standings.find((s) => s.letter === "A")!;
      expect(m79.resolvedHome?.team?.id).toBe(groupStanding.first.team.id);
    }
  );
});

describe("getDependentKnockoutMatches", () => {
  test.each([73, 74, 79, 89, 96, 101, 104])(
    "match #%i dependents are downstream only",
    (matchNum) => {
      const deps = getDependentKnockoutMatches(matchNum);
      for (const dep of deps) {
        expect(dep).toBeGreaterThan(matchNum);
      }
    }
  );

  it("final depends on both semi-finals", () => {
    const deps = getDependentKnockoutMatches(101);
    expect(deps.has(104)).toBe(true);
  });
});