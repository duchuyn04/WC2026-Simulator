import rankingsData from "../../../data/fifa-rankings.json";

export type FifaRankingsFile = {
  source: string;
  api: string;
  rankingType: string;
  fetchedAt: string;
  lastOfficialUpdate: string | null;
  nextOfficialUpdate: string | null;
  teamCount: number;
  rankings: Record<string, number>;
};

const data = rankingsData as FifaRankingsFile;

export function getFifaRanking(code: string): number {
  return data.rankings[code] ?? 999;
}

export function getFifaRankingsMeta() {
  return {
    source: data.source,
    fetchedAt: data.fetchedAt,
    lastOfficialUpdate: data.lastOfficialUpdate,
    nextOfficialUpdate: data.nextOfficialUpdate,
    teamCount: data.teamCount,
  };
}