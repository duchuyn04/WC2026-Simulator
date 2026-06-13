# Design Spec: FIFA API Fallback and ESPN Data Merging

This document describes the design for handling FIFA API failures (offline fallback) and patching missing tournament stats (such as G. Reyna's missing goal) by merging with ESPN live events data.

## Problem Description

The tournament statistics board ("Vua phá lưới") relies entirely on official statistics from the FIFA API. However:
1. **API Failures / Offline Mode**: If the FIFA API fails, has high latency, or is down, the statistics board fails to display any data or shows an error.
2. **Missing Stats Discrepancy**: The FIFA API sometimes omits match details or individual player statistics (e.g., in USA 4 - 1 Paraguay, G. Reyna's goal at `90'+8'` was omitted from the player stats response, resulting in 0 goals recorded, while ESPN correctly recorded it).

## Proposed Solution

We will implement a two-layered solution at the API route and direct fetch levels.

### 1. Offline Fallback
- We will wrap all fetches to the FIFA API in a `try-catch` block.
- If the calendar fetch or any player statistics fetch fails, we will fall back to using the local cached stats file `fifa-tournament-stats.json`.
- The `source.provider` field will be changed to `"FIFA (Offline Fallback)"` to indicate that offline cached data is being displayed.

### 2. ESPN Data Merging (Data Correction)
During the stats aggregation process:
- We will fetch the ESPN scoreboard to obtain actual match scores.
- For each completed match:
  - We will calculate the total goals from the FIFA `playerStats` object (sum of all players' `"Goals"` stats).
  - If the total FIFA goals count is less than the ESPN match score (excluding own goals, which are handled separately), we trigger the patching mechanism.
  - We will fetch the ESPN summary endpoint (`/summary?event={espnGameId}`) to parse the match events timeline.
  - We will filter timeline events for goals (`scoringPlay` is true and `ownGoal` is false).
  - For each goal, we will match the scorer's name (from ESPN) with the player directory of the teams in `liveMatch` using a word overlap normalization algorithm.
  - If a player is found and their goal count in FIFA `playerStats` is less than their actual goal count in the ESPN timeline, we will override/increment the `"Goals"` value in `playerStats` for that player ID.
- Once stats are patched, the normal `buildLeaderboards` function runs and compiles the corrected leaderboards.

## Affected Components

### 1. API Route
- [route.ts](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/app/api/tournament-stats/route.ts)
  - Implement fallback to local static JSON.
  - Implement ESPN score fetching and player stats patching before building the leaderboards.

### 2. Client-side Fetch Helper
- [tournament-stats-fetch.ts](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/lib/tournament-stats-fetch.ts)
  - Implement the same fallback and patching logic for direct browser fetches.

### 3. Core Stats Helpers
- [tournament-stats-core.ts](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/lib/tournament-stats-core.ts)
  - Move common player name matching logic and ESPN matching functions to core helpers.

## Verification Plan

### Automated Tests
- Unit tests to verify that `playerStats` is correctly patched with missing goals when comparing FIFA vs ESPN scores.
- Verification that when the FIFA API fails, the fallback static JSON is served correctly.

### Manual Verification
- View the "Thống kê" tab and verify that "Vua phá lưới" now contains Giovanni REYNA with 1 goal.
- Verify that the total match count matches the completed matches.
