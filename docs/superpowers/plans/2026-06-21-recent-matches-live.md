# Recent Matches in Live Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm section **"Các trận gần nhất"** vào đầu tab Trực tiếp, nút lọc **"Đã đá"**, hiển thị các trận đã kết thúc từ ESPN, hỗ trợ đồng bộ tỉ số từng trận và hàng loạt vào simulator.

**Architecture:** Tách helper `formatDateLabel` khỏi `LivePanel` để dùng chung. Tạo `RecentMatchesPanel` + `RecentMatchCard` nhận dữ liệu ESPN và schedule entries, tự lọc/sort/nhóm theo ngày. `LivePanel` thêm filter `"done"` và đặt panel ở đầu. `MatchStatsModal` nhận thêm `entryId`/`entryKind` để hiện nút áp dụng tỉ số cho trận vòng bảng.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Vitest, React Testing Library, Playwright.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/date-label.ts` | Helper `formatDateLabel` dùng chung cho LivePanel và RecentMatchesPanel. |
| `src/lib/recent-matches.ts` | Pure functions: `getDoneEntries`, `syncAllDone`, `groupDoneEntriesByDate`. |
| `src/lib/__tests__/recent-matches.test.ts` | Unit tests cho logic lọc/sort/sync. |
| `src/components/RecentMatchCard.tsx` | Card hiển thị một trận đã kết thúc. |
| `src/components/RecentMatchesPanel.tsx` | Section hiển thị danh sách recent/done matches. |
| `src/components/__tests__/RecentMatchesPanel.test.tsx` | Component tests. |
| `src/components/LivePanel.tsx` | Thêm filter `"done"`, render `RecentMatchesPanel`, truyền entryId xuống modal. |
| `src/components/LiveMatchCard.tsx` | Cập nhật `onOpenDetail` signature để truyền `entryId`. |
| `src/components/UpcomingMatchCard.tsx` | Cập nhật `onOpenDetail` signature để truyền `entryId`. |
| `src/components/MatchStatsModal.tsx` | Thêm nút "Áp dụng vào mô phỏng" khi là trận vòng bảng đã kết thúc. |
| `e2e/live-panel.spec.ts` | E2E tests cho tab Trực tiếp với recent matches. |

---

### Task 1: Extract shared `formatDateLabel` helper

**Files:**
- Create: `src/lib/date-label.ts`
- Modify: `src/components/LivePanel.tsx` (remove inline function, import from helper)

- [ ] **Step 1: Create `src/lib/date-label.ts`**

```ts
export function formatDateLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(today);
  const tomorrowStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(tomorrow);

  if (dStr === todayStr) return `HÔM NAY · ${dStr}`;
  if (dStr === tomorrowStr) return `NGÀY MAI · ${dStr}`;
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}
```

- [ ] **Step 2: Update `src/components/LivePanel.tsx`**

Remove the inline `formatDateLabel` function (lines 23-48) and add:

```ts
import { formatDateLabel } from "@/lib/date-label";
```

Verify `formatDateLabel` is no longer defined in `LivePanel.tsx`.

- [ ] **Step 3: Run lint and existing live tests**

```bash
npx vitest run src/lib/__tests__/live-panel.test.ts
npm run lint
```

Expected: tests pass, lint passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/date-label.ts src/components/LivePanel.tsx
git commit -m "refactor: extract formatDateLabel helper from LivePanel"
```

---

### Task 2: Implement recent-matches pure logic

