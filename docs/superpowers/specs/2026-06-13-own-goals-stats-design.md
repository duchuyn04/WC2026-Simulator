# Design Specification: Own Goals Statistics Leaderboard
Date: 2026-06-13

## 1. Overview
The goal is to track and display own goals scored by players in the FIFA World Cup 2026 simulator. Since own goals are not reliably detailed per-player in the FIFA playerStats API, we will extract them from the ESPN Match Summary events (keyEvents and details) where `ownGoal === true`.

## 2. Requirements & UI Changes
- **Tab Name**: "Phản lưới"
- **Position**: Placed after the "Penalty" tab and before the "Thẻ vàng" tab in the `TournamentStatsBoard` component.
- **Value Label**: "bàn" (e.g., "1 bàn", "2 bàn").
- **Display Limit**: Top 10 players.

## 3. Architecture & Data Flow

### 3.1. Parsing own goals from ESPN Summary
During the synchronization of stats with ESPN:
1. When patching stats for a specific team (`espnTeamId`):
   - Find own goal events conceded by `espnTeamId`. In ESPN summary events, an own goal scored by a player of `espnTeamId` is credited to the opponent team. Therefore, `event.ownGoal === true && String(event.team?.id) !== espnTeamId`.
   - Match the athlete's name in the event to a player in `liveMatch.HomeTeam.Players` or `liveMatch.AwayTeam.Players`.
   - Increment or set the `"OwnGoals"` statistic in `playerStats` for that player.

### 3.2. Code Changes
- **`src/lib/tournament-stats-core.ts` & `scripts/lib/tournament-stats.mjs`**:
  - Add `ownGoals: "OwnGoals"` to `METRIC_KEYS`.
  - Add `ownGoals` count to `PlayerTotal` type and aggregation/initialization helpers.
  - Sửa `patchMatchPlayerStats` to parse and store own goals:
    - Group own goals from ESPN:
      ```typescript
      const ownGoalEvents = details.filter((event: any) => event.scoringPlay && event.ownGoal && String(event.team?.id) !== espnTeamId);
      const espnOwnGoalsByName: Record<string, number> = {};
      for (const event of ownGoalEvents) {
        const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
        if (athleteName) {
          espnOwnGoalsByName[athleteName] = (espnOwnGoalsByName[athleteName] ?? 0) + 1;
        }
      }
      ```
    - Patch the own goals into `playerStats` with key `"OwnGoals"`.
  - Sửa `buildLeaderboards` to include `ownGoals` leaderboard:
    ```typescript
    ownGoals: leaderboard(players, "ownGoals", limit)
    ```

- **`src/components/TournamentStatsBoard.tsx`**:
  - Add `"ownGoals"` to `CategoryId` type.
  - Insert category in `CATEGORIES` array:
    ```typescript
    { id: "ownGoals", label: "Phản lưới", heading: "Phản lưới nhà nhiều nhất", valueLabel: "bàn" }
    ```

- **`data/fifa-tournament-stats.json`**:
  - Add `"ownGoals": []` to `leaderboards` structure to prevent errors on initial rendering of fallback.

## 4. Test Verification
- Add test in `src/lib/__tests__/tournament-stats.test.ts` verifying own goal parsing and aggregation:
  - Mock match with `ownGoal: true` event in ESPN summary.
  - Assert the correct player gets their `ownGoals` count increased.
  - Assert the own goals leaderboard ranks the player correctly.
