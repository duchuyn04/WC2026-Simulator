import { describe, expect, it } from "vitest";
import {
  categorizeLiveEntry,
  findEspnMatch,
  getEspnLiveClock,
  hasEspnMatchScore,
  hasProbablyEnded,
  isEspnMatchLive,
  parseEspnScoreboard,
} from "../espn-match";
import type { EspnScoreboardMatch } from "../espn-match";
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
      cards: [],
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

describe("hasProbablyEnded", () => {
  const NOW = new Date("2026-06-15T15:00:00Z").getTime();

  it("returns false for a kickoff under 3h ago", () => {
    const kickoff = new Date("2026-06-15T12:30:00Z"); // 2.5h trước NOW
    expect(hasProbablyEnded(kickoff, NOW)).toBe(false);
  });

  it("returns true for a kickoff over 3h ago", () => {
    const kickoff = new Date("2026-06-15T11:00:00Z"); // 4h trước NOW
    expect(hasProbablyEnded(kickoff, NOW)).toBe(true);
  });

  it("defaults to Date.now() when now omitted", () => {
    const recentKickoff = new Date(Date.now() - 60 * 60 * 1000); // 1h trước
    expect(hasProbablyEnded(recentKickoff)).toBe(false);
  });

  it("returns false for a kickoff in the future", () => {
    const future = new Date(NOW + 60 * 60 * 1000);
    expect(hasProbablyEnded(future, NOW)).toBe(false);
  });
});

describe("categorizeLiveEntry", () => {
  const NOW = new Date("2026-06-15T15:00:00Z").getTime();

  function liveMatch(overrides: Partial<EspnScoreboardMatch> = {}): EspnScoreboardMatch {
    return {
      id: "m1",
      date: "2026-06-15T13:00Z",
      status: "STATUS_SECOND_HALF",
      state: "in",
      shortDetail: "72'",
      displayClock: "72'",
      ...overrides,
    };
  }

  it("categorizes an in-progress match as 'live'", () => {
    const eventDate = new Date("2026-06-15T13:00:00Z");
    expect(
      categorizeLiveEntry({ eventDate, espnMatch: liveMatch(), espnLoaded: true, now: NOW })
    ).toBe("live");
  });

  // Regression: bug B — trận đang đá hiệp phụ (>3h) nhưng ESPN lag/quên match.
  // Trước đây hasProbablyEnded loại bỏ → trận biến mất khỏi UI.
  it("keeps an extra-time match 'live' even if kickoff was >3h ago", () => {
    const kickoff = new Date("2026-06-15T11:30:00Z"); // 3.5h trước NOW
    // ESPN vẫn báo state="in" ở phút 110 (hiệp phụ)
    const etMatch = liveMatch({ displayClock: "110'", shortDetail: "110'" });
    expect(
      categorizeLiveEntry({ eventDate: kickoff, espnMatch: etMatch, espnLoaded: true, now: NOW })
    ).toBe("live");
  });

  it("categorizes a finished match (state=post) as 'none' when ESPN is loaded", () => {
    const eventDate = new Date("2026-06-15T12:00:00Z"); // hôm nay
    const postMatch = liveMatch({ state: "post", status: "STATUS_FULL_TIME", shortDetail: "FT" });
    expect(
      categorizeLiveEntry({ eventDate, espnMatch: postMatch, espnLoaded: true, now: NOW })
    ).toBe("none");
  });

  it("categorizes a pre-match (state=pre) within 2 days as 'upcoming' when ESPN loaded", () => {
    const eventDate = new Date("2026-06-15T20:00:00Z"); // hôm nay, chưa đá
    const preMatch = liveMatch({ state: "pre", status: "STATUS_SCHEDULED", displayClock: "0'" });
    expect(
      categorizeLiveEntry({ eventDate, espnMatch: preMatch, espnLoaded: true, now: NOW })
    ).toBe("upcoming");
  });

  it("categorizes a match not in ESPN schedule (loaded) as 'upcoming' if within 2 days", () => {
    const eventDate = new Date("2026-06-15T20:00:00Z"); // hôm nay, ESPN không có data cho match này
    expect(
      categorizeLiveEntry({ eventDate, espnMatch: undefined, espnLoaded: true, now: NOW })
    ).toBe("upcoming");
  });

  it("falls back to heuristic when ESPN has NOT loaded: upcoming if <3h since kickoff", () => {
    const kickoff = new Date("2026-06-15T13:00:00Z"); // 2h trước NOW
    expect(
      categorizeLiveEntry({ eventDate: kickoff, espnMatch: undefined, espnLoaded: false, now: NOW })
    ).toBe("upcoming");
  });

  it("falls back to heuristic when ESPN has NOT loaded: 'none' if >3h since kickoff", () => {
    const kickoff = new Date("2026-06-15T11:00:00Z"); // 4h trước NOW
    expect(
      categorizeLiveEntry({ eventDate: kickoff, espnMatch: undefined, espnLoaded: false, now: NOW })
    ).toBe("none");
  });

  it("returns 'none' for a match outside the 2-day window", () => {
    const future = new Date("2026-06-20T13:00:00Z"); // 5 ngày sau
    expect(
      categorizeLiveEntry({ eventDate: future, espnMatch: undefined, espnLoaded: false, now: NOW })
    ).toBe("none");
  });

  it("returns 'none' for an invalid date", () => {
    expect(
      categorizeLiveEntry({
        eventDate: new Date("invalid"),
        espnMatch: undefined,
        espnLoaded: false,
      })
    ).toBe("none");
  });

  it("returns 'none' when ESPN loaded but halftime (not live, not pre)", () => {
    const eventDate = new Date("2026-06-15T13:00:00Z"); // hôm nay
    const htMatch = liveMatch({
      state: "in",
      status: "STATUS_HALFTIME",
      shortDetail: "HT",
      displayClock: "45:00",
    });
    expect(
      categorizeLiveEntry({ eventDate, espnMatch: htMatch, espnLoaded: true, now: NOW })
    ).toBe("none");
  });
});