**Files:**
- Create: `src/lib/recent-matches.ts`
- Create: `src/lib/__tests__/recent-matches.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/__tests__/recent-matches.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { getDoneEntries, syncAllDone, groupDoneEntriesByDate } from "../recent-matches";
import type { ScheduleEntry } from "../schedule";
import type { EspnScoreboardMatch } from "../espn-match";

const espnToLocal: Record<string, string> = {
  "203": "43911",
  "467": "43883",
};

const groupEntry: ScheduleEntry = {
  id: "400021443",
  matchNumber: 1,
  date: "2026-06-11T19:00:00Z",
  kind: "group",
  stageLabel: "Vòng bảng · Bảng A",
  groupLetter: "A",
  home: { id: "43911", code: "MEX", name: "Mexico", flagUrl: "/flags/MEX.png" },
  away: { id: "43883", code: "RSA", name: "South Africa", flagUrl: "/flags/RSA.png" },
  homePlaceholder: "A1",
  awayPlaceholder: "A2",
};

const knockoutEntry: ScheduleEntry = {
  ...groupEntry,
  id: "ko-1",
  kind: "knockout",
  stageLabel: "Vòng 32",
};

const finishedEspn: EspnScoreboardMatch = {
  id: "760415",
  date: "2026-06-11T19:00Z",
  status: "STATUS_FULL_TIME",
  state: "post",
  shortDetail: "FT",
  displayClock: "90'",
  homeId: "203",
  awayId: "467",
  homeScore: "2",
  awayScore: "0",
};

describe("getDoneEntries", () => {
  it("returns finished matches sorted newest first", () => {
    const older: EspnScoreboardMatch = {
      ...finishedEspn,
      id: "older",
      date: "2026-06-10T19:00Z",
    };
    const done = getDoneEntries([groupEntry], [finishedEspn, older], espnToLocal);
    expect(done).toHaveLength(2);
    expect(done[0].espn.id).toBe("760415");
    expect(done[1].espn.id).toBe("older");
  });

  it("ignores live and scheduled matches", () => {
    const live: EspnScoreboardMatch = { ...finishedEspn, id: "live", state: "in" };
    const pre: EspnScoreboardMatch = { ...finishedEspn, id: "pre", state: "pre" };
    const done = getDoneEntries([groupEntry], [live, pre], espnToLocal);
    expect(done).toHaveLength(0);
  });

  it("ignores finished matches without scores", () => {
    const noScore: EspnScoreboardMatch = {
      ...finishedEspn,
      homeScore: undefined,
      awayScore: undefined,
    };
    const done = getDoneEntries([groupEntry], [noScore], espnToLocal);
    expect(done).toHaveLength(0);
  });

  it("returns empty array when espnMatches is empty", () => {
    const done = getDoneEntries([groupEntry], [], espnToLocal);
    expect(done).toHaveLength(0);
  });
});

describe("groupDoneEntriesByDate", () => {
  it("groups by formatted date label", () => {
    const done = getDoneEntries([groupEntry], [finishedEspn], espnToLocal);
    const groups = groupDoneEntriesByDate(done);
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
  });
});

describe("syncAllDone", () => {
  it("returns updates only for group matches", () => {
    const done = getDoneEntries([groupEntry, knockoutEntry], [finishedEspn], espnToLocal);
    const updates = syncAllDone(done, espnToLocal);
    expect(updates["400021443"]).toEqual({ home: 2, away: 0 });
    expect(updates["ko-1"]).toBeUndefined();
  });

  it("returns empty object when no done entries", () => {
    const updates = syncAllDone([], espnToLocal);
    expect(updates).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/__tests__/recent-matches.test.ts
```

Expected: FAIL — "getDoneEntries is not a function" or module not found.

- [ ] **Step 3: Implement `src/lib/recent-matches.ts`**

```ts
import {
  findEspnMatch,
  espnScoresToResult,
  type EspnScoreboardMatch,
} from "./espn-match";
import { formatDateLabel } from "./date-label";
import type { ScheduleEntry } from "./schedule";
import type { MatchResult } from "./fifa/types";

export type DoneEntry = {
  entry: ScheduleEntry;
  espn: EspnScoreboardMatch;
};

export function getDoneEntries(
  entries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>
): DoneEntry[] {
  if (espnMatches.length === 0) return [];

  return entries
    .map((entry) => {
      const espn = findEspnMatch(entry, espnMatches, espnToLocal);
      if (!espn || espn.state !== "post") return null;
      if (espn.homeScore == null || espn.awayScore == null) return null;
      return { entry, espn };
    })
    .filter((item): item is DoneEntry => item != null)
    .sort((a, b) => new Date(b.espn.date).getTime() - new Date(a.espn.date).getTime());
}

export function groupDoneEntriesByDate(
  doneEntries: DoneEntry[]
): { label: string; entries: DoneEntry[] }[] {
  const groups: { label: string; entries: DoneEntry[] }[] = [];
  let currentLabel = "";
  let currentGroup: DoneEntry[] = [];

  for (const item of doneEntries) {
    const label = formatDateLabel(new Date(item.espn.date));
    if (label !== currentLabel) {
      if (currentGroup.length > 0) {
        groups.push({ label: currentLabel, entries: currentGroup });
      }
      currentLabel = label;
      currentGroup = [];
    }
    currentGroup.push(item);
  }

  if (currentGroup.length > 0) {
    groups.push({ label: currentLabel, entries: currentGroup });
  }

  return groups;
}

export function syncAllDone(
  doneEntries: DoneEntry[],
  espnToLocal: Record<string, string>
): Record<string, MatchResult> {
  const updates: Record<string, MatchResult> = {};
  for (const { entry, espn } of doneEntries) {
    if (entry.kind !== "group") continue;
    const result = espnScoresToResult(entry, espn, espnToLocal);
    if (result) updates[entry.id] = result;
  }
  return updates;
}
```

