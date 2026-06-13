# Own Goals Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add own goals statistics tracking and display them as a new tab ("Phản lưới") in the Tournament Stats Board.

**Architecture:** Parse own goals from ESPN events (`event.ownGoal === true && event.team?.id !== espnTeamId`), save to player stats under metric `"OwnGoals"`, and aggregate in the leaderboards.

**Tech Stack:** React, Next.js API Routes, Vitest, Node.js

---

### Task 1: Update core types and metrics

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `scripts/lib/tournament-stats.mjs`

- [ ] **Step 1: Update METRIC_KEYS and types in core file**

Update `METRIC_KEYS` and `PlayerTotal` type in `src/lib/tournament-stats-core.ts`.

In `src/lib/tournament-stats-core.ts`:
```typescript
const METRIC_KEYS = {
  goals: "Goals",
  assists: "Assists",
  penalties: "Penalties",
  penaltiesScored: "PenaltiesScored",
  yellowCards: "YellowCards",
  directRedCards: "DirectRedCards",
  indirectRedCards: "IndirectRedCards",
  ownGoals: "OwnGoals", // Add this
} as const;

type PlayerTotal = {
  playerId: string;
  name: string;
  shortName: string;
  pictureUrl: string | null;
  team: ReturnType<typeof mapTeam>;
  goals: number;
  assists: number;
  ownGoals: number; // Add this
  penalties: number;
  penaltiesScored: number;
  yellowCards: number;
  redCards: number;
};
```

In `createPlayerTotal`:
```typescript
function createPlayerTotal(
  player: Omit<PlayerTotal, "goals" | "assists" | "ownGoals" | "penalties" | "penaltiesScored" | "yellowCards" | "redCards">,
): PlayerTotal {
  return {
    ...player,
    goals: 0,
    assists: 0,
    ownGoals: 0, // Add this
    penalties: 0,
    penaltiesScored: 0,
    yellowCards: 0,
    redCards: 0,
  };
}
```

In `aggregatePlayerStats`:
```typescript
      total.goals += statValue(rows, METRIC_KEYS.goals);
      total.assists += statValue(rows, METRIC_KEYS.assists);
      total.ownGoals += statValue(rows, METRIC_KEYS.ownGoals); // Add this
```

- [ ] **Step 2: Update METRIC_KEYS and total builder in scripts core**

In `scripts/lib/tournament-stats.mjs`:
```javascript
const METRIC_KEYS = {
  goals: "Goals",
  assists: "Assists",
  penalties: "Penalties",
  penaltiesScored: "PenaltiesScored",
  yellowCards: "YellowCards",
  directRedCards: "DirectRedCards",
  indirectRedCards: "IndirectRedCards",
  ownGoals: "OwnGoals", // Add this
};
```

In `createPlayerTotal`:
```javascript
function createPlayerTotal(player) {
  return {
    ...player,
    goals: 0,
    assists: 0,
    ownGoals: 0, // Add this
    penalties: 0,
    penaltiesScored: 0,
    yellowCards: 0,
    redCards: 0,
  };
}
```

In `aggregatePlayerStats`:
```javascript
      total.goals += statValue(rows, METRIC_KEYS.goals);
      total.assists += statValue(rows, METRIC_KEYS.assists);
      total.ownGoals += statValue(rows, METRIC_KEYS.ownGoals); // Add this
```

- [ ] **Step 3: Update buildLeaderboards to include ownGoals leaderboard**

Update `buildLeaderboards` in both `src/lib/tournament-stats-core.ts` and `scripts/lib/tournament-stats.mjs`:
```typescript
  return {
    goals: leaderboard(players, "goals", limit),
    assists: leaderboard(players, "assists", limit),
    penalties,
    ownGoals: leaderboard(players, "ownGoals", limit), // Add this
    yellowCards: leaderboard(players, "yellowCards", limit),
    redCards: leaderboard(players, "redCards", limit),
  };
```

- [ ] **Step 4: Commit**
```bash
git add src/lib/tournament-stats-core.ts scripts/lib/tournament-stats.mjs
git commit -m "feat: add ownGoals to core player stats data models"
```

---

### Task 2: Implement own goals parsing from ESPN

**Files:**
- Modify: `src/lib/tournament-stats-core.ts`
- Modify: `scripts/lib/tournament-stats.mjs`

- [ ] **Step 1: Update patchMatchPlayerStats in core**

