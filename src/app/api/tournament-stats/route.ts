import { NextResponse } from "next/server";
import {
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
} from "../../../../scripts/lib/tournament-stats.mjs";

export const revalidate = 60; // Cache for 60 seconds

const SEASON_ID = "285023";
const CALENDAR_URL = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${SEASON_ID}`;

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function fetchCompletedMatch(match: any) {
  const liveMatch = await fetchJson(
    `https://api.fifa.com/api/v3/live/football/${match.IdMatch}?language=en`
  );
  const dataHubId = getDataHubId(match, liveMatch);
  if (!dataHubId) {
    throw new Error(`Match ${match.IdMatch} has no FIFA Data Hub ID`);
  }

  const playerStats = await fetchJson(
    `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`
  );

  return { matchId: String(match.IdMatch), liveMatch, playerStats };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: (R | null)[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        console.warn(`Skipping match ${items[index]}:`, error);
        results[index] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results.filter((r) => r !== null) as R[];
}

export async function GET() {
  try {
    const calendar = await fetchJson(CALENDAR_URL);
    const completedMatches = (calendar.Results ?? []).filter(isCompletedMatch);
    
    const matchData = await mapWithConcurrency(
      completedMatches,
      4,
      fetchCompletedMatch
    );

    const snapshot = {
      completedMatches: matchData.length,
      skippedMatches: completedMatches.length - matchData.length,
      leaderboards: buildLeaderboards(matchData, 10),
    };

    const output = {
      source: {
        provider: "FIFA",
        seasonId: SEASON_ID,
        calendarUrl: CALENDAR_URL,
      },
      fetchedAt: new Date().toISOString(),
      ...snapshot,
    };

    return NextResponse.json(output);
  } catch (error) {
    console.error("Failed to fetch tournament stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournament stats" },
      { status: 500 }
    );
  }
}
