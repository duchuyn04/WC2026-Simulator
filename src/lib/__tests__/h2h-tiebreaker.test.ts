import { describe, expect, it } from "vitest";
import { calculateGroupStandings } from "../fifa/standings";
import type { GroupData, MatchResult, Team } from "../fifa/types";

describe("H2H tiebreaker", () => {
  it("prioritizes head-to-head points before overall GD", () => {
    const t1: Team = { id: "T1", code: "T1", name: "Team 1", flagUrl: "" };
    const t2: Team = { id: "T2", code: "T2", name: "Team 2", flagUrl: "" };
    const t3: Team = { id: "T3", code: "T3", name: "Team 3", flagUrl: "" };
    const t4: Team = { id: "T4", code: "T4", name: "Team 4", flagUrl: "" };
    
    const group: GroupData = {
      letter: "A",
      teams: [t1, t2, t3, t4],
      matches: [
        { id: "m1", home: t1, away: t2, date: "", location: "" },
        { id: "m2", home: t3, away: t4, date: "", location: "" },
        { id: "m3", home: t1, away: t3, date: "", location: "" },
        { id: "m4", home: t2, away: t4, date: "", location: "" },
        { id: "m5", home: t1, away: t4, date: "", location: "" },
        { id: "m6", home: t2, away: t3, date: "", location: "" },
      ],
    };

    const results: Record<string, MatchResult> = {
      m1: { home: 1, away: 0 },
      m2: { home: 10, away: 0 },
      m3: { home: 1, away: 0 },
      m4: { home: 0, away: 1 },
      m5: { home: 0, away: 1 },
      m6: { home: 0, away: 1 },
    };

    const standings = calculateGroupStandings(group, results);
    
    expect(standings.first.team.id).toBe("T1");
    expect(standings.second.team.id).toBe("T3");
  });
});
