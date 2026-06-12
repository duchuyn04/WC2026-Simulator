import { describe, expect, it } from "vitest";
import {
  applyLiveMatchesToStandings,
  type EspnStandingGroup,
} from "../espn-standings";
import type { EspnScoreboardMatch } from "../espn-match";

function team(id: string, rank: number, points = 0) {
  return {
    espnTeamId: id,
    teamName: id,
    rank,
    points,
    gamesPlayed: points > 0 ? 1 : 0,
    wins: points === 3 ? 1 : 0,
    ties: 0,
    losses: 0,
    pointDifferential: points > 0 ? 2 : 0,
    pointsFor: points > 0 ? 2 : 0,
    pointsAgainst: 0,
    isLive: false,
  };
}

const group: EspnStandingGroup = {
  name: "Group A",
  abbreviation: "Group A",
  hasLiveMatch: false,
  teams: [
    team("mexico", 1, 3),
    team("korea", 2),
    team("czechia", 3),
    { ...team("south-africa", 4), gamesPlayed: 1, losses: 1, pointDifferential: -2, pointsAgainst: 2 },
  ],
};

function liveMatch(homeScore: string, awayScore: string): EspnScoreboardMatch {
  return {
    id: "live",
    date: "2026-06-12T02:00Z",
    status: "STATUS_FIRST_HALF",
    state: "in",
    shortDetail: "35'",
    displayClock: "35'",
    homeId: "korea",
    awayId: "czechia",
    homeScore,
    awayScore,
  };
}

describe("applyLiveMatchesToStandings", () => {
  it("awards one provisional point to both teams during a draw", () => {
    const [result] = applyLiveMatchesToStandings([group], [liveMatch("0", "0")]);
    const korea = result.teams.find((item) => item.espnTeamId === "korea");
    const czechia = result.teams.find((item) => item.espnTeamId === "czechia");

    expect(korea).toMatchObject({ gamesPlayed: 1, ties: 1, points: 1, isLive: true });
    expect(czechia).toMatchObject({ gamesPlayed: 1, ties: 1, points: 1, isLive: true });
    expect(result.hasLiveMatch).toBe(true);
  });

  it("awards three provisional points and updates goal difference", () => {
    const [result] = applyLiveMatchesToStandings([group], [liveMatch("2", "1")]);
    const korea = result.teams.find((item) => item.espnTeamId === "korea");
    const czechia = result.teams.find((item) => item.espnTeamId === "czechia");

    expect(korea).toMatchObject({
      gamesPlayed: 1,
      wins: 1,
      points: 3,
      pointsFor: 2,
      pointsAgainst: 1,
      pointDifferential: 1,
    });
    expect(czechia).toMatchObject({
      gamesPlayed: 1,
      losses: 1,
      points: 0,
      pointDifferential: -1,
    });
  });

  it("ignores completed and scheduled matches", () => {
    const completed = { ...liveMatch("2", "1"), state: "post" as const };
    const scheduled = { ...liveMatch("0", "0"), state: "pre" as const };
    const [result] = applyLiveMatchesToStandings([group], [completed, scheduled]);

    expect(result.teams.find((item) => item.espnTeamId === "korea")).toMatchObject({
      gamesPlayed: 0,
      points: 0,
      isLive: false,
    });
    expect(result.hasLiveMatch).toBe(false);
  });
});
