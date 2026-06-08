import annexData from "../../../data/third-place-combinations.json";
import type { GroupStanding, TeamStats } from "./types";

export type ThirdPlaceTeam = TeamStats & { group: string };

function compareThirdPlace(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return a.fifaRanking - b.fifaRanking;
}

export function getThirdPlaceTeams(standings: GroupStanding[]): ThirdPlaceTeam[] {
  return standings.map((s) => ({ ...s.third, group: s.letter }));
}

export function orderThirdPlaceTeams(
  thirds: ThirdPlaceTeam[],
  manualOrder: string[]
): ThirdPlaceTeam[] {
  const map = new Map(thirds.map((team) => [team.team.id, team]));
  const ordered: ThirdPlaceTeam[] = [];

  for (const id of manualOrder) {
    const team = map.get(id);
    if (team) ordered.push(team);
  }

  for (const team of thirds) {
    if (!manualOrder.includes(team.team.id)) ordered.push(team);
  }

  return ordered;
}

export function buildThirdPlaceResult(sorted: ThirdPlaceTeam[]) {
  const qualified = sorted.slice(0, 8);
  const eliminated = sorted.slice(8);
  const qualifyingGroups = qualified
    .map((t) => t.group)
    .sort()
    .join(",");

  return { ranked: sorted, qualified, eliminated, qualifyingGroups };
}

export function rankThirdPlaceTeams(
  standings: GroupStanding[],
  manualOrder?: string[] | null
) {
  const thirds = getThirdPlaceTeams(standings);
  const sorted =
    manualOrder && manualOrder.length > 0
      ? orderThirdPlaceTeams(thirds, manualOrder)
      : [...thirds].sort(compareThirdPlace);

  return buildThirdPlaceResult(sorted);
}

export function seedThirdPlaceOrder(standings: GroupStanding[]): string[] {
  const result = rankThirdPlaceTeams(standings);
  return result.ranked.map((team) => team.team.id);
}

export function resolveThirdPlaceSlot(
  qualifyingGroups: string,
  slotKey: string
): string | null {
  const combo = annexData.combinations[qualifyingGroups as keyof typeof annexData.combinations];
  if (!combo) return null;
  return combo[slotKey as keyof typeof combo] ?? null;
}

export function getThirdPlaceMapping(qualifyingGroups: string) {
  const combo = annexData.combinations[qualifyingGroups as keyof typeof annexData.combinations];
  if (!combo) return null;
  return combo;
}