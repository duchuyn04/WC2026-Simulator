import { describe, it, expect } from "vitest";
import { getPodiumFromMatches } from "../podium";
import type { ResolvedKnockoutMatch, Team } from "../types";

const team = (id: string, code: string, name: string): Team => ({
  id,
  code,
  name,
  flagUrl: `/flags/${code}.png`,
});

function match(
  num: number,
  home: Team,
  away: Team,
  winner: Team | null
): ResolvedKnockoutMatch {
  return {
    id: String(num),
    matchNumber: num,
    stage: num === 104 ? "Final" : "Play-off for third place",
    placeholderA: "A",
    placeholderB: "B",
    home: null,
    away: null,
    resolvedHome: { team: home, label: "A" },
    resolvedAway: { team: away, label: "B" },
    winner,
  };
}

describe("getPodiumFromMatches", () => {
  it("returns empty podium when no picks", () => {
    const matches = new Map<number, ResolvedKnockoutMatch>();
    const podium = getPodiumFromMatches(matches);
    expect(podium.champion).toBeNull();
    expect(podium.runnerUp).toBeNull();
    expect(podium.bronze).toBeNull();
  });

  it("returns bronze only when third place picked", () => {
    const bel = team("3", "BEL", "Belgium");
    const jpn = team("4", "JPN", "Japan");
    const matches = new Map<number, ResolvedKnockoutMatch>([
      [103, match(103, bel, jpn, bel)],
    ]);
    const podium = getPodiumFromMatches(matches);
    expect(podium.bronze?.code).toBe("BEL");
    expect(podium.champion).toBeNull();
  });

  it("runner-up is the losing finalist", () => {
    const fra = team("1", "FRA", "France");
    const por = team("2", "POR", "Portugal");
    const matches = new Map<number, ResolvedKnockoutMatch>([
      [104, match(104, fra, por, por)],
    ]);
    const podium = getPodiumFromMatches(matches);
    expect(podium.champion?.code).toBe("POR");
    expect(podium.runnerUp?.code).toBe("FRA");
  });

  it("returns champion, runner-up and bronze", () => {
    const fra = team("1", "FRA", "France");
    const por = team("2", "POR", "Portugal");
    const bel = team("3", "BEL", "Belgium");

    const matches = new Map<number, ResolvedKnockoutMatch>([
      [104, match(104, fra, por, fra)],
      [103, match(103, bel, team("4", "JPN", "Japan"), bel)],
    ]);

    const podium = getPodiumFromMatches(matches);
    expect(podium.champion?.code).toBe("FRA");
    expect(podium.runnerUp?.code).toBe("POR");
    expect(podium.bronze?.code).toBe("BEL");
  });
});