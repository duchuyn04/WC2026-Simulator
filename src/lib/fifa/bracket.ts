import annexData from "../../../data/third-place-combinations.json";
import type { GroupStanding, KnockoutMatch, ResolvedKnockoutMatch, Team } from "./types";
import { getThirdPlaceMapping } from "./third-place";

type PositionMap = Record<string, Team>;

const COMPOSITE_THIRD = new Map(
  Object.entries(annexData.matchSlots).map(([slot, { placeholder }]) => [placeholder, slot])
);

function buildPositionMap(standings: GroupStanding[], qualifyingGroups: string): PositionMap {
  const map: PositionMap = {};
  for (const s of standings) {
    map[`1${s.letter}`] = s.first.team;
    map[`2${s.letter}`] = s.second.team;
    map[`3${s.letter}`] = s.third.team;
    map[`4${s.letter}`] = s.fourth.team;
  }

  const thirdMapping = getThirdPlaceMapping(qualifyingGroups);
  if (thirdMapping) {
    for (const [slotKey, thirdLabel] of Object.entries(thirdMapping)) {
      const groupLetter = thirdLabel.replace("3", "");
      const team = map[`3${groupLetter}`];
      const composite = annexData.matchSlots[slotKey as keyof typeof annexData.matchSlots]?.placeholder;
      if (team && composite) map[composite] = team;
    }
  }

  return map;
}

export function resolvePlaceholder(
  label: string,
  positions: PositionMap,
  winners: Record<number, Team>,
  losers: Record<number, Team>
): Team | null {
  if (!label) return null;

  const winMatch = label.match(/^W(\d+)$/);
  if (winMatch) return winners[Number(winMatch[1])] ?? null;

  const loseMatch = label.match(/^RU(\d+)$/);
  if (loseMatch) return losers[Number(loseMatch[1])] ?? null;

  const loseMatch2 = label.match(/^L(\d+)$/);
  if (loseMatch2) return losers[Number(loseMatch2[1])] ?? null;

  if (positions[label]) return positions[label];

  if (label.startsWith("3") && label.length > 2) {
    const slotKey = COMPOSITE_THIRD.get(label);
    if (slotKey) {
      const composite = annexData.matchSlots[slotKey as keyof typeof annexData.matchSlots]?.placeholder;
      if (composite && positions[composite]) return positions[composite];
    }
  }

  return null;
}

export function resolveKnockoutBracket(
  knockoutMatches: KnockoutMatch[],
  standings: GroupStanding[],
  qualifyingGroups: string,
  winners: Record<number, Team>,
  losers: Record<number, Team>
): ResolvedKnockoutMatch[] {
  const positions = buildPositionMap(standings, qualifyingGroups);
  const winMap = { ...winners };

  const sorted = [...knockoutMatches].sort((a, b) => a.matchNumber - b.matchNumber);
  const resolved: ResolvedKnockoutMatch[] = [];

  for (const m of sorted) {
    const homeTeam = resolvePlaceholder(m.placeholderA, positions, winMap, losers);
    const awayTeam = resolvePlaceholder(m.placeholderB, positions, winMap, losers);

    let winner: Team | null = null;
    if (winMap[m.matchNumber]) {
      winner = winMap[m.matchNumber];
    }

    if (winner && homeTeam && awayTeam) {
      if (winner.id === homeTeam.id) {
        losers[m.matchNumber] = awayTeam;
      } else {
        losers[m.matchNumber] = homeTeam;
      }
    }

    resolved.push({
      ...m,
      resolvedHome: homeTeam ? { team: homeTeam, label: m.placeholderA } : null,
      resolvedAway: awayTeam ? { team: awayTeam, label: m.placeholderB } : null,
      winner,
    });
  }

  return resolved;
}

export function getMatchesByStage(matches: ResolvedKnockoutMatch[]) {
  return {
    r32: matches.filter((m) => m.stage === "Round of 32"),
    r16: matches.filter((m) => m.stage === "Round of 16"),
    qf: matches.filter((m) => m.stage === "Quarter-final"),
    sf: matches.filter((m) => m.stage === "Semi-final"),
    third: matches.filter((m) => m.stage === "Play-off for third place"),
    final: matches.filter((m) => m.stage === "Final"),
  };
}