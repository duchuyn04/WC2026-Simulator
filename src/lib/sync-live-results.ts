import { findEspnMatch, hasEspnMatchScore, type EspnScoreboardMatch } from "./espn-match";
import type { MatchResult } from "./fifa/types";
import type { ScheduleEntry } from "./schedule";

function parseEspnScore(value?: string): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function espnScoresToResult(
  entry: ScheduleEntry,
  espn: EspnScoreboardMatch,
  espnToLocal: Record<string, string>,
): MatchResult | null {
  if (!hasEspnMatchScore(espn)) return null;

  const espnHomeScore = parseEspnScore(espn.homeScore);
  const espnAwayScore = parseEspnScore(espn.awayScore);
  if (espnHomeScore === null || espnAwayScore === null) return null;

  const espnHomeLocal = espn.homeId ? espnToLocal[espn.homeId] : undefined;
  const espnAwayLocal = espn.awayId ? espnToLocal[espn.awayId] : undefined;

  if (espnHomeLocal === entry.home?.id && espnAwayLocal === entry.away?.id) {
    return { home: espnHomeScore, away: espnAwayScore };
  }
  if (espnHomeLocal === entry.away?.id && espnAwayLocal === entry.home?.id) {
    return { home: espnAwayScore, away: espnHomeScore };
  }

  if (!espn.homeId || !espn.awayId) {
    return { home: espnHomeScore, away: espnAwayScore };
  }

  return null;
}

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