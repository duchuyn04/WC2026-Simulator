# Real-time Stats & Live Match Background Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automatic background synchronization for live match scores and player statistics (goals, assists, cards, own goals, penalties) during active match play.

**Architecture:** We will extend the statistics compilation logic to fetch lineups/rosters for live matches, parse all ESPN events (assists, cards, penalties), store the aggregated stats in the central Zustand store, and run a global background sync hook every 60 seconds when the app is active.

**Tech Stack:** React, Next.js (App Router), Zustand, Vitest, FIFA & ESPN APIs.

---

### Task 1: Extend Stats Core and Script with Full ESPN Event Patching

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `scripts/lib/tournament-stats.mjs`
- Modify: `src/lib/__tests__/tournament-stats.test.ts`

- [ ] **Step 1: Write tests for full ESPN event patching**
  Add unit tests in `src/lib/__tests__/tournament-stats.test.ts` verifying that `patchMatchPlayerStats` correctly extracts goals, assists, yellow cards, red cards, penalties, and own goals.
  
  ```typescript
  // Add to src/lib/__tests__/tournament-stats.test.ts
  describe("patchMatchPlayerStats - full event parsing", () => {
    it("should patch assists, yellow/red cards, and penalties from ESPN data", () => {
      const liveMatch = {
        HomeTeam: {
          IdTeam: "43921",
          Abbreviation: "USA",
          Players: [
            { IdPlayer: "419068", PlayerName: [{ Locale: "en", Description: "Giovanni REYNA" }] },
            { IdPlayer: "420000", PlayerName: [{ Locale: "en", Description: "Christian PULISIC" }] }
          ]
        },
        AwayTeam: { Players: [] }
      };
      const playerStats: Record<string, any> = {
        "419068": [["Goals", 0, false], ["Assists", 0, false]],
        "420000": [["YellowCards", 0, false], ["DirectRedCards", 0, false]]
      };
      const espnSummary = {
        header: { competitions: [] },
        keyEvents: [
          {
            type: { type: "yellow-card" },
            team: { id: "660" },
            participants: [{ athlete: { displayName: "C. Pulisic" } }]
          },
          {
            type: { type: "assist" },
            team: { id: "660" },
            participants: [{ athlete: { displayName: "G. Reyna" } }]
          }
        ]
      };
      patchMatchPlayerStats(liveMatch, playerStats, espnSummary, "43921", "660");
      
      const pulisicYellows = playerStats["420000"]?.find((row: any) => row[0] === "YellowCards")?.[1];
      expect(pulisicYellows).toBe(1);

      const reynaAssists = playerStats["419068"]?.find((row: any) => row[0] === "Assists")?.[1];
      expect(reynaAssists).toBe(1);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test`
  Expected: FAIL on the newly added tests since cards and assists are not yet patched.

