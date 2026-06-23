import { describe, expect, it } from "vitest";
import { calculateGroupStandings } from "../fifa/standings";
import type { GroupData, MatchResult, Team } from "../fifa/types";

describe("Turkey scenario", () => {
  it("cannot pass the 3rd place team if they lost H2H", () => {
    const t1: Team = { id: "T1", code: "T1", name: "Team 1", flagUrl: "" };
    const t2: Team = { id: "T2", code: "T2", name: "Team 2", flagUrl: "" };
    const t3: Team = { id: "T3", code: "T3", name: "Team 3", flagUrl: "" };
    const turkey: Team = { id: "TUR", code: "TUR", name: "Turkey", flagUrl: "" };
    
    const group: GroupData = {
      letter: "A",
      teams: [t1, t2, t3, turkey],
      matches: [
        { id: "m1", home: t1, away: t2, date: "", location: "" },
        { id: "m2", home: t3, away: turkey, date: "", location: "" },
        { id: "m3", home: t1, away: t3, date: "", location: "" },
        { id: "m4", home: t2, away: turkey, date: "", location: "" },
        { id: "m5", home: t1, away: turkey, date: "", location: "" },
        { id: "m6", home: t2, away: t3, date: "", location: "" },
      ],
    };

    const results: Record<string, MatchResult> = {
      // T1 beats T2 (T1=3, T2=0)
      m1: { home: 1, away: 0 },
      // T3 beats TURKEY (T3=3, TUR=0) -> H2H advantage for T3!
      m2: { home: 1, away: 0 },
      // T1 beats T3 (T1=6, T3=3)
      m3: { home: 1, away: 0 },
      // T2 beats TURKEY (T2=3, TUR=0)
      m4: { home: 1, away: 0 },
      // Match 5: TURKEY beats T1 10-0 (TUR=3, T1=6). Turkey has huge GD!
      m5: { home: 0, away: 10 },
      // Match 6: T2 beats T3 (T2=6, T3=3).
      m6: { home: 1, away: 0 },
    };

    // Points:
    // T1: W(m1), W(m3), L(m5) = 6 pts
    // T2: L(m1), W(m4), W(m6) = 6 pts
    // T3: W(m2), L(m3), L(m6) = 3 pts
    // TUR: L(m2), L(m4), W(m5) = 3 pts
    
    // T3 and TUR are tied on 3 pts.
    // TUR has a +8 GD (10 GF, 2 GA). T3 has a -1 GD (1 GF, 2 GA).
    // Under old rules, TUR would be 3rd.
    // Under new rules, T3 should be 3rd because T3 beat TUR (m2: 1-0).
    
    const standings = calculateGroupStandings(group, results);
    
    expect(standings.third.team.id).toBe("T3");
    expect(standings.fourth.team.id).toBe("TUR");
  });
});
