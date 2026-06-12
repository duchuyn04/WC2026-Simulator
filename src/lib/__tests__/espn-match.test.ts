import { describe, expect, it } from "vitest";
import {
  findEspnMatch,
  getEspnLiveClock,
  hasEspnMatchScore,
  isEspnMatchLive,
  parseEspnScoreboard,
} from "../espn-match";
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
          status: {
            displayClock: "90'+8'",
            type: { name: "STATUS_FULL_TIME", state: "post", shortDetail: "FT" },
          },
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
      displayClock: "90'+8'",
      homeId: "203",
      awayId: "467",
      homeScore: "2",
      awayScore: "0",
    });
  });
});

describe("ESPN match state", () => {
  it("recognizes any in-progress period and returns the live minute", () => {
    const [match] = parseEspnScoreboard({
      events: [{
        id: "760414",
        date: "2026-06-12T02:00Z",
        competitions: [{
          status: {
            displayClock: "32'",
            type: {
              name: "STATUS_FIRST_HALF",
              state: "in",
              shortDetail: "32'",
            },
          },
          competitors: [
            { homeAway: "home", score: "0", team: { id: "451" } },
            { homeAway: "away", score: "0", team: { id: "450" } },
          ],
        }],
      }],
    });

    expect(isEspnMatchLive(match)).toBe(true);
    expect(hasEspnMatchScore(match)).toBe(true);
    expect(getEspnLiveClock(match)).toBe("32'");
  });

  it("does not show a score for scheduled matches", () => {
    const match = {
      id: "scheduled",
      date: "2026-06-13T01:00Z",
      status: "STATUS_SCHEDULED",
      state: "pre",
      shortDetail: "Scheduled",
      displayClock: "0'",
    } as const;

    expect(isEspnMatchLive(match)).toBe(false);
    expect(hasEspnMatchScore(match)).toBe(false);
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
      displayClock: "90'",
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
        displayClock: "0'",
        homeId: "999",
        awayId: "998",
      },
      {
        id: "760415",
        date: "2026-06-11T19:00Z",
        status: "STATUS_FULL_TIME",
        state: "post",
        shortDetail: "FT",
        displayClock: "90'",
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
