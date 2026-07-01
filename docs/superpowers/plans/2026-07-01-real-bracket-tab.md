# Real Bracket Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `Bracket` tab in the schedule view, positioned between `BXH Thực tế` and `Thống kê`, using real ESPN knockout winners.

**Architecture:** Reuse existing schedule real-data resolution and the existing `BracketTree`. Do not add a new fetch path or new bracket layout. The new tab builds a read-only `ResolvedKnockoutMatch` map from the already-resolved knockout `ScheduleEntry` values produced by `useSchedule()`.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript strict, Vitest.

---

### Task 1: Cover Real Knockout Winner Matching

**Files:**
- Modify: `src/lib/__tests__/hooks.test.ts`

- [ ] **Step 1: Add a regression test for delayed ESPN kickoff plus score fallback**

Add this test inside `describe("useSchedule", () => { ... })`, after the existing `uses real ESPN knockout winners for later schedule rounds` test:

```ts
it("uses delayed ESPN kickoff and score fallback for real knockout winners", async () => {
  const groupA = seed.groups.find((group) => group.letter === "A")!;
  const groupB = seed.groups.find((group) => group.letter === "B")!;
  const match73 = seed.knockout.find((match) => match.matchNumber === 73)!;
  const home = groupA.teams[1]!;
  const away = groupB.teams[1]!;
  const delayedDate = new Date(new Date(match73.date).getTime() + 60 * 60 * 1000).toISOString();
  const now = vi.spyOn(Date, "now").mockReturnValue(new Date("2026-07-01T12:00:00Z").getTime());

  mockEspnApis({
    events: [{
      id: "delayed-73",
      date: delayedDate,
      competitions: [{
        status: {
          displayClock: "90'",
          type: { name: "STATUS_FULL_TIME", state: "post", shortDetail: "FT" },
        },
        competitors: [
          { homeAway: "home", score: "2", team: { id: ESPN_TEAM_MAP[home.id] } },
          { homeAway: "away", score: "1", team: { id: ESPN_TEAM_MAP[away.id] } },
        ],
      }],
    }],
  });

  const { result } = renderHook(() => useSchedule());

  await waitFor(() => {
    const match90 = result.current.find((entry) => entry.matchNumber === 90);
    expect(match90?.home?.id).toBe(home.id);
  });

  now.mockRestore();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

Run:

```bash
npx vitest run src/lib/__tests__/hooks.test.ts
```

Expected: the new test fails because `realKnockoutWinners` currently requires exact kickoff and ESPN `winnerId`.

### Task 2: Fix Real ESPN Knockout Winner Resolution

**Files:**
- Modify: `src/lib/hooks.ts`

- [ ] **Step 1: Replace exact kickoff matching with the existing six-hour match window**

In `src/lib/hooks.ts`, replace `sameKickoff` with:

```ts
function sameMatchWindow(left?: string, right?: string) {
  if (!left || !right) return false;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  return (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    Math.abs(leftTime - rightTime) <= 6 * 60 * 60 * 1000
  );
}
```

- [ ] **Step 2: Add local score parsing and winner resolution helpers**

Add these helpers near `hasKickedOff`:

```ts
function parseEspnScore(value?: string) {
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function resolveEspnWinnerId(match: EspnScoreboardMatch) {
  const winnerId = match.winnerId ? ESPN_TO_LOCAL[match.winnerId] : undefined;
  if (winnerId) return winnerId;

  const homeScore = parseEspnScore(match.homeScore);
  const awayScore = parseEspnScore(match.awayScore);
  if (homeScore === null || awayScore === null || homeScore === awayScore) return undefined;

  return homeScore > awayScore
    ? match.homeId ? ESPN_TO_LOCAL[match.homeId] : undefined
    : match.awayId ? ESPN_TO_LOCAL[match.awayId] : undefined;
}
```

- [ ] **Step 3: Update `realKnockoutWinners` to use the new helpers**

Replace the ESPN match lookup and winner extraction inside `realKnockoutWinners` with:

```ts
const espn = espnMatches.find((candidate) => {
  const homeId = candidate.homeId ? ESPN_TO_LOCAL[candidate.homeId] : undefined;
  const awayId = candidate.awayId ? ESPN_TO_LOCAL[candidate.awayId] : undefined;
  const sameTeams =
    (homeId === match.resolvedHome?.team.id && awayId === match.resolvedAway?.team.id) ||
    (homeId === match.resolvedAway?.team.id && awayId === match.resolvedHome?.team.id);

  return (
    candidate.state === "post" &&
    hasKickedOff(candidate.date) &&
    sameMatchWindow(candidate.date, match.date) &&
    sameTeams
  );
});
const winnerId = espn ? resolveEspnWinnerId(espn) : undefined;
```

- [ ] **Step 4: Run the focused hook tests**

Run:

```bash
npx vitest run src/lib/__tests__/hooks.test.ts
```

Expected: all tests in `hooks.test.ts` pass.

### Task 3: Make BracketTree Support Read-Only Rendering

**Files:**
- Modify: `src/components/bracket/BracketTree.tsx`

- [ ] **Step 1: Make winner picking optional in component types**

Change the top-level props and internal slot props to optional callbacks:

```ts
type Props = {
  matches: Map<number, ResolvedKnockoutMatch>;
  onPickWinner?: (matchNumber: number, teamId: string | null) => void;
};
```

For `BracketMatchSlot`, `BracketHalf`, and `CenterMatches`, change each `onPickWinner` type to optional.

- [ ] **Step 2: Disable team click handlers when read-only**

In `BracketMatchSlot`, change `canPick` to:

```ts
const canPick = !!(onPickWinner && home?.team && away?.team);
```

Keep the existing `TeamBadge` `onClick` expressions, guarded by `canPick`, so read-only mode passes `undefined` and renders plain spans.

- [ ] **Step 3: Guard callback calls in bracket halves and center matches**

Use optional chaining where callbacks are passed down:

```tsx
onPickWinner={(teamId) => onPickWinner?.(slot.matchNumber, teamId)}
```

For final and third-place matches:

```tsx
onPickWinner={(teamId) => onPickWinner?.(final.matchNumber, teamId)}
onPickWinner={(teamId) => onPickWinner?.(third.matchNumber, teamId)}
```

- [ ] **Step 4: Change helper copy for read-only mode**

Inside `BracketTree`, define:

```ts
const isReadOnly = !onPickWinner;
```

Use `isReadOnly` in the hint text:

```tsx
{isReadOnly
  ? "Bracket tự cập nhật từ ESPN · Kéo xem các vòng · Chụm hoặc +/− phóng to"
  : "Bấm đội · Kéo xem các vòng · Chụm hoặc +/− phóng to"}
```

Desktop copy:

```tsx
{isReadOnly
  ? `Bracket tự cập nhật từ ESPN · Lăn chuột phóng to · Kéo nền di chuyển · Double-click trận phóng to (${zoomPercent}%)`
  : `Bấm đội chọn người thắng · Lăn chuột phóng to (tối thiểu 100%) · Kéo nền di chuyển · Double-click trận phóng to (${zoomPercent}%)`}
```

### Task 4: Add the Real Bracket Tab

**Files:**
- Create: `src/components/bracket/RealBracket.tsx`
- Modify: `src/components/matches/SchedulePanel.tsx`

- [ ] **Step 1: Create `RealBracket` using resolved schedule entries**

Create `src/components/bracket/RealBracket.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { seed } from "@/lib/data";
import type { ResolvedKnockoutMatch } from "@/lib/fifa/types";
import type { ScheduleEntry } from "@/lib/schedule";
import { BracketTree } from "./BracketTree";

type Props = {
  entries: ScheduleEntry[];
};

export function RealBracket({ entries }: Props) {
  const matches = useMemo(() => {
    const entriesByNumber = new Map(
      entries
        .filter((entry) => entry.kind === "knockout")
        .map((entry) => [entry.matchNumber, entry])
    );

    return new Map<number, ResolvedKnockoutMatch>(
      seed.knockout.map((match) => {
        const entry = entriesByNumber.get(match.matchNumber);
        return [
          match.matchNumber,
          {
            ...match,
            resolvedHome: entry?.home
              ? { team: entry.home, label: entry.homePlaceholder }
              : null,
            resolvedAway: entry?.away
              ? { team: entry.away, label: entry.awayPlaceholder }
              : null,
            winner: entry?.winner ?? null,
          },
        ];
      })
    );
  }, [entries]);

  return (
    <div className="h-[calc(100vh-220px)] min-h-[520px]">
      <BracketTree matches={matches} />
    </div>
  );
}
```

- [ ] **Step 2: Add the schedule filter**

In `src/components/matches/SchedulePanel.tsx`, import:

```ts
import { RealBracket } from "@/components/bracket/RealBracket";
```

Change the filter type:

```ts
type SchedulePanelFilter = ScheduleFilter | "espn-standings" | "real-bracket" | "stats";
```

Update `FILTERS` order:

```ts
const FILTERS: { id: SchedulePanelFilter; label: string }[] = [
  { id: "all", label: "Tất cả trận đấu" },
  { id: "group", label: "Vòng bảng" },
  { id: "knockout", label: "Nhánh Knockout" },
  { id: "espn-standings", label: "BXH Thực tế" },
  { id: "real-bracket", label: "Bracket" },
  { id: "stats", label: "Thống kê" },
];
```

- [ ] **Step 3: Exclude real bracket from list/search toolbar logic**

Update checks that currently special-case standings/stats:

```ts
if (filter === "espn-standings" || filter === "real-bracket" || filter === "stats") return [];
```

Toolbar condition:

```tsx
{filter !== "espn-standings" && filter !== "real-bracket" && filter !== "stats" && (
```

Favorite modes hidden filters:

```ts
f.id !== "knockout" &&
f.id !== "espn-standings" &&
f.id !== "real-bracket" &&
f.id !== "stats"
```

- [ ] **Step 4: Render the new tab body**

In the content branch, insert `real-bracket` between standings and stats:

```tsx
{filter === "stats" ? (
  <TournamentStatsBoard />
) : filter === "real-bracket" ? (
  <RealBracket entries={allEntries} />
) : filter === "espn-standings" ? (
```

### Task 5: Verify and Commit

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npx vitest run src/lib/__tests__/hooks.test.ts src/lib/__tests__/espn-match.test.ts
```

Expected: both test files pass.

- [ ] **Step 2: Run ESLint only on changed source and test files**

Run:

```bash
npx eslint src/lib/hooks.ts src/lib/__tests__/hooks.test.ts src/components/bracket/BracketTree.tsx src/components/bracket/RealBracket.tsx src/components/matches/SchedulePanel.tsx
```

Expected: no lint errors in touched files.

- [ ] **Step 3: Review the diff**

Run:

```bash
git diff -- src/lib/hooks.ts src/lib/__tests__/hooks.test.ts src/components/bracket/BracketTree.tsx src/components/bracket/RealBracket.tsx src/components/matches/SchedulePanel.tsx
```

Expected: only the real bracket feature and its focused test changed.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add src/lib/hooks.ts src/lib/__tests__/hooks.test.ts src/components/bracket/BracketTree.tsx src/components/bracket/RealBracket.tsx src/components/matches/SchedulePanel.tsx
git commit -m "feat: add real bracket tab"
```
