import { NextResponse } from "next/server";
import {
  buildLeaderboards,
  getDataHubId,
  isLiveOrCompletedMatch,
  patchMatchPlayerStats,
  detailsOwnGoals,
} from "../../../lib/tournament-stats-core";
import { ESPN_TEAM_MAP } from "../../../lib/espn-mapping";
import defaultStatsData from "../../../../data/fifa-tournament-stats.json";

export const dynamic = "force-static";

const SEASON_ID = "285023";
const CALENDAR_URL = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${SEASON_ID}`;
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";

function getOfflineFallback() {
  const data = JSON.parse(JSON.stringify(defaultStatsData));
  if (data && data.source) {
    data.source.provider = "FIFA (Offline Fallback)";
  }
  return data;
}

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

  let playerStats = {};
  try {
    playerStats = await fetchJson(
      `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`
    );
  } catch (error) {
    console.warn(`Failed to fetch player stats for match ${match.IdMatch} (using empty stats):`, error);
  }

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
  let calendar;
  try {
    calendar = await fetchJson(CALENDAR_URL);
  } catch (error) {
    console.warn("FIFA API is offline. Serving fallback stats.", error);
    return NextResponse.json(getOfflineFallback());
  }

  try {
    const completedMatches = (calendar.Results ?? []).filter(isLiveOrCompletedMatch);
    
    // Fetch ESPN scoreboard in parallel to compare scores
    let espnMatches: any[] = [];
    try {
      const espnData = await fetchJson(ESPN_SCOREBOARD_URL);
      espnMatches = espnData.events ?? [];
    } catch (e) {
      console.warn("Failed to fetch ESPN scoreboard", e);
    }

    const matchData = await mapWithConcurrency(
      completedMatches,
      4,
      async (match: any) => {
        const completedMatch = await fetchCompletedMatch(match);
        // Patch with ESPN if needed
        try {
          const fifaHomeId = String(match.Home?.IdTeam ?? match.HomeTeam?.IdTeam);
          const fifaAwayId = String(match.Away?.IdTeam ?? match.AwayTeam?.IdTeam);

          const espnHomeId = fifaHomeId ? ESPN_TEAM_MAP[fifaHomeId] : undefined;
          const espnAwayId = fifaAwayId ? ESPN_TEAM_MAP[fifaAwayId] : undefined;

          // Find match in ESPN
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

            // Compute goals from FIFA playerStats (excluding own goals)
            let fifaGoalsTotal = 0;
            for (const [_, playerRows] of Object.entries(completedMatch.playerStats ?? {})) {
              const goals = (playerRows as any).find((r: any) => r[0] === "Goals")?.[1] ?? 0;
              fifaGoalsTotal += goals;
            }

            // Compute own goals from FIFA playerStats
            let fifaOwnGoalsTotal = 0;
            for (const [_, playerRows] of Object.entries(completedMatch.playerStats ?? {})) {
              const ogs = (playerRows as any).find((r: any) => r[0] === "OwnGoals")?.[1] ?? 0;
              fifaOwnGoalsTotal += ogs;
            }

            // Fetch summary to see if there are own goals
            const summary = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${espnMatch.id}`);
            const details = [
              ...(summary.header?.competitions?.[0]?.details ?? []),
              ...(summary.keyEvents ?? [])
            ];
            
            const ownGoals = detailsOwnGoals(details);
            const totalEspnGoals = homeScore + awayScore - ownGoals;

            if (fifaGoalsTotal < totalEspnGoals || fifaOwnGoalsTotal < ownGoals) {
              // Patch home team stats
              if (fifaHomeId && espnHomeId) {
                patchMatchPlayerStats(
                  completedMatch.liveMatch,
                  completedMatch.playerStats,
                  summary,
                  fifaHomeId,
                  espnHomeId
                );
              }
              // Patch away team stats
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
        } catch (patchError) {
          console.warn("Failed to patch match data with ESPN stats", patchError);
        }

        return completedMatch;
      }
    );

    if (matchData.length === 0 && completedMatches.length > 0) {
      console.warn("Fetched 0 matches details but calendar has completed matches. Serving fallback stats.");
      return NextResponse.json(getOfflineFallback());
    }

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
    return NextResponse.json(getOfflineFallback());
  }
}

