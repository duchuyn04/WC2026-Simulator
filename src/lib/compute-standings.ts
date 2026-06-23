import { seed } from "./data";
import { calculateGroupStandings, buildStandingsFromOrder } from "./fifa/standings";
import { resolveRankModeTeams } from "./group-rank";
import { calculateFairPlayScore } from "./fair-play";
import type { FairPlayData, GroupStanding, MatchResult } from "./fifa/types";

function toFairPlayOverrides(fairPlayData: Record<string, FairPlayData>): Record<string, number> {
  const overrides: Record<string, number> = {};
  for (const [teamId, data] of Object.entries(fairPlayData)) {
    overrides[teamId] = calculateFairPlayScore(data);
  }
  return overrides;
}

export function computeStandings(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>,
  fairPlayData: Record<string, FairPlayData> = {},
): GroupStanding[] {
  const fairPlayOverrides = toFairPlayOverrides(fairPlayData);
  return seed.groups.map((group) => {
    const manual = manualOrder[group.letter];
    if (manual) {
      const teams = resolveRankModeTeams(group, manual);
      if (teams) return buildStandingsFromOrder(group, teams, fairPlayOverrides);
    }
    return calculateGroupStandings(group, matchResults, fairPlayOverrides);
  });
}
