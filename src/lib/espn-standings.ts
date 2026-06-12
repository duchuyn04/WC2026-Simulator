import type { EspnScoreboardMatch } from "./espn-match";

export type EspnStandingTeam = {
  espnTeamId: string;
  teamName: string;
  rank: number;
  points: number;
  gamesPlayed: number;
  wins: number;
  ties: number;
  losses: number;
  pointDifferential: number;
  pointsFor: number;
  pointsAgainst: number;
  isLive: boolean;
};

export type EspnStandingGroup = {
  name: string;
  abbreviation: string;
  teams: EspnStandingTeam[];
  hasLiveMatch: boolean;
};

type EspnStandingStat = {
  name?: string;
  value?: number;
};

type EspnStandingsResponse = {
  children?: Array<{
    name?: string;
    abbreviation?: string;
    standings?: {
      entries?: Array<{
        team?: { id?: string; displayName?: string; name?: string };
        note?: { rank?: number };
        stats?: EspnStandingStat[];
      }>;
    };
  }>;
};

function getStat(stats: EspnStandingStat[], name: string) {
  const value = Number(stats.find((stat) => stat.name === name)?.value);
  return Number.isFinite(value) ? value : 0;
}

export function parseEspnStandings(
  data: EspnStandingsResponse,
): EspnStandingGroup[] {
  return (data.children ?? []).map((group) => ({
    name: group.name ?? "Group",
    abbreviation: group.abbreviation ?? "",
    hasLiveMatch: false,
    teams: (group.standings?.entries ?? [])
      .flatMap((entry) => {
        if (!entry.team?.id) return [];
        const stats = entry.stats ?? [];
        return [{
          espnTeamId: entry.team.id,
          teamName: entry.team.displayName ?? entry.team.name ?? "",
          rank: entry.note?.rank ?? getStat(stats, "rank"),
          points: getStat(stats, "points"),
          gamesPlayed: getStat(stats, "gamesPlayed"),
          wins: getStat(stats, "wins"),
          ties: getStat(stats, "ties"),
          losses: getStat(stats, "losses"),
          pointDifferential: getStat(stats, "pointDifferential"),
          pointsFor: getStat(stats, "pointsFor"),
          pointsAgainst: getStat(stats, "pointsAgainst"),
          isLive: false,
        }];
      })
      .sort((left, right) => left.rank - right.rank),
  }));
}

function parseScore(value?: string) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function applyLiveResult(
  team: EspnStandingTeam,
  goalsFor: number,
  goalsAgainst: number,
) {
  team.gamesPlayed += 1;
  team.pointsFor += goalsFor;
  team.pointsAgainst += goalsAgainst;
  team.pointDifferential = team.pointsFor - team.pointsAgainst;
  team.isLive = true;

  if (goalsFor > goalsAgainst) {
    team.wins += 1;
    team.points += 3;
  } else if (goalsFor < goalsAgainst) {
    team.losses += 1;
  } else {
    team.ties += 1;
    team.points += 1;
  }
}

export function applyLiveMatchesToStandings(
  groups: EspnStandingGroup[],
  matches: EspnScoreboardMatch[],
): EspnStandingGroup[] {
  const liveMatches = matches.filter((match) => match.state === "in");

  return groups.map((group) => {
    const teams = group.teams.map((team) => ({ ...team, isLive: false }));
    const teamMap = new Map(teams.map((team) => [team.espnTeamId, team]));
    let hasLiveMatch = false;

    for (const match of liveMatches) {
      if (!match.homeId || !match.awayId) continue;
      const home = teamMap.get(match.homeId);
      const away = teamMap.get(match.awayId);
      const homeScore = parseScore(match.homeScore);
      const awayScore = parseScore(match.awayScore);
      if (!home || !away || homeScore === null || awayScore === null) continue;

      applyLiveResult(home, homeScore, awayScore);
      applyLiveResult(away, awayScore, homeScore);
      hasLiveMatch = true;
    }

    teams.sort((left, right) =>
      right.points - left.points ||
      right.pointDifferential - left.pointDifferential ||
      right.pointsFor - left.pointsFor ||
      left.rank - right.rank
    );

    teams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return { ...group, teams, hasLiveMatch };
  });
}