Modify `patchMatchPlayerStats` in `src/lib/tournament-stats-core.ts` to find and patch own goals.

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

  const goalEvents = details.filter((event: any) => event.scoringPlay && !event.ownGoal && String(event.team?.id) === espnTeamId);

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
      let statsRows = playerStats[playerId] as [string, number, boolean][];
      if (!statsRows) {
        statsRows = [["Goals", 0, false]];
        playerStats[playerId] = statsRows;
      }

      let goalsRowIndex = statsRows.findIndex((row) => row[0] === "Goals");
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

  // Own goal events: ownGoal: true, and event.team.id is NOT our espnTeamId (since the score went to the opponent)
  const ownGoalEvents = details.filter((event: any) => event.scoringPlay && event.ownGoal && String(event.team?.id) !== espnTeamId);
  const espnOwnGoalsByName: Record<string, number> = {};
  for (const event of ownGoalEvents) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
    if (athleteName) {
      espnOwnGoalsByName[athleteName] = (espnOwnGoalsByName[athleteName] ?? 0) + 1;
    }
  }

  for (const [espnName, ogCount] of Object.entries(espnOwnGoalsByName)) {
    const matchedPlayer = teamPlayers.find((p: any) => {
      const pName = p.PlayerName?.[0]?.Description ?? p.ShortName?.[0]?.Description ?? "";
      return matchesPlayerName(espnName, pName);
    });

    if (matchedPlayer) {
      const playerId = String(matchedPlayer.IdPlayer);
      let statsRows = playerStats[playerId] as [string, number, boolean][];
      if (!statsRows) {
        statsRows = [["OwnGoals", 0, false]];
        playerStats[playerId] = statsRows;
      }

      let ogRowIndex = statsRows.findIndex((row) => row[0] === "OwnGoals");
      if (ogRowIndex === -1) {
        statsRows.push(["OwnGoals", 0, false]);
        ogRowIndex = statsRows.length - 1;
      }

      const currentOgs = Number(statsRows[ogRowIndex][1]) || 0;
      if (currentOgs < ogCount) {
        statsRows[ogRowIndex][1] = ogCount;
      }
    }
  }
}
```

- [ ] **Step 2: Update patchMatchPlayerStats in scripts**

Apply the same code changes to `patchMatchPlayerStats` in `scripts/lib/tournament-stats.mjs`.

- [ ] **Step 3: Commit**
```bash
git add src/lib/tournament-stats-core.ts scripts/lib/tournament-stats.mjs
git commit -m "feat: parse and patch own goals from ESPN summaries"
```

---

### Task 3: Update offline fallback data and UI

**Files:**
- Modify: `data/fifa-tournament-stats.json`
- Modify: `src/components/TournamentStatsBoard.tsx`

- [ ] **Step 1: Add empty ownGoals list to offline fallback**

Add `"ownGoals": []` inside `"leaderboards"` in `data/fifa-tournament-stats.json`.

```json
  "leaderboards": {
    "goals": [ ... ],
    "assists": [ ... ],
    "penalties": [ ... ],
    "ownGoals": [],
    "yellowCards": [ ... ],
    "redCards": [ ... ]
  }
```

- [ ] **Step 2: Update Category types and array in UI**

In `src/components/TournamentStatsBoard.tsx`:
Modify `CategoryId` type:
```typescript
type CategoryId =
  | "goals"
  | "assists"
  | "penalties"
  | "ownGoals" // Add this
  | "yellowCards"
  | "redCards";
```

Modify `CATEGORIES` array to include the tab after `"penalties"`:
```typescript
const CATEGORIES: Array<{
  id: CategoryId;
  label: string;
  heading: string;
  valueLabel: string;
}> = [
  { id: "goals", label: "Bàn thắng", heading: "Vua phá lưới", valueLabel: "bàn" },
  { id: "assists", label: "Kiến tạo", heading: "Kiến tạo nhiều nhất", valueLabel: "kiến tạo" },
  { id: "penalties", label: "Penalty", heading: "Sút penalty nhiều nhất", valueLabel: "lần sút" },
  { id: "ownGoals", label: "Phản lưới", heading: "Phản lưới nhà nhiều nhất", valueLabel: "bàn" }, // Add this
  { id: "yellowCards", label: "Thẻ vàng", heading: "Nhận thẻ vàng nhiều nhất", valueLabel: "thẻ" },
  { id: "redCards", label: "Thẻ đỏ", heading: "Nhận thẻ đỏ nhiều nhất", valueLabel: "thẻ" },
];
```

- [ ] **Step 3: Commit**
```bash
git add data/fifa-tournament-stats.json src/components/TournamentStatsBoard.tsx
git commit -m "feat: add Phản lưới tab to TournamentStatsBoard UI"
```

---

### Task 4: Add unit tests

**Files:**
- Modify: `src/lib/__tests__/tournament-stats.test.ts`

- [ ] **Step 1: Write test for own goals parsing and aggregation**

Add a test case in `src/lib/__tests__/tournament-stats.test.ts` verifying own goals.

```typescript
  it("patches own goals from ESPN summary correctly", () => {
    const liveMatch = {
      HomeTeam: {
        IdTeam: "1",
        Abbreviation: "MEX",
        TeamName: [{ Locale: "en-GB", Description: "Mexico" }],
        Players: [
          {
            IdPlayer: "10",
            PlayerName: [{ Locale: "en-GB", Description: "Alex Player" }],
            ShortName: [{ Locale: "en-GB", Description: "Alex Player" }],
          }
        ]
      },
      AwayTeam: {
        IdTeam: "2",
        Abbreviation: "USA",
        TeamName: [{ Locale: "en-GB", Description: "USA" }],
        Players: []
      }
    };

    const playerStats = {};
    const espnSummary = {
      header: {
        competitions: [
          {
            details: [
              {
                scoringPlay: true,
                ownGoal: true,
                team: { id: "2" }, // Conceded by USA's opponent (Mexico), so team: "2" got the goal.
                participants: [
                  {
                    athlete: { displayName: "Alex Player" }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    // Patch Mexico's stats (fifaTeamId = "1", espnTeamId = "1")
    patchMatchPlayerStats(liveMatch, playerStats, espnSummary, "1", "1");

    expect(playerStats["10"]).toBeDefined();
    expect(playerStats["10"].find((r: any) => r[0] === "OwnGoals")[1]).toBe(1);
  });
```

- [ ] **Step 2: Run tests to verify**

Run: `rtk npm run test`
Expected: All tests pass, including the new own goals patch test.

- [ ] **Step 3: Commit**
```bash
git add src/lib/__tests__/tournament-stats.test.ts
git commit -m "test: add own goals parsing and aggregation unit tests"
```
