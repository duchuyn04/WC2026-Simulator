# Live Season High-Priority Features

## Scope

1. Sync finished ESPN group scores into simulator (`matchResults`)
2. Fix outdated E2E smoke test (stadium in group detail modal)
3. Auto-refresh tournament stats every 5 minutes
4. Client-side FIFA fetch fallback for GitHub Pages (no `/api` routes)

## Sync Live Results

- Pure function `buildLiveGroupResults` maps ESPN `post` matches → `MatchResult`
- Store action `applyLiveResults` batch-updates scores + knockout sync
- UI button in simulator header: "Đồng bộ kết quả thật"

## Tournament Stats

- Port leaderboard logic to `src/lib/tournament-stats-core.ts`
- `fetchTournamentStatsFromFifa()` for browser (FIFA API, same as H2H)
- `TournamentStatsBoard`: try `/api/tournament-stats`, fallback to client, poll 5m

## Testing

- Unit: `sync-live-results.test.ts`, store integration for `applyLiveResults`
- E2E: update stadium test to open group A detail modal