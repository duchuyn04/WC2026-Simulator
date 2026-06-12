import {
  TOURNAMENT_STATS_CALENDAR_URL,
  TOURNAMENT_STATS_SEASON_ID,
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
} from "./tournament-stats-core";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchCompletedMatch(match: { IdMatch?: string | number }) {
  const liveMatch = await fetchJson<Record<string, unknown>>(
    `https://api.fifa.com/api/v3/live/football/${match.IdMatch}?language=en`,
  );
  const dataHubId = getDataHubId(
    match as { Properties?: { IdIFES?: string | number } },
    liveMatch as { Properties?: { IdIFES?: string | number } },
  );
  if (!dataHubId) {
    throw new Error(`Match ${match.IdMatch} has no FIFA Data Hub ID`);
  }

  const playerStats = await fetchJson<Record<string, unknown>>(
    `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`,
  );

  return {
    matchId: String(match.IdMatch),
    liveMatch,
    playerStats,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: Array<R | null> = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await task(items[index]);
      } catch {
        results[index] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results.filter((result): result is R => result !== null);
}

export type TournamentStatsSnapshot = {
  source: {
    provider: string;
    seasonId: string;
    calendarUrl: string;
  };
  fetchedAt: string;
  completedMatches: number;
  skippedMatches: number;
  leaderboards: ReturnType<typeof buildLeaderboards>;
};

export async function fetchTournamentStatsFromFifa(): Promise<TournamentStatsSnapshot> {
  const calendar = await fetchJson<{ Results?: Array<Record<string, unknown>> }>(
    TOURNAMENT_STATS_CALENDAR_URL,
  );
  const completedMatches = (calendar.Results ?? []).filter(isCompletedMatch);

  const matchData = await mapWithConcurrency(completedMatches, 4, fetchCompletedMatch);

  return {
    source: {
      provider: "FIFA",
      seasonId: TOURNAMENT_STATS_SEASON_ID,
      calendarUrl: TOURNAMENT_STATS_CALENDAR_URL,
    },
    fetchedAt: new Date().toISOString(),
    completedMatches: matchData.length,
    skippedMatches: completedMatches.length - matchData.length,
    leaderboards: buildLeaderboards(matchData, 10),
  };
}