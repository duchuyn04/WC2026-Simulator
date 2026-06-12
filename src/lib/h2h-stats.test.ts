import { expect, test } from "vitest";
import { getH2HStats } from "./h2h-stats";

test("getH2HStats returns correct stats", () => {
  const matches = [
    { HomeTeam: { IdTeam: "A" }, AwayTeam: { IdTeam: "B" }, HomeTeamScore: 2, AwayTeamScore: 1 },
    { HomeTeam: { IdTeam: "B" }, AwayTeam: { IdTeam: "A" }, HomeTeamScore: 0, AwayTeamScore: 0 },
    { HomeTeam: { IdTeam: "C" }, AwayTeam: { IdTeam: "A" }, HomeTeamScore: 1, AwayTeamScore: 3 },
  ];

  const result = getH2HStats(matches, "A", "B");
  expect(result).toEqual({ total: 2, winsA: 1, draws: 1, winsB: 0 });
});
