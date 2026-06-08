import { seed } from "../data";
import { resolveKnockoutBracket } from "./bracket";
import { computeStandings } from "../compute-standings";
import { rankThirdPlaceTeams } from "./third-place";
import type { GroupStanding, KnockoutMatch, MatchResult, Team } from "./types";

export function getDependentKnockoutMatches(
  matchNumber: number,
  knockoutMatches: KnockoutMatch[] = seed.knockout
) {
  const invalidated = new Set([matchNumber]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const match of knockoutMatches) {
      if (invalidated.has(match.matchNumber)) continue;
      const dependsOnInvalidated = [match.placeholderA, match.placeholderB].some((label) => {
        const feeder = label.match(/^(?:W|L|RU)(\d+)$/);
        return feeder ? invalidated.has(Number(feeder[1])) : false;
      });
      if (dependsOnInvalidated) {
        invalidated.add(match.matchNumber);
        changed = true;
      }
    }
  }

  invalidated.delete(matchNumber);
  return invalidated;
}

export function pruneKnockoutWinners(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>,
  knockoutWinners: Record<number, string>,
  thirdPlaceOrder?: string[] | null
): { winners: Record<number, string>; removedCount: number } {
  if (Object.keys(knockoutWinners).length === 0) {
    return { winners: {}, removedCount: 0 };
  }

  const standings = computeStandings(matchResults, manualOrder);
  const third = rankThirdPlaceTeams(standings, thirdPlaceOrder);
  const allTeams = new Map<string, Team>();
  for (const g of seed.groups) {
    for (const t of g.teams) allTeams.set(t.id, t);
  }

  let current = { ...knockoutWinners };
  let removedCount = 0;
  let changed = true;

  while (changed) {
    changed = false;
    const winners: Record<number, Team> = {};
    for (const [num, teamId] of Object.entries(current)) {
      const team = allTeams.get(teamId);
      if (team) winners[Number(num)] = team;
    }

    const resolved = resolveKnockoutBracket(
      seed.knockout,
      standings,
      third.qualifyingGroups,
      winners,
      {}
    );
    const resolvedMap = new Map(resolved.map((m) => [m.matchNumber, m]));

    for (const matchNumStr of Object.keys(current)) {
      const matchNum = Number(matchNumStr);
      const teamId = current[matchNum];
      const match = resolvedMap.get(matchNum);
      const homeId = match?.resolvedHome?.team?.id;
      const awayId = match?.resolvedAway?.team?.id;
      const invalid =
        !homeId ||
        !awayId ||
        (teamId !== homeId && teamId !== awayId);

      if (!invalid) continue;

      delete current[matchNum];
      removedCount++;
      changed = true;
      for (const dep of getDependentKnockoutMatches(matchNum)) {
        if (current[dep] !== undefined) {
          delete current[dep];
          removedCount++;
        }
      }
    }
  }

  return { winners: current, removedCount };
}