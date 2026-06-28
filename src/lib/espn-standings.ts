import type { EspnScoreboardMatch } from "./espn-match";
import { ESPN_TEAM_MAP } from "./espn-mapping";
import { seed } from "./data";
import { getFifaRanking } from "./fifa/rankings";
import type { GroupStanding, Team, TeamStats } from "./fifa/types";

export const ESPN_STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

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

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce((acc, [localId, espnId]) => {
  acc[espnId] = localId;
  return acc;
}, {} as Record<string, string>);

const LOCAL_TEAMS = new Map<string, Team>(
  seed.groups.flatMap((group) => group.teams.map((team) => [team.id, team] as const))
);

function groupLetter(group: EspnStandingGroup): string | null {
  return group.abbreviation.match(/[A-L]$/)?.[0] ?? group.name.match(/[A-L]$/)?.[0] ?? null;
}

function toTeamStats(team: EspnStandingTeam): TeamStats | null {
  const localTeam = LOCAL_TEAMS.get(ESPN_TO_LOCAL[team.espnTeamId]);
  if (!localTeam) return null;

  return {
    team: localTeam,
    played: team.gamesPlayed,
    won: team.wins,
    drawn: team.ties,
    lost: team.losses,
    gf: team.pointsFor,
    ga: team.pointsAgainst,
    gd: team.pointDifferential,
    points: team.points,
    fairPlay: 0,
    fifaRanking: getFifaRanking(localTeam.code),
  };
}

export function espnGroupsToGroupStandings(groups: EspnStandingGroup[]): GroupStanding[] {
  return groups.flatMap((group) => {
    const letter = groupLetter(group);
    if (!letter) return [];

    const ranked = group.teams
      .map(toTeamStats)
      .filter((team): team is TeamStats => team !== null);
    if (ranked.length < 4) return [];

    return [{
      letter,
      ranked,
      first: ranked[0]!,
      second: ranked[1]!,
      third: ranked[2]!,
      fourth: ranked[3]!,
    }];
  });
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
