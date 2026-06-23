import { getFifaRanking } from "./rankings";
import type { GroupData, GroupStanding, MatchResult, Team, TeamStats } from "./types";
import { isPlayedResult } from "./types";

type PlayedMatch = { home: Team; away: Team; result: { home: number; away: number } };

function emptyStats(team: Team): TeamStats {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    fairPlay: 0,
    fifaRanking: getFifaRanking(team.code),
  };
}

function applyResult(stats: TeamStats, gf: number, ga: number) {
  stats.played += 1;
  stats.gf += gf;
  stats.ga += ga;
  stats.gd = stats.gf - stats.ga;
  if (gf > ga) {
    stats.won += 1;
    stats.points += 3;
  } else if (gf === ga) {
    stats.drawn += 1;
    stats.points += 1;
  } else {
    stats.lost += 1;
  }
}

function getHeadToHeadStats(
  teams: TeamStats[],
  results: PlayedMatch[]
) {
  const ids = new Set(teams.map((t) => t.team.id));
  const subset = teams.map((t) => ({ ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }));
  const map = new Map(subset.map((s) => [s.team.id, s]));

  for (const { home, away, result } of results) {
    if (!ids.has(home.id) || !ids.has(away.id)) continue;
    applyResult(map.get(home.id)!, result.home, result.away);
    applyResult(map.get(away.id)!, result.away, result.home);
  }
  return [...map.values()];
}

function compareStats(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
  return a.fifaRanking - b.fifaRanking;
}

function rankTeams(
  teams: TeamStats[],
  results: PlayedMatch[]
): TeamStats[] {
  if (teams.length <= 1) return teams;

  const ranked: TeamStats[] = [];

  // Group by overall points
  const pointsGroups = new Map<number, TeamStats[]>();
  for (const t of teams) {
    const group = pointsGroups.get(t.points) ?? [];
    group.push(t);
    pointsGroups.set(t.points, group);
  }

  const sortedPoints = Array.from(pointsGroups.keys()).sort((a, b) => b - a);

  for (const pts of sortedPoints) {
    const group = pointsGroups.get(pts)!;
    if (group.length === 1) {
      ranked.push(group[0]);
    } else {
      const resolved = resolveTies(group, results);
      ranked.push(...resolved);
    }
  }

  return ranked;
}

function resolveTies(teams: TeamStats[], results: PlayedMatch[]): TeamStats[] {
  if (teams.length <= 1) return teams;

  const h2h = getHeadToHeadStats(teams, results);

  const sorted = [...teams].sort((a, b) => {
    const ha = h2h.find((t) => t.team.id === a.team.id)!;
    const hb = h2h.find((t) => t.team.id === b.team.id)!;

    if (hb.points !== ha.points) return hb.points - ha.points;
    if (hb.gd !== ha.gd) return hb.gd - ha.gd;
    if (hb.gf !== ha.gf) return hb.gf - ha.gf;

    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
    return a.fifaRanking - b.fifaRanking;
  });

  const ranked: TeamStats[] = [];
  let i = 0;
  while (i < sorted.length) {
    const current = sorted[i];
    const hc = h2h.find((t) => t.team.id === current.team.id)!;
    const tied = [current];
    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j];
      const hn = h2h.find((t) => t.team.id === next.team.id)!;
      if (hn.points === hc.points && hn.gd === hc.gd && hn.gf === hc.gf) {
        tied.push(next);
        j++;
      } else {
        break;
      }
    }

    if (tied.length === 1) {
      ranked.push(tied[0]);
    } else if (tied.length < teams.length) {
      ranked.push(...resolveTies(tied, results));
    } else {
      const fullyResolved = [...tied].sort((a, b) => {
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        if (b.fairPlay !== a.fairPlay) return b.fairPlay - a.fairPlay;
        return a.fifaRanking - b.fifaRanking;
      });
      ranked.push(...fullyResolved);
    }
    i = j;
  }

  return ranked;
}

export function calculateGroupStandings(
  group: GroupData,
  results: Record<string, MatchResult>,
  fairPlayOverrides: Record<string, number> = {}
): GroupStanding {
  const statsMap = new Map<string, TeamStats>();
  for (const t of group.teams) {
    const s = emptyStats(t);
    if (fairPlayOverrides[t.id] !== undefined) s.fairPlay = fairPlayOverrides[t.id];
    statsMap.set(t.id, s);
  }

  const played: PlayedMatch[] = [];

  for (const m of group.matches) {
    if (!m.home || !m.away) continue;
    const r = results[m.id];
    if (!isPlayedResult(r)) continue;
    applyResult(statsMap.get(m.home.id)!, r.home, r.away);
    applyResult(statsMap.get(m.away.id)!, r.away, r.home);
    played.push({ home: m.home, away: m.away, result: r });
  }

  let ranked = rankTeams([...statsMap.values()], played);

  if (ranked.length < 4) {
    ranked = [...statsMap.values()].sort(compareStats);
  }

  while (ranked.length < 4) {
    ranked.push(emptyStats({ id: `placeholder-${ranked.length}`, code: "?", name: "TBD", flagUrl: "" }));
  }

  return {
    letter: group.letter,
    ranked,
    first: ranked[0],
    second: ranked[1],
    third: ranked[2],
    fourth: ranked[3],
  };
}

export function buildStandingsFromOrder(
  group: GroupData,
  order: Team[],
  fairPlayOverrides: Record<string, number> = {}
): GroupStanding {
  const ranked: TeamStats[] = order.map((team, i) => {
    const pts = i === 0 ? 9 : i === 1 ? 6 : i === 2 ? 3 : 0;
    return {
      team,
      played: 3,
      won: i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 1 : 0,
      drawn: 0,
      lost: i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 2 : 3,
      gf: 3 - i,
      ga: i,
      gd: 3 - 2 * i,
      points: pts,
      fairPlay: fairPlayOverrides[team.id] ?? 0,
      fifaRanking: getFifaRanking(team.code),
    };
  });

  return {
    letter: group.letter,
    ranked,
    first: ranked[0],
    second: ranked[1],
    third: ranked[2],
    fourth: ranked[3],
  };
}
