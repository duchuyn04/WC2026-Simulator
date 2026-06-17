# 24-Hour Auto-Update FIFA Squads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tự động cập nhật đội hình + ảnh cầu thủ từ FIFA API mỗi 24 giờ qua GitHub Actions, có client-side fallback, và cải thiện placeholder cho ảnh thiếu.

**Architecture:** GitHub Actions chạy `fetch:teams-squads` hàng ngày, commit data, trigger deploy. Client kiểm tra độ tươi của static JSON và gọi FIFA API trực tiếp khi cần. Placeholder cải tiến nằm trong component hiện có.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand, Vitest, GitHub Actions.

---

### Task 1: GitHub Actions workflow `.github/workflows/update-squads.yml`

**Files:**
- Create: `.github/workflows/update-squads.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Update FIFA Squads

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write
  actions: write

concurrency:
  group: update-squads
  cancel-in-progress: true

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Fetch FIFA squads
        run: npm run fetch:teams-squads

      - name: Commit updated squads
        id: commit
        shell: bash
        run: |
          if git diff --quiet -- data/fifa-teams-squads.json; then
            echo "FIFA squads are already up to date."
            echo "changed=false" >> "$GITHUB_OUTPUT"
            exit 0
          fi

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/fifa-teams-squads.json
          git commit -m "chore: update FIFA squads"
          git push
          echo "changed=true" >> "$GITHUB_OUTPUT"

      - name: Deploy updated squads
        if: ${{ steps.commit.outputs.changed == 'true' }}
        shell: bash
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh workflow run deploy.yml --ref main
```

- [ ] **Step 2: Validate YAML syntax**

Run: `npx eslint .github/workflows/update-squads.yml` or mở file trong editor để check indentation.
Expected: Không có lỗi syntax.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/update-squads.yml
git commit -m "feat: add daily FIFA squads update workflow"
```

---

### Task 2: FIFA squads fetch helper `src/lib/fifa-squads-fetch.ts`

**Files:**
- Create: `src/lib/fifa-squads-fetch.ts`
- Create: `src/lib/__tests__/fifa-squads-fetch.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest";
import { fetchTeamSquadFromFifa, normalizeSquadPlayer } from "../fifa-squads-fetch";

const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

describe("normalizeSquadPlayer", () => {
  it("maps FIFA API player to local shape", () => {
    const input = {
      IdPlayer: "403001",
      PlayerName: [{ Locale: "en-GB", Description: "DIOGO COSTA" }],
      ShortName: [{ Locale: "en-GB", Description: "D. COSTA" }],
      JerseyNum: 1,
      PositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
      RealPositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
      BirthDate: "1999-09-19T00:00:00Z",
      Height: 188,
      Weight: 86,
      IdCountry: "POR",
      PlayerPicture: {
        Id: "7C3541E5-A8CB-458C-B3687F57C1B5AE03",
        PictureUrl: "https://digitalhub.fifa.com/transform/7c3541e5-a8cb-458c-b368-7f57c1b5ae03/DIOGO-COSTA_403001",
      },
    };

    const result = normalizeSquadPlayer(input);
    expect(result.id).toBe("403001");
    expect(result.name).toBe("DIOGO COSTA");
    expect(result.pictureUrl).toBe("https://digitalhub.fifa.com/transform/7c3541e5-a8cb-458c-b368-7f57c1b5ae03/DIOGO-COSTA_403001");
    expect(result.pictureSource).toBe("fifa");
  });

  it("returns null pictureUrl when FIFA has no image", () => {
    const input = {
      IdPlayer: "999999",
      PlayerName: [{ Locale: "en-GB", Description: "NO IMAGE" }],
      ShortName: [{ Locale: "en-GB", Description: "NO IMAGE" }],
      JerseyNum: 99,
      PositionLocalized: [{ Locale: "en-GB", Description: "Forward" }],
      RealPositionLocalized: [{ Locale: "en-GB", Description: "Forward" }],
      BirthDate: "2000-01-01T00:00:00Z",
      Height: 180,
      Weight: 75,
      IdCountry: "ARG",
      PlayerPicture: null,
    };

    const result = normalizeSquadPlayer(input);
    expect(result.pictureUrl).toBeNull();
    expect(result.pictureSource).toBeNull();
  });
});

