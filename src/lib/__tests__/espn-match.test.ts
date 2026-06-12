import { describe, expect, it } from "vitest";
import { findEspnMatch, parseEspnScoreboard } from "../espn-match";
import type { ScheduleEntry } from "../schedule";

const entry = {
  id: "local-1",
  matchNumber: 1,
  date: "2026-06-11T19:00:00Z",
  kind: "group",
  stageLabel: "Group A",
  home: { id: "mexico", name: "Mexico", code: "MEX" },
  away: { id: "south-africa", name: "South Africa", code: "RSA" },
  homePlaceholder: "Mexico",
  awayPlaceholder: "South Africa",
} as ScheduleEntry;

describe("parseEspnScoreboard", () => {
  it("normalizes ESPN events", () => {
    const matches = parseEspnScoreboard({
      events: [{
        id: "760415",
        date: "2026-06-11T19:00Z",
        competitions: [{
          status: { type: { name: "STATUS_FULL_TIME", state: "post", shortDetail: "FT" } },
          competitors: [
            { homeAway: "home", score: "2", team: { id: "203" } },
            { homeAway: "away", score: "0", team: { id: "467" } },
          ],
        }],
      }],
    });

    expect(matches[0]).toEqual({
      id: "760415",
      date: "2026-06-11T19:00Z",
      status: "STATUS_FULL_TIME",
      state: "post",
      shortDetail: "FT",
      homeId: "203",
      awayId: "467",
      homeScore: "2",
      awayScore: "0",
    });
  });
});

describe("findEspnMatch", () => {
  it("matches a unique kickoff time", () => {
    const match = findEspnMatch(entry, [{
      id: "760415",
      date: "2026-06-11T19:00Z",
      status: "STATUS_FULL_TIME",
      state: "post",
      shortDetail: "FT",
    }], {});

    expect(match?.id).toBe("760415");
  });

  it("uses the team pair when multiple matches share a kickoff", () => {
    const match = findEspnMatch(entry, [
      {
        id: "wrong",
        date: "2026-06-11T19:00Z",
        status: "STATUS_SCHEDULED",
        state: "pre",
        shortDetail: "Scheduled",
        homeId: "999",
        awayId: "998",
      },
      {
        id: "760415",
        date: "2026-06-11T19:00Z",
        status: "STATUS_FULL_TIME",
        state: "post",
        shortDetail: "FT",
        homeId: "203",
        awayId: "467",
      },
    ], {
      "203": "mexico",
      "467": "south-africa",
      "998": "other-away",
      "999": "other-home",
    });

    expect(match?.id).toBe("760415");
  });
});
