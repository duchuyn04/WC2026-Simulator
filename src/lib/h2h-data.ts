"use client";

interface CacheEntry {
  promise: Promise<FifaMatch[]>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000;

type LocalizedText = { Locale: string; Description: string };

export interface FifaMatch {
  IdMatch?: string | number;
  Date?: string;
  Home?: { IdTeam?: string | number; TeamName?: LocalizedText[]; Abbreviation?: string };
  Away?: { IdTeam?: string | number; TeamName?: LocalizedText[]; Abbreviation?: string };
  HomeTeamScore?: number | string | null;
  AwayTeamScore?: number | string | null;
  CompetitionName?: LocalizedText[];
  SeasonName?: LocalizedText[];
  StageName?: LocalizedText[];
}

export function getLocalizedText(arr?: LocalizedText[]): string {
  if (!arr) return "";
  const en = arr.find((t) => t.Locale === "en-GB");
  return en?.Description ?? arr[0]?.Description ?? "";
}

export function fetchTeamMatches(teamId: string): Promise<FifaMatch[]> {
  const key = `team:${teamId}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.promise;
  }

  const promise = (async () => {
    const url = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=300&idTeam=${teamId}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`FIFA API returned ${res.status}`);
    const data = await res.json();
    return (data.Results || []) as FifaMatch[];
  })();

  cache.set(key, { promise, timestamp: Date.now() });
  return promise;
}

export async function fetchH2HMatches(teamAId: string, teamBId: string): Promise<FifaMatch[]> {
  const [matchesA, matchesB] = await Promise.all([
    fetchTeamMatches(teamAId),
    fetchTeamMatches(teamBId),
  ]);

  const combined = [...matchesA, ...matchesB];
  const seen = new Set<string>();
  const h2h: FifaMatch[] = [];

  for (const match of combined) {
    const idA = String(match.Home?.IdTeam);
    const idB = String(match.Away?.IdTeam);
    const isH2H =
      (idA === teamAId && idB === teamBId) ||
      (idA === teamBId && idB === teamAId);
    if (!isH2H) continue;

    const key = `${idA}-${idB}-${match.HomeTeamScore}-${match.AwayTeamScore}`;
    if (seen.has(key)) continue;
    seen.add(key);
    h2h.push(match);
  }

  return h2h;
}
