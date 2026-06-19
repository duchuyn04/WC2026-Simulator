# Live Tab Design Spec

**Date:** 2025-06-17
**Project:** WC 2026 Simulator
**Status:** Approved

## Overview

Add a "Live" tab to the WC 2026 Simulator that shows real-time match updates (live scores, match events) and upcoming matches within 1-2 days. Users can follow match progress without scrolling or complex filtering.

## UI Structure

### Tab placement

New tab `"live"` in the main tab bar alongside existing simulator & schedule tabs. 
- **Label:** "Trực tiếp" (Vietnamese) with a red live dot indicator when any match is currently live
- **Tab ID:** `"live"`
- Added to both `TAB_IDS` and `SCROLLABLE_TABS` in `tabs.ts`

### Layout: Card-based, grouped by date

The Live tab uses a card layout (not a table), with matches grouped into sections:

#### Toggle bar
- Two toggle buttons at top: **🔥 LIVE** | **⏰ Sắp đá**
- Default: both active (shows everything)
- Each toggle filters its section independently

#### Section: 🔴 ĐANG DIỄN RA (Live matches)
- Shown when toggle "LIVE" is active
- Each live match renders as a **large card** with:
  - Gradient background (dark red/black, `#1a0a0a` → `#2d0a0a`, red border `#ef444440`)
  - Full team flags (emoji) + team names
  - Large score display (36px, green `#22c55e`)
  - Live indicator: red pulsing dot + minute (e.g. `🔴 LIVE · 72'`)
  - **Match events strip** below score: goals (⚽), yellow cards (🟡), red cards (🟥), penalties — shown as compact timeline
- Multiple live matches stack vertically
- Section heading "ĐANG DIỄN RA" with pulsing red dot

#### Section: 📅 HÔM NAY / NGÀY MAI (Upcoming matches)
- Shown when toggle "Sắp đá" is active
- Grouped by date: "HÔM NAY · DD/MM" (amber `#f59e0b`), "NGÀY MAI · DD/MM" (blue `#60a5fa`)
- Each match a **compact card** (no gradient) with:
  - Team flag + name (left & right)
  - Kickoff time in center (ICT / Asia/Ho_Chi_Minh)
  - Stadium name below time
- Cards stack vertically under each date heading
- Auto-determines "today" and "tomorrow" from match dates

#### Empty state
- No live matches + no upcoming matches in 1-2 days → show "Không có trận đấu trực tiếp hoặc sắp đá trong 1-2 ngày tới."

## Data Sources

### Live scores & match events
- **ESPN Scoreboard API** — currently fetched inside `SchedulePanel.tsx` via local `useEspnLiveScores` hook
- **Refactor:** Extract `useEspnLiveScores` into shared `src/lib/use-espn-live-scores.ts` so LivePanel and SchedulePanel share the same data source
- Fetch interval: 30s (same as existing)
- `EspnScoreboardMatch` type provides: scores, clock, state (pre/in/post), shortDetail
- **New:** Parse match events (scoring plays, cards) from ESPN play-by-play or scoreboard detail if available
- Match events strip shows: goal events with scorer + minute, card events with player + minute

### Match schedule
- Existing `schedule.ts` data with `ScheduleEntry[]`
- Filter by `date` within next 2 days (today + tomorrow)
- Use existing `ESPN_TO_LOCAL` mapping

### Team data
- Existing `Team` type with `id`, `name`, `code`, flag emoji via `FlagIcon`

## Components

### `LivePanel` (new)
Main panel component for the Live tab. Renders:
1. Toggle bar (LIVE / Sắp đá)
2. Live matches section (if any)
3. Upcoming matches sections (if any)
4. Empty state

### `LiveMatchCard` (new)
Large card for a single live match:
- Props: `entry: ScheduleEntry`, `espnMatch: EspnScoreboardMatch`, `events: MatchEvent[]`
- Renders flags, team names, score, clock, live indicator, events strip
- Click card → opens MatchStatsModal (existing) for detail

### `UpcomingMatchCard` (new)
Compact card for scheduled match:
- Props: `entry: ScheduleEntry`
- Renders flags, team names, time, stadium
- Links to team pages via existing `Link href="/teams/..."`

### Reuse from existing
- `FlagIcon` — team flag display
- `MatchStatsModal` — match detail modal on click
- `H2HModal` — head-to-head history
- Team `Link` components
- `isEspnMatchLive`, `getEspnLiveClock`, `hasEspnMatchScore` from `espn-match.ts`
- `buildLiveGroupResults` from `sync-live-results.ts` (if needed for score sync)

## State Management

### Store additions (`store.ts`)
- `activeTab: TabId` — already exists, add `"live"` to `TAB_IDS`
- No new persistent state needed (Live tab is ephemeral/real-time)

### Tab system (`tabs.ts`)
- Add `"live"` to `TAB_IDS` and `SCROLLABLE_TABS` constants
- Update `TabId` type

### Data flow
1. `useEspnLiveScores` (existing hook, in SchedulePanel) — fetch ESPN scoreboard every 30s
2. `useSchedule` (existing hook) — get all matches
3. LivePanel computes: filter schedule by date (today+tomorrow), match ESPN data, extract events

## Data: Match Events

### Event type
```ts
type MatchEvent = {
  type: "goal" | "yellow-card" | "red-card" | "penalty" | "substitution";
  player?: string;
  team?: string;
  minute: number;
  detail?: string; // e.g. "PEN", "OG"
};
```

### Parsing
- ESPN scoreboard data includes `competitions[0].competitors[0].records` or similar for events
- Fallback: if no events available, show only score + clock (no events strip)
- Events strip max 4-5 items, oldest → newest left to right

## Error Handling

- **ESPN API unavailable** → hide live section, show only upcoming matches
- **No matches in range** → show empty state message
- **Partial data** (e.g. score but no events) → show what's available
- Graceful degradation — never block the whole panel due to one data source

## Testing

- Unit test: `buildLiveGroupResults` still works
- Unit test: date filtering (today/tomorrow detection)
- Unit test: event parsing from ESPN data
- E2E: Live tab renders with mocked ESPN data
- E2E: toggle between LIVE / Sắp đá filters correctly
- E2E: empty state renders when no matches

## Out of Scope (YAGNI)

- Push notifications
- Historical match archive/live earlier than today
- Custom event filtering (show only goals)
- Team/player stats within Live tab (use MatchStatsModal instead)