Note: `espnScoresToResult` does not currently exist in `espn-match.ts`. We will add it in Task 2 step 4, or refactor `sync-live-results.ts` to export it. Add it to `espn-match.ts` to keep pure logic in one place.

- [ ] **Step 4: Move `espnScoresToResult` to `src/lib/espn-match.ts` and export it**

Open `src/lib/espn-match.ts` and add after `parseEspnScore` helper (you may need to expose `parseEspnScore` as well):

```ts
function parseEspnScore(value?: string): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function espnScoresToResult(
  entry: ScheduleEntry,
  espn: EspnScoreboardMatch,
  espnToLocal: Record<string, string>
): MatchResult | null {
  if (!hasEspnMatchScore(espn)) return null;

  const espnHomeScore = parseEspnScore(espn.homeScore);
  const espnAwayScore = parseEspnScore(espn.awayScore);
  if (espnHomeScore === null || espnAwayScore === null) return null;

  const espnHomeLocal = espn.homeId ? espnToLocal[espn.homeId] : undefined;
  const espnAwayLocal = espn.awayId ? espnToLocal[espn.awayId] : undefined;

  if (espnHomeLocal === entry.home?.id && espnAwayLocal === entry.away?.id) {
    return { home: espnHomeScore, away: espnAwayScore };
  }
  if (espnHomeLocal === entry.away?.id && espnAwayLocal === entry.home?.id) {
    return { home: espnAwayScore, away: espnHomeScore };
  }

  if (!espn.homeId || !espn.awayId) {
    return { home: espnHomeScore, away: espnAwayScore };
  }

  return null;
}
```

Then update `src/lib/sync-live-results.ts` to import and use `espnScoresToResult` from `espn-match.ts` instead of its local copy. Remove the local `parseEspnScore` and `espnScoresToResult` functions.

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/lib/__tests__/recent-matches.test.ts src/lib/__tests__/sync-live-results.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/recent-matches.ts src/lib/__tests__/recent-matches.test.ts src/lib/espn-match.ts src/lib/sync-live-results.ts
git commit -m "feat: add recent-matches filtering and bulk sync logic"
```

---

### Task 3: Create `RecentMatchCard` component

**Files:**
- Create: `src/components/RecentMatchCard.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { FlagIcon } from "./FlagIcon";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import type { ScheduleEntry } from "@/lib/schedule";

type RecentMatchCardProps = {
  entry: ScheduleEntry;
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};

