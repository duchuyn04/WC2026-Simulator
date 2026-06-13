# API Fallback and ESPN Stats Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement offline fallback to static JSON for FIFA stats API and automatically patch missing goals (like G. Reyna's goal) by merging with ESPN live events timeline.

**Architecture:** Wrap FIFA API fetches in a try-catch to fallback to local static JSON. Query the ESPN scoreboard/summaries to check for completed matches; if the aggregated goals in FIFA playerStats are less than the ESPN actual score, fetch the ESPN timeline, match player names via name-overlap normalization, and update FIFA player stats with the missing goals before compiling leaderboards.

**Tech Stack:** Next.js, React, TypeScript, Vitest

---

### Task 1: Name Matching Helper

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `src/lib/__tests__/tournament-stats.test.ts`

- [ ] **Step 1: Write name matching tests**
Add name matching tests to `src/lib/__tests__/tournament-stats.test.ts`:
```typescript
import { expect, it, describe } from "vitest";
import { matchesPlayerName } from "../tournament-stats-core";

describe("matchesPlayerName", () => {
  it("should match names with initials and full names", () => {
    expect(matchesPlayerName("G. Reyna", "Giovanni REYNA")).toBe(true);
    expect(matchesPlayerName("Giovanni Reyna", "G. Reyna")).toBe(true);
    expect(matchesPlayerName("F. Balogun", "Folarin BALOGUN")).toBe(true);
    expect(matchesPlayerName("Maurício", "MAURICIO")).toBe(true);
    expect(matchesPlayerName("Alex Player", "Bob Player")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**
Run: `rtk npm run test src/lib/__tests__/tournament-stats.test.ts`
Expected: Fail because `matchesPlayerName` is not defined.

- [ ] **Step 3: Implement matchesPlayerName in tournament-stats-core.ts**
Add helper function:
```typescript
export function matchesPlayerName(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const normA = normalize(nameA);
  const normB = normalize(nameB);

  if (normA === normB) return true;

  const wordsA = normA.split(/\s+/).filter(w => w.length > 0);
  const wordsB = normB.split(/\s+/).filter(w => w.length > 0);

  // Initial and last name matching (e.g. "g reyna" vs "giovanni reyna")
  if (wordsA.length === 2 && wordsA[0].length === 1) {
    return wordsB.length >= 2 && wordsB[0].startsWith(wordsA[0]) && wordsB[wordsB.length - 1] === wordsA[1];
  }
  if (wordsB.length === 2 && wordsB[0].length === 1) {
    return wordsA.length >= 2 && wordsA[0].startsWith(wordsB[0]) && wordsA[wordsA.length - 1] === wordsB[1];
  }

  // Word overlap matching (e.g. "giovanni reyna" vs "reyna")
  const common = wordsA.filter(w => wordsB.includes(w) && w.length >= 3);
  return common.length > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**
Run: `rtk npm run test src/lib/__tests__/tournament-stats.test.ts`
Expected: Pass

- [ ] **Step 5: Commit changes**
Run:
```bash
rtk git add src/lib/tournament-stats-core.ts src/lib/__tests__/tournament-stats.test.ts
rtk git commit -m "feat: add matchesPlayerName helper and unit tests"
```

---

### Task 2: ESPN Match Patching Logic

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `src/lib/__tests__/tournament-stats.test.ts`

- [ ] **Step 1: Write tests for stats patching**
Add patching tests in `src/lib/__tests__/tournament-stats.test.ts`:
```typescript
import { patchMatchPlayerStats } from "../tournament-stats-core";

describe("patchMatchPlayerStats", () => {
  it("should patch missing goals from ESPN data", async () => {
    const liveMatch = {
      HomeTeam: {
        IdTeam: "43921",
        Abbreviation: "USA",
        TeamName: [{ Locale: "en", Description: "USA" }],
        Players: [
          { IdPlayer: "419068", PlayerName: [{ Locale: "en", Description: "Giovanni REYNA" }] }
        ]
      },
      AwayTeam: { Players: [] }
    };
    const playerStats = {
      "419068": [["Goals", 0, false]]
    };

    const espnSummary = {
      header: {
        competitions: [{
          details: [
            {
              scoringPlay: true,
              ownGoal: false,
              team: { id: "660" },
              participants: [{ athlete: { displayName: "G. Reyna" } }]
            }
          ]
        }]
      }
    };

    patchMatchPlayerStats(
      liveMatch,
      playerStats,
      espnSummary,
      "43921",
      "660"
    );

    const reynaGoals = playerStats["419068"]?.find(row => row[0] === "Goals")?.[1];
    expect(reynaGoals).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**
Run: `rtk npm run test src/lib/__tests__/tournament-stats.test.ts`
Expected: Fail (patchMatchPlayerStats is not defined)

- [ ] **Step 3: Implement patchMatchPlayerStats in tournament-stats-core.ts**
Add implementation:
```typescript
export function patchMatchPlayerStats(
  liveMatch: any,
  playerStats: Record<string, any>,
  espnSummary: any,
  fifaTeamId: string,
  espnTeamId: string
) {
  const details = [
    ...(espnSummary?.header?.competitions?.[0]?.details ?? []),
    ...(espnSummary?.keyEvents ?? [])
  ];

  const goalEvents = details.filter(event => event.scoringPlay && !event.ownGoal && String(event.team?.id) === espnTeamId);

  // Group ESPN goals by athlete name
  const espnGoalsByName: Record<string, number> = {};
  for (const event of goalEvents) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
    if (athleteName) {
      espnGoalsByName[athleteName] = (espnGoalsByName[athleteName] ?? 0) + 1;
    }
  }

  // Retrieve players of this team in liveMatch
  const teamPlayers =
    String(liveMatch?.HomeTeam?.IdTeam) === fifaTeamId
      ? (liveMatch?.HomeTeam?.Players ?? [])
      : String(liveMatch?.AwayTeam?.IdTeam) === fifaTeamId
      ? (liveMatch?.AwayTeam?.Players ?? [])
      : [];

  for (const [espnName, goalCount] of Object.entries(espnGoalsByName)) {
    // Match player
    const matchedPlayer = teamPlayers.find((p: any) => {
      const pName = p.PlayerName?.[0]?.Description ?? p.ShortName?.[0]?.Description ?? "";
      return matchesPlayerName(espnName, pName);
    });

    if (matchedPlayer) {
      const playerId = String(matchedPlayer.IdPlayer);
      let statsRows = playerStats[playerId];
      if (!statsRows) {
        statsRows = [["Goals", 0, false]];
        playerStats[playerId] = statsRows;
      }

      let goalsRowIndex = statsRows.findIndex((row: any) => row[0] === "Goals");
      if (goalsRowIndex === -1) {
        statsRows.push(["Goals", 0, false]);
        goalsRowIndex = statsRows.length - 1;
      }

      const currentGoals = Number(statsRows[goalsRowIndex][1]) || 0;
      if (currentGoals < goalCount) {
        statsRows[goalsRowIndex][1] = goalCount;
      }
    }
  }
}
```
Export it and export `matchesPlayerName` at the top of `src/lib/tournament-stats-core.ts`.

- [ ] **Step 4: Run tests to verify they pass**
Run: `rtk npm run test src/lib/__tests__/tournament-stats.test.ts`
Expected: Pass

- [ ] **Step 5: Commit changes**
Run:
```bash
rtk git add src/lib/tournament-stats-core.ts src/lib/__tests__/tournament-stats.test.ts
rtk git commit -m "feat: implement patchMatchPlayerStats and verify via tests"
```

---

### Task 3: API Route Integration

**Files:**
- Modify: `src/app/api/tournament-stats/route.ts`

- [ ] **Step 1: Implement fallback and patching in route.ts**
Open `src/app/api/tournament-stats/route.ts` and modify `GET` and `fetchCompletedMatch` to handle fallback and patching:
```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
  patchMatchPlayerStats,
} from "../../../../scripts/lib/tournament-stats.mjs";
import { ESPN_TEAM_MAP } from "../../../lib/espn-mapping";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";

