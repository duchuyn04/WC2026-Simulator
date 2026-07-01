# Real Bracket Tab Design

## Goal

Add a read-only `Bracket` tab to the schedule view. It shows the real knockout bracket from ESPN results, separate from the user-editable simulation bracket.

The tab appears in the schedule filter bar between `BXH Thực tế` and `Thống kê`:

`Tất cả trận đấu / Vòng bảng / Nhánh Knockout / BXH Thực tế / Bracket / Thống kê`

## Scope

- Add a new schedule filter id for the real bracket tab.
- Reuse the existing simulated bracket UI/UX: bracket tree, connectors, winner styling, placeholder slots, zoom, pan, and fit controls.
- Make the bracket read-only. Users cannot pick or clear winners.
- Use ESPN scoreboard data as the only source of real knockout winners.
- Keep user simulation state untouched.

Out of scope:

- No new API route.
- No manual editing in the real bracket.
- No persistence to Zustand or localStorage for real bracket winners.
- No separate visual design for the real bracket.

## Architecture

`SchedulePanel` gets a new filter option:

- id: `real-bracket`
- label: `Bracket`
- position: after `espn-standings`, before `stats`

When selected, it renders a new read-only bracket component, likely `RealBracket` or `EspnBracket`.

The new component receives `espnMatches` from the existing app flow. It does not fetch data itself.

The existing `BracketTree` should be reused with the smallest change possible: make `onPickWinner` optional. When absent, team badges do not receive click handlers and the helper text explains that the bracket updates from ESPN.

`KnockoutSyncBanner` is not shown in this tab because this is not a user-editable simulation.

## Data Flow

1. `AppShell` already loads ESPN scoreboard matches.
2. `SchedulePanel` passes those matches to the real bracket tab.
3. The real bracket maps seed knockout entries to ESPN matches using the existing `findEspnMatch` helper.
4. Only ESPN matches with `state === "post"` contribute winners.
5. Winner resolution prefers ESPN `winnerId` when available. Score comparison is the fallback.
6. Existing knockout resolver builds the bracket from real ESPN winners.

Unresolved teams or matches stay as the existing bracket placeholder display.

## Behavior

- If a knockout match has not started, the bracket slot remains unresolved.
- If a match is live, teams may appear if already resolvable, but no winner is selected until ESPN reports `post`.
- If ESPN reports a post-match `winnerId`, that team is highlighted as winner.
- If ESPN lacks a winner id but has a final score, the higher score determines the winner.
- If ESPN data is missing or unmapped, the bracket still renders with placeholders.
- User clicks on team rows do nothing in the real bracket.

## UI/UX

The real bracket copies the simulation bracket UI:

- same bracket tree layout
- same placeholder slots
- same flag/placeholder flag treatment
- same zoom, pan, and `Vừa khung` controls
- same winner highlight styling

Only the helper copy changes to read-only language, for example:

`Bracket tự cập nhật từ ESPN · Kéo/zoom để xem`

## Testing

Add focused unit coverage for the real-bracket winner mapping:

- post-match ESPN winner id becomes a bracket winner
- pre/live ESPN matches do not choose a winner
- score fallback works when ESPN has no winner id
- missing ESPN mapping leaves the match unresolved

If existing component-test patterns make it cheap, add a smoke test that the `Bracket` filter renders. Otherwise skip a heavy component test and rely on the logic test plus the reused bracket UI.
