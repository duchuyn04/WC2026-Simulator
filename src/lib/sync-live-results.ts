import { findEspnMatch, espnScoresToResult, ESPN_SUMMARY_URL, type EspnScoreboardMatch, type EspnCardEvent } from "./espn-match";
import type { FairPlayData, MatchResult } from "./fifa/types";
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

type EspnSummaryDetail = {
  team?: { id?: string };
  type?: { text?: string; type?: string };
};

type EspnKeyEvent = {
  team?: { id?: string };
  type?: { text?: string; type?: string };
};

type EspnBoxscoreTeamStat = {
  name: string;
  displayValue: string;
};

type EspnBoxscoreTeam = {
  team?: { id?: string };
  statistics?: EspnBoxscoreTeamStat[];
};

type EspnSummaryResponse = {
  header?: {
    competitions?: Array<{
      details?: EspnSummaryDetail[];
    }>;
  };
  boxscore?: {
    teams?: EspnBoxscoreTeam[];
  };
  keyEvents?: EspnKeyEvent[];
};

export async function buildFairPlayFromEspn(
  groupEntries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>,
): Promise<Record<string, FairPlayData>> {
  // espnToLocal: { espnId → localId }
  // Build reverse: localId → espnId
  const localToEspn: Record<string, string> = {};
  for (const [espnId, localId] of Object.entries(espnToLocal)) {
    localToEspn[localId] = espnId;
  }

  const teamCards = new Map<string, { yellowCards: number; redCards: number }>();

  for (const entry of groupEntries) {
    if (entry.kind !== "group" || !entry.home || !entry.away) continue;
    const espn = findEspnMatch(entry, espnMatches, espnToLocal);
    if (!espn || espn.state !== "post") continue;

    const homeLocalId = espnToLocal[espn.homeId ?? ""] ?? entry.home.id;
    const awayLocalId = espnToLocal[espn.awayId ?? ""] ?? entry.away.id;

    for (const card of espn.cards ?? []) {
      const homeEspn = localToEspn[homeLocalId];
      const awayEspn = localToEspn[awayLocalId];

      const localId =
        card.teamId === homeEspn
          ? homeLocalId
          : card.teamId === awayEspn
            ? awayLocalId
            : null;

      if (!localId) continue;

      const existing = teamCards.get(localId) ?? { yellowCards: 0, redCards: 0 };
      if (card.type === "yellow-card") existing.yellowCards += 1;
      else if (card.type === "red-card") existing.redCards += 1;
      teamCards.set(localId, existing);
    }
  }

  // Convert to FairPlayData record
  const result: Record<string, FairPlayData> = {};
  for (const [teamId, cards] of teamCards) {
    result[teamId] = { yellowCards: cards.yellowCards, redCards: cards.redCards };
  }
  return result;
}
