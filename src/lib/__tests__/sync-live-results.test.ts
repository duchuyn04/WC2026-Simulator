import { describe, expect, it } from "vitest";
import { buildLiveGroupResults } from "../sync-live-results";
import type { EspnScoreboardMatch } from "../espn-match";
import type { ScheduleEntry } from "../schedule";

const groupEntry = {
  id: "400021443",
  matchNumber: 1,
  date: "2026-06-11T19:00:00Z",
  kind: "group",
  stageLabel: "Vòng bảng · Bảng A",
  groupLetter: "A",
  home: { id: "43911", code: "MEX", name: "Mexico", flagUrl: "/flags/MEX.png" },
  away: { id: "43883", code: "RSA", name: "South Africa", flagUrl: "/flags/RSA.png" },
  homePlaceholder: "A1",
  awayPlaceholder: "A2",
} as ScheduleEntry;

const espnToLocal: Record<string, string> = {
  "203": "43911",
  "467": "43883",
};

describe("buildLiveGroupResults", () => {
  it("maps finished ESPN scores to local group match results", () => {
    const espnMatches: EspnScoreboardMatch[] = [{
      id: "760415",
      date: "2026-06-11T19:00Z",
      status: "STATUS_FULL_TIME",
      state: "post",
      shortDetail: "FT",
      displayClock: "90'",
      homeId: "203",
      awayId: "467",
      homeScore: "2",
      awayScore: "0",
    }];

    const { updates, finishedCount } = buildLiveGroupResults(
      [groupEntry],
      espnMatches,
      espnToLocal,
    );

    expect(finishedCount).toBe(1);
    expect(updates["400021443"]).toEqual({ home: 2, away: 0 });
  });

  it("swaps scores when ESPN home/away are reversed vs seed", () => {
    const espnMatches: EspnScoreboardMatch[] = [{
      id: "760415",
      date: "2026-06-11T19:00Z",
      status: "STATUS_FULL_TIME",
      state: "post",
      shortDetail: "FT",
      displayClock: "90'",
      homeId: "467",
      awayId: "203",
      homeScore: "1",
      awayScore: "3",
    }];

    const { updates } = buildLiveGroupResults(
      [groupEntry],
      espnMatches,
      espnToLocal,
    );

    expect(updates["400021443"]).toEqual({ home: 3, away: 1 });
  });

  it("ignores live and scheduled matches", () => {
    const espnMatches: EspnScoreboardMatch[] = [
      {
        id: "live",
        date: "2026-06-11T19:00Z",
        status: "STATUS_FIRST_HALF",
        state: "in",
        shortDetail: "32'",
        displayClock: "32'",
        homeId: "203",
        awayId: "467",
        homeScore: "1",
        awayScore: "0",
      },
      {
        id: "scheduled",
        date: "2026-06-12T02:00Z",
        status: "STATUS_SCHEDULED",
        state: "pre",
        shortDetail: "Scheduled",
        displayClock: "0'",
        homeId: "451",
        awayId: "450",
      },
    ];

    const { updates, finishedCount } = buildLiveGroupResults(
      [groupEntry],
      espnMatches,
      espnToLocal,
    );

    expect(finishedCount).toBe(0);
    expect(updates).toEqual({});
  });

  it("skips knockout schedule entries", () => {
    const knockoutEntry = {
      ...groupEntry,
      id: "ko-1",
      kind: "knockout",
    } as ScheduleEntry;

    const espnMatches: EspnScoreboardMatch[] = [{
      id: "760415",
      date: "2026-06-11T19:00Z",
      status: "STATUS_FULL_TIME",
      state: "post",
      shortDetail: "FT",
      displayClock: "90'",
      homeId: "203",
      awayId: "467",
      homeScore: "2",
      awayScore: "0",
    }];

    const { updates, finishedCount } = buildLiveGroupResults(
      [knockoutEntry],
      espnMatches,
      espnToLocal,
    );

    expect(finishedCount).toBe(0);
    expect(updates).toEqual({});
  });
});