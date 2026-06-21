import {
  findEspnMatch,
  espnScoresToResult,
  type EspnScoreboardMatch,
} from "./espn-match";
import { formatDateLabel } from "./date-label";
import type { ScheduleEntry } from "./schedule";
import type { MatchResult } from "./fifa/types";

export type DoneEntry = {
  entry: ScheduleEntry;
  espn: EspnScoreboardMatch;
};

export function getDoneEntries(
  entries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>
): DoneEntry[] {
  if (espnMatches.length === 0) return [];

  return entries
    .map((entry) => {
      const espn = findEspnMatch(entry, espnMatches, espnToLocal);
      if (!espn || espn.state !== "post") return null;
      if (espn.homeScore == null || espn.awayScore == null) return null;
      return { entry, espn };
    })
    .filter((item): item is DoneEntry => item != null)
    .sort((a, b) => new Date(b.espn.date).getTime() - new Date(a.espn.date).getTime());
}

export function groupDoneEntriesByDate(
  doneEntries: DoneEntry[]
): { label: string; entries: DoneEntry[] }[] {
  const groups: { label: string; entries: DoneEntry[] }[] = [];
  let currentLabel = "";
  let currentGroup: DoneEntry[] = [];

  for (const item of doneEntries) {
    const label = formatDateLabel(new Date(item.espn.date));
    if (label !== currentLabel) {
      if (currentGroup.length > 0) {
        groups.push({ label: currentLabel, entries: currentGroup });
      }
      currentLabel = label;
      currentGroup = [];
    }
    currentGroup.push(item);
  }

  if (currentGroup.length > 0) {
    groups.push({ label: currentLabel, entries: currentGroup });
  }

  return groups;
}

export function syncAllDone(
  doneEntries: DoneEntry[],
  espnToLocal: Record<string, string>
): Record<string, MatchResult> {
  const updates: Record<string, MatchResult> = {};
  for (const { entry, espn } of doneEntries) {
    if (entry.kind !== "group") continue;
    const result = espnScoresToResult(entry, espn, espnToLocal);
    if (result) updates[entry.id] = result;
  }
  return updates;
}