describe("fetchTeamSquadFromFifa", () => {
  it("returns normalized players on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Players: [
            {
              IdPlayer: "403001",
              PlayerName: [{ Locale: "en-GB", Description: "DIOGO COSTA" }],
              ShortName: [{ Locale: "en-GB", Description: "D. COSTA" }],
              JerseyNum: 1,
              PositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
              RealPositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
              BirthDate: "1999-09-19T00:00:00Z",
              Height: 188,
              Weight: 86,
              IdCountry: "POR",
              PlayerPicture: {
                PictureUrl: "https://example.com/diogo.png",
              },
            },
          ],
        }),
    });

    const players = await fetchTeamSquadFromFifa("43963");
    expect(players).toHaveLength(1);
    expect(players?.[0].id).toBe("403001");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.fifa.com/api/v3/teams/43963/squad?idCompetition=17&idSeason=285023&language=en",
      { headers: { Accept: "application/json" } }
    );
  });

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const players = await fetchTeamSquadFromFifa("43963");
    expect(players).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/fifa-squads-fetch.test.ts`
Expected: FAIL — `fetchTeamSquadFromFifa` / `normalizeSquadPlayer` not defined.

- [ ] **Step 3: Write minimal implementation**

```typescript
const COMPETITION_ID = "17";
const SEASON_ID = "285023";
const LANGUAGE = "en";

function localizedValue(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const items = value as Array<{ Locale?: string; Description?: string }>;
  return items.find((item) => item.Locale === "en-GB")?.Description ?? items[0]?.Description ?? null;
}

export type SquadPlayer = {
  id: string;
  name: string | null;
  shortName: string | null;
  jerseyNumber: number | null;
  position: string | null;
  realPosition: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  countryCode: string | null;
  pictureUrl: string | null;
  pictureSource: "fifa" | null;
};

export function normalizeSquadPlayer(player: Record<string, unknown>): SquadPlayer {
  const playerPicture = (player.PlayerPicture as { PictureUrl?: string } | null) ?? null;
  const pictureUrl = playerPicture?.PictureUrl ?? (player.PictureUrl as string | undefined) ?? null;

  return {
    id: String(player.IdPlayer ?? ""),
    name: localizedValue(player.PlayerName),
    shortName: localizedValue(player.ShortName),
    jerseyNumber: typeof player.JerseyNum === "number" ? player.JerseyNum : null,
    position: localizedValue(player.PositionLocalized),
    realPosition: localizedValue(player.RealPositionLocalized),
    birthDate: typeof player.BirthDate === "string" ? player.BirthDate : null,
    heightCm: typeof player.Height === "number" ? player.Height : null,
    weightKg: typeof player.Weight === "number" ? player.Weight : null,
    countryCode: typeof player.IdCountry === "string" ? player.IdCountry : null,
    pictureUrl,
    pictureSource: pictureUrl ? "fifa" : null,
  };
}

