import { expect, test } from "vitest";
import { getH2HStats } from "./h2h-stats";

test("getH2HStats returns correct stats", () => {
  const matches = [
    { Home: { IdTeam: "A" }, Away: { IdTeam: "B" }, HomeTeamScore: 2, AwayTeamScore: 1 },
    { Home: { IdTeam: "B" }, Away: { IdTeam: "A" }, HomeTeamScore: 0, AwayTeamScore: 0 },
    { Home: { IdTeam: "C" }, Away: { IdTeam: "A" }, HomeTeamScore: 1, AwayTeamScore: 3 },
  ];

  const result = getH2HStats(matches, "A", "B");
  expect(result).toEqual({ total: 2, winsA: 1, draws: 1, winsB: 0 });
});

test("getH2HStats ignores unplayed matches", () => {
  const matches = [
    { Home: { IdTeam: "A" }, Away: { IdTeam: "B" }, HomeTeamScore: null, AwayTeamScore: null },
    { Home: { IdTeam: "B" }, Away: { IdTeam: "A" } },
    { Home: { IdTeam: "A" }, Away: { IdTeam: "B" }, HomeTeamScore: "", AwayTeamScore: "" },
    { Home: { IdTeam: "B" }, Away: { IdTeam: "A" }, HomeTeamScore: "N/A", AwayTeamScore: "N/A" },
  ];

  const result = getH2HStats(matches, "A", "B");
  expect(result).toEqual({ total: 0, winsA: 0, draws: 0, winsB: 0 });
});
