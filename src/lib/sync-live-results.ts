import { findEspnMatch, espnScoresToResult, type EspnScoreboardMatch } from "./espn-match";
import type { MatchResult } from "./fifa/types";
import type { ScheduleEntry } from "./schedule";

export function buildLiveGroupResults(
  groupEntries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>,
): { updates: Record<string, MatchResult>; finishedCount: number; liveCount: number } {
  const updates: Record<string, MatchResult> = {};
  let finishedCount = 0;
  let liveCount = 0;

  for (const entry of groupEntries) {
    if (entry.kind !== "group") continue;

    const espn = findEspnMatch(entry, espnMatches, espnToLocal);
    if (!espn) continue;

    const result = espnScoresToResult(entry, espn, espnToLocal);
    if (!result) continue;

    updates[entry.id] = result;
    if (espn.state === "post") {
      finishedCount += 1;
    } else if (espn.state === "in") {
      liveCount += 1;
    }
  }

  return { updates, finishedCount, liveCount };
}