- [ ] **Step 3: Implement isLiveOrCompletedMatch and extend patchMatchPlayerStats**
  Implement these functions in `src/lib/tournament-stats-core.ts` and `scripts/lib/tournament-stats.mjs`:
  
  ```typescript
  export function isLiveOrCompletedMatch(match: any) {
    // Status 2 is Live/In-progress, Status 1 is Completed
    const status = Number(match?.OfficialityStatus);
    const hasScores = match?.HomeTeamScore !== null && match?.AwayTeamScore !== null;
    return (status === 1 || status === 2) && hasScores;
  }
  ```

  And extend `patchMatchPlayerStats` to handle assists, yellow cards, red cards, penalties:
  
  ```typescript
  // Inside patchMatchPlayerStats
  const cardEvents = details.filter((event: any) => {
    return event.type?.type === "yellow-card" || event.type?.type === "red-card";
  });

  for (const event of cardEvents) {
    const isRed = event.type.type === "red-card";
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? "";
    const matchedPlayer = teamPlayers.find((p: any) => {
      const pName = p.PlayerName?.[0]?.Description ?? p.ShortName?.[0]?.Description ?? "";
      return matchesPlayerName(athleteName, pName);
    });
    if (matchedPlayer) {
      const playerId = String(matchedPlayer.IdPlayer);
      if (!playerStats[playerId]) playerStats[playerId] = [];
      const key = isRed ? "DirectRedCards" : "YellowCards";
      let row = playerStats[playerId].find((r: any) => r[0] === key);
      if (!row) {
        row = [key, 0, false];
        playerStats[playerId].push(row);
      }
      row[1] = (row[1] || 0) + 1;
    }
  }

  const assistEvents = details.filter((event: any) => event.type?.type === "assist");
  for (const event of assistEvents) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? "";
    const matchedPlayer = teamPlayers.find((p: any) => {
      const pName = p.PlayerName?.[0]?.Description ?? p.ShortName?.[0]?.Description ?? "";
      return matchesPlayerName(athleteName, pName);
    });
    if (matchedPlayer) {
      const playerId = String(matchedPlayer.IdPlayer);
      if (!playerStats[playerId]) playerStats[playerId] = [];
      let row = playerStats[playerId].find((r: any) => r[0] === "Assists");
      if (!row) {
        row = ["Assists", 0, false];
        playerStats[playerId].push(row);
      }
      row[1] = (row[1] || 0) + 1;
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/lib/tournament-stats-core.ts scripts/lib/tournament-stats.mjs src/lib/__tests__/tournament-stats.test.ts
  git commit -m "feat: extend player stats patching with assists, cards, and penalties"
  ```

---

### Task 2: Enable Live Match Stats Fetching in Next.js API Route and Browser Fetcher

**Files:**
- Modify: `src/app/api/tournament-stats/route.ts`
- Modify: `src/lib/tournament-stats-fetch.ts`

- [ ] **Step 1: Update routing to fetch live matches**
  Replace `isCompletedMatch` with `isLiveOrCompletedMatch` in calendar filtering.
  Handle missing `players.json` from FIFA Data Hub (e.g. catch 404 fetch errors) for live matches by initializing empty stats for players found in the FIFA Live Match endpoint.
  
  ```typescript
  // In fetchCompletedMatch inside route.ts and tournament-stats-fetch.ts:
  let playerStats = {};
  try {
    playerStats = await fetchJson(
      `https://fdh-api.fifa.com/v1/stats/match/${dataHubId}/players.json`
    );
  } catch (err) {
    console.warn(`Could not load playerStats file for match ${match.IdMatch}, using empty baseline:`, err);
  }
  return { matchId: String(match.IdMatch), liveMatch, playerStats };
  ```

- [ ] **Step 2: Run verification**
  Build the project or run Vitest to verify no compile errors.
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/app/api/tournament-stats/route.ts src/lib/tournament-stats-fetch.ts
  git commit -m "feat: support live match statistics compilation in API and fetcher"
  ```

---

### Task 3: Integrate Tournament Stats into Zustand Store

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Add store state and actions**
  Add `tournamentStats` and `statsFetchedAt` properties to `SimulationStore` interface and default initial state. Add `setTournamentStats` action.
  Modify `applyLiveResults(updates, options?: { silent?: boolean })` to skip prompts when `silent` is true.

  ```typescript
  // src/lib/store.ts additions
  tournamentStats: any | null;
  statsFetchedAt: string | null;
  setTournamentStats: (stats: any) => void;
  ```

