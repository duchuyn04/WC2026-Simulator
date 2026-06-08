import { describe, it, expect, test } from "vitest";
import { seed } from "../../data";
import { resolveKnockoutBracket, resolvePlaceholder, getMatchesByStage } from "../bracket";
import { rankThirdPlaceTeams } from "../third-place";
import {
  computeAllStandings,
  generateRandomGroupResults,
  pickBracketWinners,
  resolveFullBracket,
} from "./helpers/scenarios";
import type { Team } from "../types";

const KNOCKOUT_NUMBERS = seed.knockout.map((m) => m.matchNumber);

describe("knockout seed structure", () => {
  it("has 32 knockout matches (#73–#104)", () => {
    expect(seed.knockout).toHaveLength(32);
    expect(Math.min(...KNOCKOUT_NUMBERS)).toBe(73);
    expect(Math.max(...KNOCKOUT_NUMBERS)).toBe(104);
  });

  test.each(KNOCKOUT_NUMBERS)("match #%i has placeholders", (num) => {
    const m = seed.knockout.find((x) => x.matchNumber === num)!;
    expect(m.placeholderA).toBeTruthy();
    expect(m.placeholderB).toBeTruthy();
  });
});

describe("resolveKnockoutBracket — stage counts", () => {
  it("splits into 16+8+4+2+1+1 matches", () => {
    const standings = computeAllStandings(generateRandomGroupResults(42));
    const { stages } = resolveFullBracket(standings);
    expect(stages.r32).toHaveLength(16);
    expect(stages.r16).toHaveLength(8);
    expect(stages.qf).toHaveLength(4);
    expect(stages.sf).toHaveLength(2);
    expect(stages.third).toHaveLength(1);
    expect(stages.final).toHaveLength(1);
  });
});

describe("resolveKnockoutBracket — R32 group slots", () => {
  const groupSlots = seed.groups.flatMap((g) => [
    `1${g.letter}`,
    `2${g.letter}`,
  ]);

  test.each(groupSlots)("placeholder %s resolves from standings", (slot) => {
    const standings = computeAllStandings(generateRandomGroupResults(7));
    const third = rankThirdPlaceTeams(standings);
    const positions: Record<string, Team> = {};
    for (const s of standings) {
      positions[`1${s.letter}`] = s.first.team;
      positions[`2${s.letter}`] = s.second.team;
      positions[`3${s.letter}`] = s.third.team;
    }
    const team = resolvePlaceholder(slot, positions, {}, {});
    expect(team).not.toBeNull();
    const letter = slot.slice(1);
    const standing = standings.find((s) => s.letter === letter)!;
    const expected = slot.startsWith("1") ? standing.first.team : standing.second.team;
    expect(team!.id).toBe(expected.id);
  });
});

describe("resolveKnockoutBracket — winner cascade", () => {
  test.each(Array.from({ length: 30 }, (_, i) => i))(
    "scenario %i: full home-pick chain yields final champion",
    (seedNum) => {
      const standings = computeAllStandings(generateRandomGroupResults(seedNum + 100));
      const picks = pickBracketWinners(standings, "home");
      expect(Object.keys(picks).length).toBeGreaterThan(0);

      const winners: Record<number, Team> = {};
      const losers: Record<number, Team> = {};
      const allTeams = new Map<string, Team>();
      for (const g of seed.groups) {
        for (const t of g.teams) allTeams.set(t.id, t);
      }
      for (const [num, id] of Object.entries(picks)) {
        const team = allTeams.get(id);
        if (team) winners[Number(num)] = team;
      }

      const third = rankThirdPlaceTeams(standings);
      const resolved = resolveKnockoutBracket(
        seed.knockout,
        standings,
        third.qualifyingGroups,
        winners,
        losers
      );
      const final = resolved.find((m) => m.matchNumber === 104)!;
      expect(final.winner).not.toBeNull();
      expect(final.resolvedHome?.team).toBeTruthy();
      expect(final.resolvedAway?.team).toBeTruthy();
    }
  );
});

describe("resolveKnockoutBracket — W feeders", () => {
  test.each(KNOCKOUT_NUMBERS.filter((n) => n > 73))(
    "match #%i W-feeders resolve after prior picks",
    (matchNum) => {
      const standings = computeAllStandings(generateRandomGroupResults(55));
      const picks = pickBracketWinners(standings, "away");
      const winners: Record<number, Team> = {};
      const losers: Record<number, Team> = {};
      const allTeams = new Map<string, Team>();
      for (const g of seed.groups) {
        for (const t of g.teams) allTeams.set(t.id, t);
      }
      for (const [num, id] of Object.entries(picks)) {
        const team = allTeams.get(id);
        if (team) winners[Number(num)] = team;
      }
      const third = rankThirdPlaceTeams(standings);
      const resolved = resolveKnockoutBracket(
        seed.knockout,
        standings,
        third.qualifyingGroups,
        winners,
        losers
      );
      const match = resolved.find((m) => m.matchNumber === matchNum)!;
      const template = seed.knockout.find((m) => m.matchNumber === matchNum)!;
      for (const label of [template.placeholderA, template.placeholderB]) {
        if (label.startsWith("W")) {
          const feeder = Number(label.slice(1));
          const picked = picks[feeder];
          if (picked) {
            const side =
              match.resolvedHome?.team?.id === picked
                ? match.resolvedHome?.team
                : match.resolvedAway?.team;
            expect(side?.id).toBe(picked);
          }
        }
      }
    }
  );
});

describe("resolveKnockoutBracket — R32 fully populated", () => {
  test.each(Array.from({ length: 20 }, (_, i) => i))(
    "random seed %i fills all 16 R32 matchups",
    (seedNum) => {
      const standings = computeAllStandings(generateRandomGroupResults(seedNum));
      const { stages } = resolveFullBracket(standings);
      const filled = stages.r32.filter(
        (m) => m.resolvedHome?.team && m.resolvedAway?.team
      );
      expect(filled).toHaveLength(16);
    }
  );
});

describe("getMatchesByStage", () => {
  it("preserves total match count", () => {
    const standings = computeAllStandings();
    const { resolved } = resolveFullBracket(standings);
    const stages = getMatchesByStage(resolved);
    const total =
      stages.r32.length +
      stages.r16.length +
      stages.qf.length +
      stages.sf.length +
      stages.third.length +
      stages.final.length;
    expect(total).toBe(32);
  });
});