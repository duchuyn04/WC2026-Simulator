import { seed } from "./data";
import { calculateGroupStandings, buildStandingsFromOrder } from "./fifa/standings";
import { resolveRankModeTeams } from "./group-rank";
import type { GroupStanding, MatchResult } from "./fifa/types";

export function computeStandings(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>
): GroupStanding[] {
  return seed.groups.map((group) => {
    const manual = manualOrder[group.letter];
    if (manual) {
      const teams = resolveRankModeTeams(group, manual);
      if (teams) return buildStandingsFromOrder(group, teams);
    }
    return calculateGroupStandings(group, matchResults);
  });
}