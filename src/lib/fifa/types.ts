export type Team = {
  id: string;
  code: string;
  name: string;
  flagUrl: string;
};

export type MatchResult = {
  home?: number;
  away?: number;
};

export function isPlayedResult(r?: MatchResult): r is { home: number; away: number } {
  return (
    r != null &&
    typeof r.home === "number" &&
    r.home >= 0 &&
    typeof r.away === "number" &&
    r.away >= 0
  );
}

export type MatchSchedule = {
  date?: string;
  localDate?: string;
  stadium?: string;
  city?: string;
};

export type GroupMatch = MatchSchedule & {
  id: string;
  matchNumber: number;
  home: Team | null;
  away: Team | null;
  placeholderA: string;
  placeholderB: string;
};

export type GroupData = {
  letter: string;
  teams: Team[];
  matches: GroupMatch[];
};

export type TeamStats = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  fairPlay: number;
  fifaRanking: number;
};

export type GroupStanding = {
  letter: string;
  ranked: TeamStats[];
  first: TeamStats;
  second: TeamStats;
  third: TeamStats;
  fourth: TeamStats;
};

export type KnockoutMatch = MatchSchedule & {
  id: string;
  matchNumber: number;
  stage: string;
  placeholderA: string;
  placeholderB: string;
  home: Team | null;
  away: Team | null;
};

export type ResolvedParticipant = {
  team: Team;
  label: string;
};

export type ResolvedKnockoutMatch = KnockoutMatch & {
  resolvedHome: ResolvedParticipant | null;
  resolvedAway: ResolvedParticipant | null;
  winner: Team | null;
};