- [ ] **Step 2: Verify store tests**
  Run store integration tests: `npm run test` (focusing on store tests)
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/lib/store.ts
  git commit -m "feat: store tournament stats in Zustand store"
  ```

---

### Task 4: Implement Background Sync Hook

**Files:**
- Create: `src/lib/use-live-sync.ts`

- [ ] **Step 1: Write useLiveSync hook**
  Implement the hook using React `useEffect`. It should trigger every 60 seconds, check `document.visibilityState === 'visible'`, fetch ESPN Scoreboard, update match scores silently, fetch `/api/tournament-stats`, and save to the Zustand store.

  ```typescript
  // src/lib/use-live-sync.ts
  import { useEffect, useState } from "react";
  import { useSimulation } from "./store";
  import { fetchTournamentStatsFromFifa } from "./tournament-stats-fetch";
  import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "./espn-match";
  import { buildLiveGroupResults } from "./sync-live-results";
  import { seed } from "./data";
  import { groupMatchToEntry } from "./schedule";
  import { ESPN_TEAM_MAP } from "./espn-mapping";

  const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce<Record<string, string>>(
    (acc, [localId, espnId]) => {
      acc[espnId] = localId;
      return acc;
    },
    {}
  );

  export function useLiveSync() {
    const applyLiveResults = useSimulation((s) => s.applyLiveResults);
    const setTournamentStats = useSimulation((s) => s.setTournamentStats);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
      let intervalId: number;

      const runSync = async () => {
        if (document.visibilityState !== "visible") return;
        setIsSyncing(true);
        try {
          // 1. Sync Match Results
          const res = await fetch(ESPN_SCOREBOARD_URL);
          if (res.ok) {
            const data = await res.json();
            const espnMatches = parseEspnScoreboard(data);
            const groupEntries = seed.groups.flatMap((group) =>
              group.matches.map((match, idx) => groupMatchToEntry(match, group.letter, {}, idx))
            );
            const { updates } = buildLiveGroupResults(groupEntries, espnMatches, ESPN_TO_LOCAL);
            applyLiveResults(updates); // Silently applies updates
          }

          // 2. Sync Stats
          let statsData;
          try {
            const statsRes = await fetch("/api/tournament-stats");
            if (statsRes.ok) {
              statsData = await statsRes.json();
            }
          } catch {
            statsData = await fetchTournamentStatsFromFifa();
          }
          if (statsData && !statsData.error) {
            setTournamentStats(statsData);
          }
        } catch (err) {
          console.error("Background sync failed:", err);
        } finally {
          setIsSyncing(false);
        }
      };

      intervalId = window.setInterval(runSync, 60000);
      runSync(); // Initial sync

      return () => window.clearInterval(intervalId);
    }, [applyLiveResults, setTournamentStats]);

    return { isSyncing };
  }
  ```

- [ ] **Step 2: Commit**
  Run:
  ```bash
  git add src/lib/use-live-sync.ts
  git commit -m "feat: add useLiveSync hook for background polling"
  ```

---

### Task 5: Integrate Hook into AppShell and Bind UI Components

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/TournamentStatsBoard.tsx`
- Modify: `src/components/SyncLiveResultsButton.tsx`

- [ ] **Step 1: Add hook to AppShell**
  Call `useLiveSync()` inside `AppShell.tsx` to start background updates.
  Show a subtle header indicator (e.g. a small pulse icon or "Đang cập nhật..." banner) when `isSyncing` is true.

- [ ] **Step 2: Update TournamentStatsBoard**
  Read statistics from the Zustand store instead of keeping local state and local intervals.
  
  ```typescript
  // Inside TournamentStatsBoard.tsx
  const statsData = useSimulation((s) => s.tournamentStats) || defaultStatsData;
  const fetchedAt = useSimulation((s) => s.statsFetchedAt);
  ```

- [ ] **Step 3: Update SyncLiveResultsButton**
  Update the button to trigger a manual run of the sync hook rather than prompting the user with blocking confirms.

- [ ] **Step 4: Verify complete application builds and tests pass**
  Run: `npm run test` and `npm run build`
  Expected: Success

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/components/AppShell.tsx src/components/TournamentStatsBoard.tsx src/components/SyncLiveResultsButton.tsx
  git commit -m "feat: connect background sync hook to AppShell and update stats UI"
  ```