export function RecentMatchCard({
  entry,
  espnMatch,
  homeName,
  awayName,
  homeCode,
  awayCode,
  onOpenDetail,
}: RecentMatchCardProps) {
  const handleClick = onOpenDetail
    ? () => onOpenDetail(entry, espnMatch.id, espnMatch.date)
    : undefined;

  return (
    <div
      onClick={handleClick}
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 transition-colors sm:p-4 ${
        handleClick
          ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <span className="truncate text-right text-xs font-semibold leading-tight sm:text-sm">
            {homeName}
          </span>
          <FlagIcon code={homeCode} size="md" title={homeName} />
        </div>

        <div className="flex-shrink-0 px-1 text-center sm:px-2">
          <div className="text-2xl font-black tracking-wider text-emerald-400 tabular-nums sm:text-3xl lg:text-4xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:mt-1">
            {espnMatch.shortDetail || "Đã kết thúc"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <FlagIcon code={awayCode} size="md" title={awayName} />
          <span className="truncate text-left text-xs font-semibold leading-tight sm:text-sm">
            {awayName}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders without error**

```bash
npx tsc --noEmit
npm run lint
```

Expected: no type/lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/RecentMatchCard.tsx
git commit -m "feat: add RecentMatchCard component"
```

---

### Task 4: Create `RecentMatchesPanel` component

**Files:**
- Create: `src/components/RecentMatchesPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useSchedule } from "@/lib/hooks";
import {
  getDoneEntries,
  groupDoneEntriesByDate,
  syncAllDone,
  type DoneEntry,
} from "@/lib/recent-matches";
import { findEspnMatch } from "@/lib/espn-match";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { useSimulation } from "@/lib/store";
import { RecentMatchCard } from "./RecentMatchCard";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {} as Record<string, string>
);

type RecentMatchesPanelProps = {
  espnMatches: import("@/lib/espn-match").EspnScoreboardMatch[];
  mode: "recent-5" | "all-done";
  title?: string;
  showSyncAll?: boolean;
  onOpenDetail?: (gameId: string, matchDate: string) => void;
};

export function RecentMatchesPanel({
  espnMatches,
  mode,
  title,
  showSyncAll,
  onOpenDetail,
}: RecentMatchesPanelProps) {
  const allEntries = useSchedule();
  const applyLiveResults = useSimulation((s) => s.applyLiveResults);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const doneEntries = useMemo(
    () => getDoneEntries(allEntries, espnMatches, ESPN_TO_LOCAL),
    [allEntries, espnMatches]
  );

  const displayedEntries = useMemo(
    () => (mode === "recent-5" ? doneEntries.slice(0, 5) : doneEntries),
    [doneEntries, mode]
  );

  const groups = useMemo(
    () => groupDoneEntriesByDate(displayedEntries),
    [displayedEntries]
  );

  const groupCount = doneEntries.filter((d) => d.entry.kind === "group").length;

  const handleSyncAll = () => {
    if (syncing || groupCount === 0) return;
    setSyncing(true);
    const updates = syncAllDone(doneEntries, ESPN_TO_LOCAL);
    applyLiveResults(updates);
    setSyncing(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  };

  const panelTitle =
    title ?? (mode === "recent-5" ? "Các trận gần nhất" : "Các trận đã kết thúc");
  const subtitle =
    mode === "recent-5" ? "5 trận đã kết thúc gần nhất" : undefined;

  return (
    <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div>
          <h3 className="text-base font-black sm:text-lg">⚽ {panelTitle}</h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {showSyncAll && (
          <button
            type="button"
            disabled={syncing || syncSuccess || groupCount === 0}
            onClick={handleSyncAll}
            className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/50 disabled:opacity-50 sm:px-3"
          >
            {syncing
              ? "Đang đồng bộ..."
              : syncSuccess
                ? "Đã đồng bộ! ✓"
                : "Đồng bộ tất cả"}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Chưa có trận nào kết thúc.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                {group.label}
              </div>
              <div className="space-y-2 sm:space-y-3">
                {group.entries.map(({ entry, espn }) => (
                  <RecentMatchCard
                    key={entry.id}
                    espnMatch={espn}
                    homeName={entry.home?.name ?? entry.homePlaceholder}
                    awayName={entry.away?.name ?? entry.awayPlaceholder}
                    homeCode={entry.home?.code ?? ""}
                    awayCode={entry.away?.code ?? ""}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type check and lint**

```bash
npx tsc --noEmit
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RecentMatchesPanel.tsx
git commit -m "feat: add RecentMatchesPanel component"
```

---

### Task 5: Update `LivePanel` with "Đã đá" filter and wire panel

**Files:**
- Modify: `src/components/LivePanel.tsx`
- Modify: `src/components/LiveMatchCard.tsx`
- Modify: `src/components/UpcomingMatchCard.tsx`

- [ ] **Step 1: Update `FilterMode` type and state in `LivePanel.tsx`**

Change:

```ts
type FilterMode = "live" | "upcoming";
```

to:

```ts
type FilterMode = "live" | "upcoming" | "done";
```

And:

```ts
const [filterMode, setFilterMode] = useState<FilterMode | "all">("all");
```

- [ ] **Step 2: Update `onOpenDetail` signature in all three card components and `LivePanel`**

Change from `(gameId: string, matchDate: string) => void` to `(entry: ScheduleEntry, gameId: string, matchDate: string) => void`.

In `LiveMatchCard.tsx`:

```ts
type LiveMatchCardProps = {
  entry: ScheduleEntry;
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};
```

Update `handleClick`:

```ts
const handleClick = onOpenDetail
  ? () => onOpenDetail(entry, espnMatch.id, espnMatch.date)
  : undefined;
```

Update `LivePanel` call site to pass `entry={entry}` to `LiveMatchCard`.

In `UpcomingMatchCard.tsx`:

```ts
type UpcomingMatchCardProps = {
  entry: ScheduleEntry;
  gameId?: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};
```

Update click handler to call `onOpenDetail(entry, gameId, entry.date ?? "")` if `gameId` exists.

In `LivePanel.tsx`, update modal state:

```ts
const [selectedEntry, setSelectedEntry] = useState<ScheduleEntry | null>(null);
```

And handlers:

```tsx
onOpenDetail={(entry, gameId, matchDate) => {
  setSelectedEntry(entry);
  setSelectedGameId(gameId);
  setSelectedMatchDate(matchDate);
}}
```

- [ ] **Step 3: Add imports and compute `doneEntries`/`showDone`**

In `LivePanel.tsx`:

```ts
import { RecentMatchesPanel } from "./RecentMatchesPanel";
import { getDoneEntries } from "@/lib/recent-matches";
import type { ScheduleEntry } from "@/lib/schedule";
```

After `liveEntries`/`upcomingEntries` computation:

```ts
const doneEntries = useMemo(
  () => getDoneEntries(allEntries, espnMatches, ESPN_TO_LOCAL),
  [allEntries, espnMatches]
);
```

And:

```ts
const showDone = filterMode === "all" || filterMode === "done";
```

- [ ] **Step 4: Update `hasContent`**

```ts
const hasContent =
  (showLive && liveEntries.length > 0) ||
  (showUpcoming && upcomingEntries.length > 0) ||
  (showDone && doneEntries.length > 0);
```

- [ ] **Step 5: Add "Đã đá" toggle button**

After the upcoming toggle button, add:

```tsx
<button
  type="button"
  onClick={() =>
    setFilterMode(filterMode === "done" ? "all" : "done")
  }
  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
    showDone
      ? "border-emerald-500/20 bg-emerald-950/30 text-emerald-400"
      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
  }`}
>
  ✅ Đã đá {doneEntries.length > 0 && `(${doneEntries.length})`}
</button>
```

Add the same button to the empty state block.

- [ ] **Step 6: Render `RecentMatchesPanel` in the main content area**

Inside the main return, before the live section:

```tsx
{showDone && (
  <RecentMatchesPanel
    espnMatches={espnMatches}
    mode={filterMode === "done" ? "all-done" : "recent-5"}
    showSyncAll
    onOpenDetail={(entry, gameId, matchDate) => {
      setSelectedEntry(entry);
      setSelectedGameId(gameId);
      setSelectedMatchDate(matchDate);
    }}
  />
)}
```

Update `MatchStatsModal` call to pass `entry={selectedEntry ?? undefined}` and clear `selectedEntry` on close.

- [ ] **Step 7: Run lint and existing tests**

```bash
npx tsc --noEmit
npm run lint
npx vitest run src/lib/__tests__/live-panel.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/components/LivePanel.tsx src/components/LiveMatchCard.tsx src/components/UpcomingMatchCard.tsx
git commit -m "feat: wire RecentMatchesPanel into LivePanel with done filter"
```

---

### Task 6: Update `MatchStatsModal` with apply-to-simulation button

**Files:**
- Modify: `src/components/MatchStatsModal.tsx`

- [ ] **Step 1: Add `entry` prop and imports**

```ts
import type { ScheduleEntry } from "@/lib/schedule";
import { useSimulation } from "@/lib/store";
import { espnScoresToResult } from "@/lib/espn-match";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";

interface MatchStatsModalProps {
  gameId: string | null;
  matchDate?: string | null;
  entry?: ScheduleEntry;
  onClose: () => void;
}
```

- [ ] **Step 2: Add apply-to-simulation logic**

Inside the modal component (after `view` is computed):

```ts
const applyLiveResults = useSimulation((s) => s.applyLiveResults);

const canApply =
  entry?.kind === "group" &&
  view.home?.score != null &&
  view.away?.score != null;

const handleApply = () => {
  if (!entry || !canApply || !view.home || !view.away) return;

  const espnToLocal = Object.entries(ESPN_TEAM_MAP).reduce(
    (acc, [localId, espnId]) => {
      acc[espnId] = localId;
      return acc;
    },
    {} as Record<string, string>
  );

  const espn: import("@/lib/espn-match").EspnScoreboardMatch = {
    id: gameId ?? "",
    date: matchDate ?? view.competition?.date ?? "",
    status: view.competition?.status?.type?.name ?? "",
    state: "post",
    shortDetail: view.competition?.status?.type?.shortDetail ?? "",
    displayClock: view.competition?.status?.type?.shortDetail ?? "",
    homeId: view.home.id,
    awayId: view.away.id,
    homeScore: view.home.score,
    awayScore: view.away.score,
  };

  const result = espnScoresToResult(entry, espn, espnToLocal);
  if (result) {
    applyLiveResults({ [entry.id]: result });
  }
};
```

- [ ] **Step 3: Add apply button in modal header**

Update the `<header>` in the modal JSX to wrap the close button and add the apply button:

```tsx
<header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 sm:px-6">
  <div>
    <h2 id="match-stats-title" className="text-base font-black text-white sm:text-lg">
      Chi tiết trận đấu
    </h2>
    <p className="text-xs text-zinc-500">Dữ liệu trực tiếp từ ESPN</p>
  </div>
  <div className="flex items-center gap-2">
    {canApply && (
      <button
        type="button"
        onClick={handleApply}
        className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/50"
      >
        Áp dụng vào mô phỏng
      </button>
    )}
    <button
      type="button"
      onClick={onClose}
      aria-label="Đóng chi tiết trận đấu"
      className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xl text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
    >
      ×
    </button>
  </div>
</header>
```

- [ ] **Step 4: Run type check, lint, tests**

```bash
npx tsc --noEmit
npm run lint
npx vitest run src/lib/__tests__/recent-matches.test.ts src/lib/__tests__/live-panel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MatchStatsModal.tsx
git commit -m "feat: add apply-to-simulation button in MatchStatsModal"
```

---

### Task 7: Add component tests

**Files:**
- Create: `src/components/__tests__/RecentMatchesPanel.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecentMatchesPanel } from "../RecentMatchesPanel";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import * as hooks from "@/lib/hooks";
import * as store from "@/lib/store";

const espnToLocal = { "203": "43911", "467": "43883" };

vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof hooks>("@/lib/hooks");
  return {
    ...actual,
    useSchedule: vi.fn(),
  };
});

vi.mock("@/lib/store", async () => {
  const actual = await vi.importActual<typeof store>("@/lib/store");
  return {
    ...actual,
    useSimulation: vi.fn(),
  };
});

const applyLiveResults = vi.fn();

vi.mocked(store.useSimulation).mockImplementation((selector) =>
  selector({ applyLiveResults } as unknown as import("@/lib/store").SimulationStore)
);

const mockEntries = [
  {
    id: "g1",
    kind: "group",
    date: "2026-06-11T19:00Z",
    home: { id: "43911", code: "MEX", name: "Mexico" },
    away: { id: "43883", code: "RSA", name: "South Africa" },
    homePlaceholder: "A1",
    awayPlaceholder: "A2",
  },
];

const mockEspnMatches: EspnScoreboardMatch[] = [
  {
    id: "760415",
    date: "2026-06-11T19:00Z",
    status: "STATUS_FULL_TIME",
    state: "post",
    shortDetail: "FT",
    displayClock: "90'",
    homeId: "203",
    awayId: "467",
    homeScore: "2",
    awayScore: "1",
  },
];

describe("RecentMatchesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hooks.useSchedule.mockReturnValue(mockEntries);
  });

  it("renders empty state when no finished matches", () => {
    render(<RecentMatchesPanel espnMatches={[]} mode="recent-5" showSyncAll />);
    expect(screen.getByText("Chưa có trận nào kết thúc.")).toBeInTheDocument();
  });

  it("renders recent matches and sync button", () => {
    render(
      <RecentMatchesPanel espnMatches={mockEspnMatches} mode="recent-5" showSyncAll />
    );
    expect(screen.getByText("Các trận gần nhất")).toBeInTheDocument();
    expect(screen.getByText("Mexico")).toBeInTheDocument();
    expect(screen.getByText("South Africa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đồng bộ tất cả/i })).toBeInTheDocument();
  });

  it("calls onOpenDetail when a card is clicked", () => {
    const onOpenDetail = vi.fn();

    render(
      <RecentMatchesPanel
        espnMatches={mockEspnMatches}
        mode="recent-5"
        onOpenDetail={onOpenDetail}
      />
    );

    fireEvent.click(screen.getByText("Mexico"));
    expect(onOpenDetail).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run component tests**

```bash
npx vitest run src/components/__tests__/RecentMatchesPanel.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/__tests__/RecentMatchesPanel.test.tsx
git commit -m "test: add RecentMatchesPanel component tests"
```

---

### Task 8: Add E2E tests

**Files:**
- Create: `e2e/live-panel.spec.ts`

- [ ] **Step 1: Write E2E spec**

```ts
import { test, expect } from "@playwright/test";
import { gotoFresh, goToTab } from "./helpers";

test.describe("Tab Trực tiếp", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test("hiển thị section Các trận gần nhất khi có trận đã kết thúc", async ({ page }) => {
    // Mock ESPN scoreboard to include one finished match
    await page.route(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            events: [
              {
                id: "760415",
                date: "2026-06-11T19:00Z",
                competitions: [
                  {
                    status: {
                      displayClock: "90'",
                      type: {
                        name: "STATUS_FULL_TIME",
                        state: "post",
                        shortDetail: "FT",
                      },
                    },
                    competitors: [
                      { homeAway: "home", score: "2", team: { id: "203" } },
                      { homeAway: "away", score: "1", team: { id: "467" } },
                    ],
                  },
                ],
              },
            ],
          }),
        });
      }
    );

    await goToTab(page, "live");
    await expect(page.getByText("Các trận gần nhất")).toBeVisible();
    await expect(page.getByText("Mexico")).toBeVisible();
    await expect(page.getByText("South Africa")).toBeVisible();
  });

  test("lọc Đã đá hiển thị toàn bộ trận đã kết thúc", async ({ page }) => {
    await goToTab(page, "live");
    await page.getByRole("button", { name: /Đã đá/i }).click();
    await expect(page.getByText("Các trận đã kết thúc")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test e2e/live-panel.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/live-panel.spec.ts
git commit -m "test: add E2E tests for live panel recent matches"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:all
```

Expected: all unit and E2E tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: production build succeeds.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 4: Final review against spec**

Open `docs/superpowers/specs/2026-06-21-recent-matches-live-design.md` and verify:

- [ ] Section "Các trận gần nhất" hiển thị 5 trận gần nhất ở đầu tab.
- [ ] Nút lọc "Đã đá" hiển thị toàn bộ trận đã kết thúc.
- [ ] Nhóm theo ngày.
- [ ] Bấm vào trận mở `MatchStatsModal`.
- [ ] Nút "Đồng bộ tất cả" chỉ sync trận vòng bảng.
- [ ] Nút "Áp dụng vào mô phỏng" trong modal cho trận vòng bảng.

- [ ] **Step 5: Commit any final fixes**

```bash
git commit -am "fix: final adjustments for recent matches in live tab"
```

---

## Spec coverage check

| Spec requirement | Task implementing it |
|---|---|
| 5 trận đã kết thúc gần nhất ở đầu tab | Task 4 (`recent-5` mode), Task 5 (render in `LivePanel`) |
| Nút lọc "Đã đá" | Task 5 |
| Hiển thị toàn bộ trận đã kết thúc | Task 4 (`all-done` mode), Task 5 |
| Nhóm theo ngày | Task 1 + Task 2 (`groupDoneEntriesByDate`) |
| Bấm vào trận mở modal | Task 3 + Task 4 + Task 6 |
| Đồng bộ tất cả | Task 2 (`syncAllDone`) + Task 4 |
| Áp dụng từng trận trong modal | Task 6 |
| Chỉ sync vòng bảng | Task 2 + Task 6 |
| Empty state | Task 4 |
| Unit/component/E2E tests | Tasks 2, 7, 8 |

## Placeholder scan

No TBD/TODO placeholders. Each task includes complete code snippets and exact commands.

## Type consistency notes

- `onOpenDetail` signature is changed to pass the full `ScheduleEntry` across `LivePanel`, `LiveMatchCard`, `UpcomingMatchCard`, `RecentMatchCard`, `RecentMatchesPanel`, and `MatchStatsModal`. Ensure all call sites are updated consistently.
- `espnScoresToResult` is moved to `espn-match.ts` and imported by both `sync-live-results.ts` and `recent-matches.ts`.
- `formatDateLabel` is extracted to `date-label.ts` and imported by both `LivePanel.tsx` and `recent-matches.ts`.
