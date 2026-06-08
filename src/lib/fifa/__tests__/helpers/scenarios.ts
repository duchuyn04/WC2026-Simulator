import annexData from "../../../../../data/third-place-combinations.json";
import { seed } from "../../../data";
import { resolveKnockoutBracket, getMatchesByStage } from "../../bracket";
import { calculateGroupStandings, buildStandingsFromOrder } from "../../standings";
import { rankThirdPlaceTeams } from "../../third-place";
import type { GroupData, GroupStanding, MatchResult, ResolvedKnockoutMatch, Team } from "../../types";

export function allTeamsMap(): Map<string, Team> {
  const map = new Map<string, Team>();
  for (const g of seed.groups) {
    for (const t of g.teams) map.set(t.id, t);
  }
  return map;
}

export function makeGroupWinnerResults(group: GroupData, winnerCode: string): Record<string, MatchResult> {
  const results: Record<string, MatchResult> = {};
  for (const m of group.matches) {
    if (!m.home || !m.away) continue;
    const homeWins = m.home.code === winnerCode;
    results[m.id] = homeWins ? { home: 2, away: 0 } : { home: 0, away: 2 };
  }
  return results;
}

export function makeGroupRoundRobinResults(
  group: GroupData,
  patternIndex: number
): Record<string, MatchResult> {
  const results: Record<string, MatchResult> = {};
  let i = 0;
  for (const m of group.matches) {
    if (!m.home || !m.away) continue;
    const h = (patternIndex + i) % 4;
    const a = (patternIndex + i + 1) % 4;
    results[m.id] = { home: h, away: a };
    i++;
  }
  return results;
}

export function computeAllStandings(
  matchResults: Record<string, MatchResult> = {},
  manualOrder: Record<string, string[] | null> = {}
): GroupStanding[] {
  return seed.groups.map((group) => {
    const manual = manualOrder[group.letter];
    if (manual) {
      const teams = manual
        .map((id) => group.teams.find((t) => t.id === id))
        .filter((t): t is Team => !!t);
      if (teams.length === 4) return buildStandingsFromOrder(group, teams);
    }
    return calculateGroupStandings(group, matchResults);
  });
}

export function resolveFullBracket(
  standings: GroupStanding[],
  winners: Record<number, Team> = {},
  losers: Record<number, Team> = {}
) {
  const third = rankThirdPlaceTeams(standings);
  const resolved = resolveKnockoutBracket(
    seed.knockout,
    standings,
    third.qualifyingGroups,
    winners,
    losers
  );
  return { third, resolved, stages: getMatchesByStage(resolved) };
}

export function buildStandingsWithThirdPoints(
  thirdPointsByGroup: Record<string, number>
): GroupStanding[] {
  return seed.groups.map((group) => {
    const order = [...group.teams];
    const thirdPts = thirdPointsByGroup[group.letter] ?? 3;
    const ranked = order.map((team, i) => ({
      team,
      played: 3,
      won: i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0,
      drawn: 0,
      lost: i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 2 : 3,
      gf: 6 - i,
      ga: i,
      gd: 6 - 2 * i,
      points: i === 0 ? 9 : i === 1 ? 6 : i === 2 ? thirdPts : 0,
      fairPlay: 0,
      fifaRanking: 100 + i,
    }));
    return {
      letter: group.letter,
      ranked,
      first: ranked[0],
      second: ranked[1],
      third: ranked[2],
      fourth: ranked[3],
    };
  });
}

export function pickBracketWinners(
  standings: GroupStanding[],
  strategy: "home" | "away" = "home"
): Record<number, string> {
  const winners: Record<number, string> = {};
  const teamWinners: Record<number, Team> = {};
  const teamLosers: Record<number, Team> = {};

  for (const m of [...seed.knockout].sort((a, b) => a.matchNumber - b.matchNumber)) {
    const third = rankThirdPlaceTeams(standings);
    const resolved = resolveKnockoutBracket(
      seed.knockout,
      standings,
      third.qualifyingGroups,
      teamWinners,
      teamLosers
    );
    const match = resolved.find((r) => r.matchNumber === m.matchNumber);
    if (!match?.resolvedHome?.team || !match.resolvedAway?.team) continue;

    const pick =
      strategy === "home" ? match.resolvedHome.team : match.resolvedAway.team;
    const loser =
      pick.id === match.resolvedHome.team.id
        ? match.resolvedAway.team
        : match.resolvedHome.team;

    winners[m.matchNumber] = pick.id;
    teamWinners[m.matchNumber] = pick;
    teamLosers[m.matchNumber] = loser;
  }

  return winners;
}

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomGroupResults(seedNum: number): Record<string, MatchResult> {
  const rand = mulberry32(seedNum);
  const results: Record<string, MatchResult> = {};
  for (const group of seed.groups) {
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      results[m.id] = {
        home: Math.floor(rand() * 5),
        away: Math.floor(rand() * 5),
      };
    }
  }
  return results;
}

export const ANNEX_SLOT_KEYS = annexData.slotKeys as string[];
export const ANNEX_COMBINATION_KEYS = Object.keys(annexData.combinations);