export async function fetchTeamSquadFromFifa(teamId: string): Promise<SquadPlayer[] | null> {
  const url = `https://api.fifa.com/api/v3/teams/${teamId}/squad?idCompetition=${COMPETITION_ID}&idSeason=${SEASON_ID}&language=${LANGUAGE}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      console.warn(`Failed to fetch squad for team ${teamId}: ${response.status}`);
      return null;
    }
    const data = (await response.json()) as { Players?: Record<string, unknown>[] };
    return (data.Players ?? []).map(normalizeSquadPlayer);
  } catch (error) {
    console.warn(`Error fetching squad for team ${teamId}:`, error);
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/fifa-squads-fetch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fifa-squads-fetch.ts src/lib/__tests__/fifa-squads-fetch.test.ts
git commit -m "feat: add FIFA squad fetch helper with tests"
```

---

### Task 3: Hook `useLiveSquadSync`

**Files:**
- Modify: `src/lib/hooks.ts`
- Create: `src/lib/__tests__/use-live-squad-sync.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("react", () => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
}));

import { useState, useEffect } from "react";
import { useLiveSquadSync } from "../hooks";
import { fetchTeamSquadFromFifa } from "../fifa-squads-fetch";

const mockFetchTeamSquadFromFifa = vi.fn();
vi.mock("../fifa-squads-fetch", () => ({
  fetchTeamSquadFromFifa: vi.fn(),
}));

if (typeof globalThis.document === "undefined") {
  (globalThis as unknown as Record<string, unknown>).document = {
    visibilityState: "visible",
  };
}

describe("useLiveSquadSync", () => {
  let mockSetState: ReturnType<typeof vi.fn>;
  let effectCallback: (() => void | (() => void)) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetState = vi.fn();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-17T12:00:00Z"));

    vi.mocked(useState as any).mockImplementation((init: unknown) => [init, mockSetState]);
    vi.mocked(useEffect).mockImplementation((cb: any) => {
      effectCallback = cb;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const baseTeam = {
    id: "43963",
    code: "POR",
    name: "Portugal",
    squad: [
      { id: "403001", name: "DIOGO COSTA", jerseyNumber: 1, pictureUrl: "old-url", pictureSource: "fifa" },
    ],
  };

  it("does nothing when static data is fresh", () => {
    useLiveSquadSync(baseTeam, "2026-06-17T11:00:00Z");
    effectCallback?.();
    expect(mockFetchTeamSquadFromFifa).not.toHaveBeenCalled();
  });

  it("fetches fresh squad when static data is stale", async () => {
    vi.mocked(fetchTeamSquadFromFifa).mockResolvedValue([
      {
        id: "403001",
        name: "DIOGO COSTA",
        shortName: null,
        jerseyNumber: 1,
        position: "Goalkeeper",
        realPosition: "Goalkeeper",
        birthDate: null,
        heightCm: null,
        weightKg: null,
        countryCode: "POR",
        pictureUrl: "new-url",
        pictureSource: "fifa",
      },
    ]);

    useLiveSquadSync(baseTeam, "2026-06-15T00:00:00Z");
    effectCallback?.();

    await vi.runOnlyPendingTimersAsync();

    expect(mockFetchTeamSquadFromFifa).toHaveBeenCalledWith("43963");
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/use-live-squad-sync.test.ts`
Expected: FAIL — `useLiveSquadSync` not defined.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/hooks.ts`:

```typescript
import { useEffect, useState } from "react";
import { fetchTeamSquadFromFifa, type SquadPlayer } from "./fifa-squads-fetch";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function useLiveSquadSync(
  team: { id: string; squad: SquadPlayer[] },
  staticFetchedAt: string | null
) {
  const [liveSquad, setLiveSquad] = useState<SquadPlayer[] | null>(null);

  useEffect(() => {
    const fetchedAtTime = staticFetchedAt ? new Date(staticFetchedAt).getTime() : 0;
    const now = Date.now();
    const isStale = now - fetchedAtTime > TWENTY_FOUR_HOURS_MS;

    if (!isStale) return;

    let active = true;
    fetchTeamSquadFromFifa(team.id).then((freshPlayers) => {
      if (!active || !freshPlayers || freshPlayers.length === 0) return;

      setLiveSquad((current) => {
        if (current) return current;

        const merged = team.squad.map((player) => {
          const fresh =
            freshPlayers.find((p) => p.id === player.id) ??
            freshPlayers.find((p) => p.jerseyNumber === player.jerseyNumber);
          if (!fresh || !fresh.pictureUrl) return player;
          return { ...player, pictureUrl: fresh.pictureUrl, pictureSource: "fifa" };
        });
        return merged;
      });
    });

    return () => {
      active = false;
    };
  }, [team.id, staticFetchedAt, team.squad]);

  return liveSquad ?? team.squad;
}
```

**Lưu ý:** `useState` và `useEffect` đã được import ở đầu file. Nếu file đã import `useState, useEffect, useMemo` thì không cần thêm import. Thêm import `SquadPlayer` từ `./fifa-squads-fetch`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/use-live-squad-sync.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks.ts src/lib/__tests__/use-live-squad-sync.test.ts
git commit -m "feat: add live squad sync hook"
```

---

### Task 4: Integrate hook into `TeamRoster`

**Files:**
- Modify: `src/components/TeamRoster.tsx`
- Modify: `src/app/teams/[slug]/page.tsx`

- [ ] **Step 1: Update `TeamRoster` to accept `fetchedAt` and use hook**

Trong `src/components/TeamRoster.tsx`:
- Import `useLiveSquadSync` từ `@/lib/hooks`.
- Import `SquadPlayer` từ `@/lib/fifa-squads-fetch`.
- Thêm prop `fetchedAt?: string | null` vào `Props`.
- Gọi `useLiveSquadSync({ id: team.code ?? "", squad }, fetchedAt ?? null)` — lưu ý: cần truyền `team.id` (FIFA team ID) thay vì `team.code`.

Vì `TeamRoster` đang nhận `team: { name, code, colors }`, cần thêm `id` vào type `RosterTeam`.

```typescript
type RosterTeam = {
  id: string;
  name: string;
  code: string | null;
  colors: TeamColors;
};

type Props = {
  team: RosterTeam;
  headCoach?: Coach | null;
  groupedPlayers: PlayerGroup[];
  fetchedAt?: string | null;
};
```

Trong component:

```typescript
export function TeamRoster({ team, headCoach, groupedPlayers, fetchedAt }: Props) {
  const flatPlayers = groupedPlayers.flatMap((g) => g.players);
  const syncedPlayers = useLiveSquadSync({ id: team.id, squad: flatPlayers }, fetchedAt ?? null);

  // Re-group players by position for render
  const syncedGrouped = useMemo(() => {
    const byPosition = new Map<string, Player[]>();
    for (const player of syncedPlayers) {
      const pos = player.position ?? "Unknown";
      if (!byPosition.has(pos)) byPosition.set(pos, []);
      byPosition.get(pos)!.push(player);
    }
    return positionOrder.map((position) => ({
      position,
      players: (byPosition.get(position) ?? []).sort(
        (a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      ),
    }));
  }, [syncedPlayers]);

  // ... rest of component uses syncedGrouped instead of groupedPlayers
}
```

- [ ] **Step 2: Update page to pass `id` and `fetchedAt`**

Trong `src/app/teams/[slug]/page.tsx`:
- Truyền `id: team.id` vào `TeamRoster`.
- Truyền `fetchedAt={teamsData.fetchedAt}`.

```typescript
<TeamRoster
  team={{ id: team.id, name: team.name, code: team.code, colors: team.colors }}
  headCoach={headCoach}
  groupedPlayers={groupedPlayers}
  fetchedAt={teamsData.fetchedAt}
/>
```

- [ ] **Step 3: Run build để kiểm tra TypeScript**

Run: `npm run build`
Expected: PASS — không có lỗi TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamRoster.tsx src/app/teams/[slug]/page.tsx
git commit -m "feat: integrate live squad sync into team roster"
```

---

### Task 5: Cải thiện placeholder

**Files:**
- Modify: `src/components/PortraitImage.tsx`
- Create: `src/components/__tests__/PortraitImage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortraitImage } from "../PortraitImage";

