import {
  TOURNAMENT_STATS_CALENDAR_URL,
  TOURNAMENT_STATS_SEASON_ID,
  buildLeaderboards,
  getDataHubId,
  isLiveOrCompletedMatch,
  patchMatchPlayerStats,
  detailsOwnGoals,
} from "./tournament-stats-core";
import { ESPN_TEAM_MAP } from "./espn-mapping";
import defaultStatsData from "../../data/fifa-tournament-stats.json";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";

function getOfflineFallback(): TournamentStatsSnapshot {
  const data = JSON.parse(JSON.stringify(defaultStatsData)) as TournamentStatsSnapshot;
  if (data && data.source) {
    data.source.provider = "FIFA (Offline Fallback)";
  }
  return data;
}



export async function fetchTournamentStatsFromFifa(): Promise<TournamentStatsSnapshot> {
  // Khắc phục triệt để lỗi Connection Starvation (mất 20s+ mới fetch xong score):
  // Vì Next.js App được deploy lên GitHub Pages không có API Routes, fallback này sẽ bị kích hoạt.
  // Thuật toán cũ tự động fetch song song 150+ requests (calendar, player stats, espn summary) 
  // làm cạn kiệt connection pool của trình duyệt (giới hạn 6 connections/host).
  // Vì CI đã tự động build tĩnh lại app mỗi 15 phút cùng file JSON mới nhất,
  // chúng ta chỉ cần trả về file JSON tĩnh này là đã có dữ liệu đủ mới và mượt mà!
  return getOfflineFallback();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { 
    headers: { Accept: "application/json" },
    cache: "no-store"
  });
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

  let playerStats: Record<string, unknown> = {};
  try {
    playerStats = await fetchJson<Record<string, unknown>>(
      `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`,
    );
  } catch (error) {
    console.warn(`Failed to fetch player stats for match ${match.IdMatch} (using empty stats):`, error);
  }

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