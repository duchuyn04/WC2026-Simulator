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
  let calendar;
  try {
    calendar = await fetchJson<{ Results?: Array<Record<string, unknown>> }>(
      TOURNAMENT_STATS_CALENDAR_URL,
    );
  } catch (error) {
    console.warn("FIFA API is offline. Serving browser fallback stats.", error);
    return getOfflineFallback();
  }

  try {
    const completedMatches = (calendar.Results ?? []).filter(isLiveOrCompletedMatch);

    let espnMatches: any[] = [];
    try {
      const espnData = await fetchJson<any>(ESPN_SCOREBOARD_URL);
      espnMatches = espnData.events ?? [];
    } catch (e) {
      console.warn("Failed to fetch ESPN scoreboard", e);
    }

    const matchData = await mapWithConcurrency(completedMatches, 4, async (match: any) => {
      const completedMatch = await fetchCompletedMatch(match);
      
      try {
        const fifaHomeId = String(match.Home?.IdTeam ?? match.HomeTeam?.IdTeam);
        const fifaAwayId = String(match.Away?.IdTeam ?? match.AwayTeam?.IdTeam);

        const espnHomeId = fifaHomeId ? ESPN_TEAM_MAP[fifaHomeId] : undefined;
        const espnAwayId = fifaAwayId ? ESPN_TEAM_MAP[fifaAwayId] : undefined;

        const espnMatch = espnMatches.find((event: any) => {
          const comp = event.competitions?.[0];
          const home = comp?.competitors?.find((t: any) => t.homeAway === "home");
          const away = comp?.competitors?.find((t: any) => t.homeAway === "away");
          return (
            (home?.team?.id === espnHomeId && away?.team?.id === espnAwayId) ||
            (home?.team?.id === espnAwayId && away?.team?.id === espnHomeId)
          );
        });

        if (espnMatch) {
          const comp = espnMatch.competitions?.[0];
          const homeScore = Number(comp?.competitors?.find((t: any) => t.homeAway === "home")?.score) || 0;
          const awayScore = Number(comp?.competitors?.find((t: any) => t.homeAway === "away")?.score) || 0;

          let fifaGoalsTotal = 0;
          for (const playerRows of Object.values(completedMatch.playerStats ?? {})) {
            const goals = (playerRows as any).find((r: any) => r[0] === "Goals")?.[1] ?? 0;
            fifaGoalsTotal += goals;
          }

          // Compute own goals from FIFA playerStats
          let fifaOwnGoalsTotal = 0;
          for (const playerRows of Object.values(completedMatch.playerStats ?? {})) {
            const ogs = (playerRows as any).find((r: any) => r[0] === "OwnGoals")?.[1] ?? 0;
            fifaOwnGoalsTotal += ogs;
          }

          const summary = await fetchJson<any>(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${espnMatch.id}`);
          const details = [
            ...(summary.header?.competitions?.[0]?.details ?? []),
            ...(summary.keyEvents ?? [])
          ];

          const ownGoals = detailsOwnGoals(details);
          const totalEspnGoals = homeScore + awayScore - ownGoals;

          if (fifaGoalsTotal < totalEspnGoals || fifaOwnGoalsTotal < ownGoals) {
            if (fifaHomeId && espnHomeId) {
              patchMatchPlayerStats(
                completedMatch.liveMatch,
                completedMatch.playerStats,
                summary,
                fifaHomeId,
                espnHomeId
              );
            }
            if (fifaAwayId && espnAwayId) {
              patchMatchPlayerStats(
                completedMatch.liveMatch,
                completedMatch.playerStats,
                summary,
                fifaAwayId,
                espnAwayId
              );
            }
          }
        }
      } catch (e) {
        console.warn("Failed to patch browser stats", e);
      }

      return completedMatch;
    });

    if (matchData.length === 0 && completedMatches.length > 0) {
      console.warn("Fetched 0 matches details but calendar has completed matches. Serving browser fallback stats.");
      return getOfflineFallback();
    }

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
  } catch (error) {
    console.error("Failed to fetch tournament stats from browser:", error);
    return getOfflineFallback();
  }
}

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