// Add helper to read offline fallback JSON
function getOfflineFallback() {
  try {
    const path = join(process.cwd(), "data/fifa-tournament-stats.json");
    const content = readFileSync(path, "utf8");
    const data = JSON.parse(content);
    data.source.provider = "FIFA (Offline Fallback)";
    return data;
  } catch (error) {
    return { error: "Failed to fetch stats and offline fallback is unavailable." };
  }
}
```
Update the `GET()` function:
```typescript
export async function GET() {
  let calendar;
  try {
    calendar = await fetchJson(CALENDAR_URL);
  } catch (error) {
    console.warn("FIFA API is offline. Serving fallback stats.", error);
    return NextResponse.json(getOfflineFallback());
  }

  try {
    const completedMatches = (calendar.Results ?? []).filter(isCompletedMatch);

    // Fetch ESPN scoreboard in parallel to compare scores
    let espnMatches = [];
    try {
      const espnData = await fetchJson(ESPN_SCOREBOARD_URL);
      espnMatches = (espnData as any).events ?? [];
    } catch (e) {
      console.warn("Failed to fetch ESPN scoreboard", e);
    }

    const matchData = await mapWithConcurrency(
      completedMatches,
      4,
      async (match) => {
        const completedMatch = await fetchCompletedMatch(match);
        // Patch with ESPN if needed
        try {
          const homeTeamCode = match.Home?.Abbreviation ?? match.HomeTeam?.Abbreviation;
          const awayTeamCode = match.Away?.Abbreviation ?? match.AwayTeam?.Abbreviation;
          
          const homeLocalId = Object.keys(ESPN_TEAM_MAP).find(k => ESPN_TEAM_MAP[k] === match.Home?.IdTeam || ESPN_TEAM_MAP[k] === match.HomeTeam?.IdTeam);
          const awayLocalId = Object.keys(ESPN_TEAM_MAP).find(k => ESPN_TEAM_MAP[k] === match.Away?.IdTeam || ESPN_TEAM_MAP[k] === match.AwayTeam?.IdTeam);
          
          const espnHomeId = homeLocalId ? ESPN_TEAM_MAP[homeLocalId] : undefined;
          const espnAwayId = awayLocalId ? ESPN_TEAM_MAP[awayLocalId] : undefined;

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

            // Exclude own goals from total score comparison
            const ownGoals = detailsOwnGoals(comp?.details ?? []);
            const totalEspnGoals = homeScore + awayScore - ownGoals;

            if (fifaGoalsTotal < totalEspnGoals) {
              // Fetch summary details
              const summary = await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${espnMatch.id}`);
              
              // Patch home team stats
              if (homeLocalId && espnHomeId) {
                patchMatchPlayerStats(
                  completedMatch.liveMatch,
                  completedMatch.playerStats,
                  summary,
                  String(match.Home?.IdTeam ?? match.HomeTeam?.IdTeam),
                  espnHomeId
                );
              }
              // Patch away team stats
              if (awayLocalId && espnAwayId) {
                patchMatchPlayerStats(
                  completedMatch.liveMatch,
                  completedMatch.playerStats,
                  summary,
                  String(match.Away?.IdTeam ?? match.AwayTeam?.IdTeam),
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

function detailsOwnGoals(details: any[]) {
  return details.filter(event => event.scoringPlay && event.ownGoal).length;
}
```

- [ ] **Step 2: Commit API Route Integration**
Run:
```bash
rtk git add src/app/api/tournament-stats/route.ts
rtk git commit -m "feat: integrate offline fallback and espn stats merge in api route"
```

---

### Task 4: Browser Client Fetch Integration

**Files:**
- Modify: `src/lib/tournament-stats-fetch.ts`

- [ ] **Step 1: Integrate fallback and patching in tournament-stats-fetch.ts**
Modify `src/lib/tournament-stats-fetch.ts` to implement the same fallback and patching.
```typescript
import {
  TOURNAMENT_STATS_CALENDAR_URL,
  TOURNAMENT_STATS_SEASON_ID,
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
  patchMatchPlayerStats,
} from "./tournament-stats-core";
import { ESPN_TEAM_MAP } from "./espn-mapping";
import defaultStatsData from "../../data/fifa-tournament-stats.json";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";

function getOfflineFallback() {
  const data = JSON.parse(JSON.stringify(defaultStatsData));
  data.source.provider = "FIFA (Offline Fallback)";
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
    const completedMatches = (calendar.Results ?? []).filter(isCompletedMatch);

    let espnMatches: any[] = [];
    try {
      const espnData = await fetchJson<any>(ESPN_SCOREBOARD_URL);
      espnMatches = espnData.events ?? [];
    } catch (e) {
      console.warn("Failed to fetch ESPN scoreboard", e);
    }

    const matchData = await mapWithConcurrency(completedMatches, 4, async (match) => {
      const completedMatch = await fetchCompletedMatch(match);
      
      try {
        const homeLocalId = Object.keys(ESPN_TEAM_MAP).find(k => ESPN_TEAM_MAP[k] === match.Home?.IdTeam || ESPN_TEAM_MAP[k] === match.HomeTeam?.IdTeam);
        const awayLocalId = Object.keys(ESPN_TEAM_MAP).find(k => ESPN_TEAM_MAP[k] === match.Away?.IdTeam || ESPN_TEAM_MAP[k] === match.AwayTeam?.IdTeam);
        
        const espnHomeId = homeLocalId ? ESPN_TEAM_MAP[homeLocalId] : undefined;
        const espnAwayId = awayLocalId ? ESPN_TEAM_MAP[awayLocalId] : undefined;

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
          for (const [_, playerRows] of Object.entries(completedMatch.playerStats ?? {})) {
            const goals = (playerRows as any).find((r: any) => r[0] === "Goals")?.[1] ?? 0;
            fifaGoalsTotal += goals;
          }

          const ownGoals = (comp?.details ?? []).filter((event: any) => event.scoringPlay && event.ownGoal).length;
          const totalEspnGoals = homeScore + awayScore - ownGoals;

          if (fifaGoalsTotal < totalEspnGoals) {
            const summary = await fetchJson<any>(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${espnMatch.id}`);
            
            if (homeLocalId && espnHomeId) {
              patchMatchPlayerStats(
                completedMatch.liveMatch,
                completedMatch.playerStats,
                summary,
                String(match.Home?.IdTeam ?? match.HomeTeam?.IdTeam),
                espnHomeId
              );
            }
            if (awayLocalId && espnAwayId) {
              patchMatchPlayerStats(
                completedMatch.liveMatch,
                completedMatch.playerStats,
                summary,
                String(match.Away?.IdTeam ?? match.AwayTeam?.IdTeam),
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
```

- [ ] **Step 2: Run all tests**
Run: `rtk npm run test`
Expected: All tests pass.

- [ ] **Step 3: Commit Browser Fetch Integration**
Run:
```bash
rtk git add src/lib/tournament-stats-fetch.ts
rtk git commit -m "feat: integrate offline fallback and espn stats merge in browser stats fetch"
```
