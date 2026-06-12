import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
} from "./lib/tournament-stats.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../data/fifa-tournament-stats.json");
const SEASON_ID = "285023";
const CALENDAR_URL =
  `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${SEASON_ID}`;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

async function fetchCompletedMatch(match) {
  const liveMatch = await fetchJson(
    `https://api.fifa.com/api/v3/live/football/${match.IdMatch}?language=en`,
  );
  const dataHubId = getDataHubId(match, liveMatch);
  if (!dataHubId) {
    throw new Error(`Match ${match.IdMatch} has no FIFA Data Hub ID`);
  }

  const playerStats = await fetchJson(
    `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`,
  );

  return { matchId: String(match.IdMatch), liveMatch, playerStats };
}

async function mapWithConcurrency(items, concurrency, task) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        console.warn(
          `Skipping match ${items[index]?.IdMatch}:`,
          error instanceof Error ? error.message : error,
        );
        results[index] = null;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results.filter(Boolean);
}

async function main() {
  console.log("Fetching completed FIFA World Cup 2026 matches...");
  const calendar = await fetchJson(CALENDAR_URL);
  const completedMatches = (calendar.Results ?? []).filter(isCompletedMatch);
  const matchData = await mapWithConcurrency(
    completedMatches,
    4,
    fetchCompletedMatch,
  );

  if (completedMatches.length > 0 && matchData.length === 0) {
    throw new Error("No completed match statistics could be downloaded");
  }

  const snapshot = {
    completedMatches: matchData.length,
    skippedMatches: completedMatches.length - matchData.length,
    leaderboards: buildLeaderboards(matchData, 10),
  };
  let fetchedAt = new Date().toISOString();

  if (existsSync(OUTPUT_PATH)) {
    try {
      const previous = JSON.parse(readFileSync(OUTPUT_PATH, "utf8"));
      const previousSnapshot = {
        completedMatches: previous.completedMatches,
        skippedMatches: previous.skippedMatches,
        leaderboards: previous.leaderboards,
      };
      if (JSON.stringify(previousSnapshot) === JSON.stringify(snapshot)) {
        fetchedAt = previous.fetchedAt;
      }
    } catch {
      // Replace malformed or obsolete snapshots with the latest valid response.
    }
  }

  const output = {
    source: {
      provider: "FIFA",
      seasonId: SEASON_ID,
      calendarUrl: CALENDAR_URL,
    },
    fetchedAt,
    ...snapshot,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `Wrote ${output.completedMatches} completed matches to ${OUTPUT_PATH}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
