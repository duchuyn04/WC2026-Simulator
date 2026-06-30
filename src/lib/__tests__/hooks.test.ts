// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "../data";
import { ESPN_TEAM_MAP } from "../espn-mapping";
import { useSchedule } from "../hooks";
import { useSimulation } from "../store";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function resetStore() {
  mockFetch.mockReset();
  useSimulation.setState({
    matchResults: {},
    manualOrder: {},
    groupInputMode: "scores",
    thirdPlaceOrder: null,
    knockoutWinners: {},
    scheduleMockResults: {},
  });
}

function espnStandingsResponse() {
  return {
    children: seed.groups.map((group) => ({
      name: `Group ${group.letter}`,
      abbreviation: `Group ${group.letter}`,
      standings: {
        entries: group.teams.map((team, index) => ({
          team: { id: ESPN_TEAM_MAP[team.id], displayName: team.name },
          note: { rank: index + 1 },
          stats: [
            { name: "points", value: 9 - index },
            { name: "gamesPlayed", value: 3 },
            { name: "wins", value: 3 - index },
            { name: "ties", value: 0 },
            { name: "losses", value: index },
            { name: "pointDifferential", value: 3 - index },
            { name: "pointsFor", value: 3 - index },
            { name: "pointsAgainst", value: 0 },
          ],
        })),
      },
    })),
  };
}

function mockEspnApis(scoreboard = { events: [] }) {
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          url.includes("standings") ? espnStandingsResponse() : scoreboard
        ),
    })
  );
}

describe("useSchedule", () => {
  beforeEach(() => resetStore());

  it("keeps knockout placeholders until real standings load", () => {
    const { result } = renderHook(() => useSchedule());
    const match73 = result.current.find((entry) => entry.matchNumber === 73);

    expect(match73?.home).toBeNull();
    expect(match73?.away).toBeNull();
    expect(match73?.homePlaceholder).toBe("2A");
    expect(match73?.awayPlaceholder).toBe("2B");
  });

  it("resolves knockout teams from real ESPN standings", async () => {
    mockEspnApis();
    const groupA = seed.groups.find((group) => group.letter === "A")!;
    const groupB = seed.groups.find((group) => group.letter === "B")!;

    const { result } = renderHook(() => useSchedule());

    await waitFor(() => {
      const match73 = result.current.find((entry) => entry.matchNumber === 73);
      expect(match73?.home?.id).toBe(groupA.teams[1]!.id);
      expect(match73?.away?.id).toBe(groupB.teams[1]!.id);
    });
  });

  it("uses real ESPN knockout winners for later schedule rounds", async () => {
    const groupA = seed.groups.find((group) => group.letter === "A")!;
    const groupB = seed.groups.find((group) => group.letter === "B")!;
    const groupC = seed.groups.find((group) => group.letter === "C")!;
    const groupF = seed.groups.find((group) => group.letter === "F")!;
    const match73 = seed.knockout.find((match) => match.matchNumber === 73)!;
    const home = groupA.teams[1]!;
    const away = groupB.teams[1]!;

    mockEspnApis({
      events: [{
        id: "espn-73",
        date: match73.date,
        competitions: [{
          status: {
            displayClock: "120'",
            type: { name: "STATUS_FULL_TIME", state: "post", shortDetail: "FT-Pens" },
          },
          competitors: [
            { homeAway: "home", score: "1", winner: true, team: { id: ESPN_TEAM_MAP[home.id] } },
            { homeAway: "away", score: "1", winner: false, team: { id: ESPN_TEAM_MAP[away.id] } },
          ],
        }],
      }],
    });

    const { result } = renderHook(() => useSchedule());

    await waitFor(() => {
      const match90 = result.current.find((entry) => entry.matchNumber === 90);
      expect(match90?.home?.id).toBe(home.id);
      expect(match90?.away).toBeNull();
      expect(match90?.awayCandidates?.map((team) => team.id)).toEqual([
        groupF.teams[0]!.id,
        groupC.teams[1]!.id,
      ]);
    });
  });

  it("ignores simulated standings for knockout schedule", () => {
    for (const group of seed.groups.filter((g) => ["A", "B"].includes(g.letter))) {
      for (const match of group.matches) {
        useSimulation.getState().setScore(match.id, 1, 0);
      }
    }

    const { result } = renderHook(() => useSchedule());
    const match73 = result.current.find((entry) => entry.matchNumber === 73);

    expect(match73?.home).toBeNull();
    expect(match73?.away).toBeNull();
  });
});
