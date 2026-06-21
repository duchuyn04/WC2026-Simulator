import { describe, it, expect } from "vitest";
import { getDoneEntries, syncAllDone, groupDoneEntriesByDate } from "../recent-matches";
import type { ScheduleEntry } from "../schedule";
import type { EspnScoreboardMatch } from "../espn-match";

const espnToLocal: Record<string, string> = {
  "203": "43911",
  "467": "43883",
};

const groupEntry: ScheduleEntry = {
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
};

const knockoutEntry: ScheduleEntry = {
  ...groupEntry,
  id: "ko-1",
  kind: "knockout",
  stageLabel: "Vòng 32",
};

const finishedEspn: EspnScoreboardMatch = {
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
};

describe("getDoneEntries", () => {
  it("returns finished matches sorted newest first", () => {
    const older: EspnScoreboardMatch = {
      ...finishedEspn,
      id: "older",
      date: "2026-06-10T19:00Z",
    };
    const olderEntry: ScheduleEntry = {
      ...groupEntry,
      id: "older-entry",
      date: "2026-06-10T19:00:00Z",
    };
    const done = getDoneEntries([groupEntry, olderEntry], [finishedEspn, older], espnToLocal);
    expect(done).toHaveLength(2);
    expect(done[0].espn.id).toBe("760415");
    expect(done[1].espn.id).toBe("older");
  });

  it("ignores live and scheduled matches", () => {
    const live: EspnScoreboardMatch = { ...finishedEspn, id: "live", state: "in" };
    const pre: EspnScoreboardMatch = { ...finishedEspn, id: "pre", state: "pre" };
    const done = getDoneEntries([groupEntry], [live, pre], espnToLocal);
    expect(done).toHaveLength(0);
  });

  it("ignores finished matches without scores", () => {
    const noScore: EspnScoreboardMatch = {
      ...finishedEspn,
      homeScore: undefined,
      awayScore: undefined,
    };
    const done = getDoneEntries([groupEntry], [noScore], espnToLocal);
    expect(done).toHaveLength(0);
  });

  it("returns empty array when espnMatches is empty", () => {
    const done = getDoneEntries([groupEntry], [], espnToLocal);
    expect(done).toHaveLength(0);
  });
});

describe("groupDoneEntriesByDate", () => {
  it("groups by formatted date label", () => {
    const done = getDoneEntries([groupEntry], [finishedEspn], espnToLocal);
    const groups = groupDoneEntriesByDate(done);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
  });
});

describe("syncAllDone", () => {
  it("returns updates only for group matches", () => {
    const done = getDoneEntries([groupEntry, knockoutEntry], [finishedEspn], espnToLocal);
    const updates = syncAllDone(done, espnToLocal);
    expect(updates["400021443"]).toEqual({ home: 2, away: 0 });
    expect(updates["ko-1"]).toBeUndefined();
  });

  it("returns empty object when no done entries", () => {
    const updates = syncAllDone([], espnToLocal);
    expect(updates).toEqual({});
  });
});
