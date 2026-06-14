import { describe, it, expect } from "vitest";
import {
  buildScheduleEntries,
  filterScheduleEntries,
  groupScheduleByDate,
  sortScheduleEntries,
  stageLabel,
} from "../schedule";
import { seed } from "../data";
import type { ResolvedKnockoutMatch } from "../fifa/types";

describe("stageLabel", () => {
  it("maps group stage with letter", () => {
    expect(stageLabel("First Stage", "A")).toBe("Vòng bảng · Bảng A");
  });

  it("maps knockout stages", () => {
    expect(stageLabel("Final")).toBe("Chung kết");
    expect(stageLabel("Round of 32")).toBe("Vòng 32");
  });
});

describe("buildScheduleEntries", () => {
  it("merges group and knockout matches", () => {
    const knockout = seed.knockout.slice(0, 2).map((match) => ({
      ...match,
      resolvedHome: null,
      resolvedAway: null,
      winner: null,
    })) as ResolvedKnockoutMatch[];

    const entries = buildScheduleEntries({}, knockout);
    expect(entries).toHaveLength(seed.groups.length * 6 + 2);
  });

  it("sorts chronologically then by match number", () => {
    const entries = buildScheduleEntries({}, []);
    const sorted = sortScheduleEntries(entries);
    expect(sorted[0]?.matchNumber).toBe(1);

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevTime = prev.date ? new Date(prev.date).getTime() : Infinity;
      const currTime = curr.date ? new Date(curr.date).getTime() : Infinity;
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
      if (prevTime === currTime) {
        expect(curr.matchNumber).toBeGreaterThanOrEqual(prev.matchNumber);
      }
    }
  });
});

describe("filterScheduleEntries", () => {
  const entries = buildScheduleEntries({ [seed.groups[0]!.matches[0]!.id]: { home: 1, away: 0 } }, []);

  it("filters group matches", () => {
    const groupOnly = filterScheduleEntries(entries, "group");
    expect(groupOnly.every((entry) => entry.kind === "group")).toBe(true);
    expect(groupOnly.some((entry) => entry.result?.home === 1)).toBe(true);
  });

  it("filters knockout matches", () => {
    const knockoutOnly = filterScheduleEntries(entries, "knockout");
    expect(knockoutOnly).toHaveLength(0);
  });
});

describe("groupScheduleByDate", () => {
  it("groups entries by calendar day", () => {
    const entries = buildScheduleEntries({}, []);
    const groups = groupScheduleByDate(entries);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]?.entries.length).toBeGreaterThan(0);
    expect(groups[0]?.dateLabel).toBeTruthy();
  });
});

describe("matchday calculation", () => {
  it("maps group matches to correct matchday", () => {
    const entries = buildScheduleEntries({}, []);
    const groupAEntries = entries.filter((e) => e.kind === "group" && e.groupLetter === "A");
    
    const sortedA = [...groupAEntries].sort((a, b) => a.matchNumber - b.matchNumber);
    
    expect(sortedA[0]?.matchday).toBe(1);
    expect(sortedA[1]?.matchday).toBe(1);
    expect(sortedA[2]?.matchday).toBe(2);
    expect(sortedA[3]?.matchday).toBe(2);
    expect(sortedA[4]?.matchday).toBe(3);
    expect(sortedA[5]?.matchday).toBe(3);
  });
});