describe("PortraitImage", () => {
  it("renders improved placeholder when no image", () => {
    render(
      <PortraitImage
        src={null}
        alt="Test player"
        placeholderProps={{
          badge: "#10",
          label: "Forward",
          name: "Test Player",
          teamCode: "POR",
          primaryColor: "#D52B1E",
          secondaryColor: "#FFFFFF",
        }}
      />
    );

    expect(screen.getByText("POR")).toBeInTheDocument();
    expect(screen.getByText("#10")).toBeInTheDocument();
    expect(screen.getByText("TP")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/PortraitImage.test.tsx`
Expected: FAIL — test file or updated placeholder behavior chưa có.

- [ ] **Step 3: Update placeholder UI**

Trong `src/components/PortraitImage.tsx`, thay thế phần hiển thị "No image" bằng icon silhouette. Ví dụ dùng SVG inline hoặc ký tự Unicode.

```typescript
export function PortraitPlaceholder({
  badge,
  label,
  name,
  teamCode,
  primaryColor,
  secondaryColor,
}: {
  badge: string;
  label: string;
  name?: string | null;
  teamCode: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const primary = primaryColor ?? "#6a041f";
  const secondary = secondaryColor ?? "#f59e0b";

  return (
    <div
      className="relative flex h-32 w-full flex-col justify-between overflow-hidden p-4 sm:h-64 sm:p-5"
      style={{
        background: `radial-gradient(circle at 28% 18%, ${secondary}55, transparent 28%), linear-gradient(145deg, ${primary}dd, #151923 54%, #090b10)`,
      }}
    >
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" />
      <div className="absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between text-xs font-black uppercase tracking-[0.22em] text-white/60">
        <span>{teamCode}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4 opacity-60 sm:h-5 sm:w-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="relative text-center">
        <p className="text-4xl font-black tracking-tight text-white drop-shadow-lg sm:text-7xl">
          {badge}
        </p>
        <p className="mt-2 text-2xl font-black text-white/85 sm:mt-4 sm:text-3xl">
          {initialsFromName(name)}
        </p>
      </div>
      <p className="relative text-center text-xs font-bold uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/PortraitImage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PortraitImage.tsx src/components/__tests__/PortraitImage.test.tsx
git commit -m "feat: improve player portrait placeholder"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full unit test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `GITHUB_PAGES=true npm run build`
Expected: PASS, static export thành công.

- [ ] **Step 4: Manual browser check**

Run: `npm run dev`, mở `http://localhost:3000/teams/portugal`.
Expected: Ảnh cầu thủ Portugal hiển thị; nếu data cũ thì sau load client sẽ fetch ảnh mới.

- [ ] **Step 5: Commit any final fixes**

```bash
git add .
git commit -m "chore: final fixes for squad auto-update"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - [x] GitHub Actions daily workflow — Task 1.
  - [x] Client-side FIFA fetch helper — Task 2.
  - [x] Client-side sync hook — Task 3.
  - [x] Integration into team page — Task 4.
  - [x] Placeholder improvement — Task 5.
- **Placeholder scan:** Không có TBD/TODO/"implement later".
- **Type consistency:** `SquadPlayer` type dùng xuyên suốt; `team.id` là FIFA team ID.
