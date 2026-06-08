import annexData from "../../../data/third-place-combinations.json";
import type { GroupStanding, TeamStats } from "./types";

function compareThirdPlace(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return a.fifaRanking - b.fifaRanking;
}

export function rankThirdPlaceTeams(standings: GroupStanding[]) {
  const thirds = standings.map((s) => ({
    ...s.third,
    group: s.letter,
  }));

  const sorted = [...thirds].sort(compareThirdPlace);
  const qualified = sorted.slice(0, 8);
  const eliminated = sorted.slice(8);

  const qualifyingGroups = qualified
    .map((t) => t.group)
    .sort()
    .join(",");

  return { qualified, eliminated, qualifyingGroups };
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