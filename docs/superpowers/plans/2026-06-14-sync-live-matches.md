# Kế hoạch Triển khai: Đồng bộ các trận đấu đang diễn ra (Live Matches Sync)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hỗ trợ đồng bộ tỉ số các trận đấu đang diễn ra trực tiếp (live) từ ESPN vào mô phỏng vòng bảng, bên cạnh các trận đấu đã kết thúc, đồng thời hiển thị thông báo chi tiết đếm riêng từng loại trận đấu.

**Architecture:** Sử dụng hàm helper `hasEspnMatchScore` để cho phép cập nhật các trận đấu có `state` là `"in"`, trả về thêm `liveCount` trong hàm xử lý kết quả, và xây dựng nội dung thông báo xác nhận động trong UI dựa trên số lượng trận đã đá xong và số trận đang đá.

**Tech Stack:** React, Next.js, Zustand, Vitest, TypeScript

---

### Task 1: Cập nhật logic đồng bộ kết quả tại sync-live-results.ts

**Files:**
- Modify: [sync-live-results.ts](file:///C:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/lib/sync-live-results.ts)

- [ ] **Step 1: Thay thế điều kiện kiểm tra trạng thái và đếm thêm số trận đang đá (live)**
  Sửa đổi hàm `espnScoresToResult` để chấp nhận cả trận đang diễn ra bằng cách dùng helper `hasEspnMatchScore`.
  Cập nhật hàm `buildLiveGroupResults` để trả về thêm `liveCount` và đếm riêng biệt dựa trên trạng thái `state` của trận đấu ESPN.

  Đoạn code sau khi thay đổi:
  ```typescript
  import { findEspnMatch, hasEspnMatchScore, type EspnScoreboardMatch } from "./espn-match";
  import type { MatchResult } from "./fifa/types";
  import type { ScheduleEntry } from "./schedule";

  function parseEspnScore(value?: string): number | null {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function espnScoresToResult(
    entry: ScheduleEntry,
    espn: EspnScoreboardMatch,
    espnToLocal: Record<string, string>,
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

  export function buildLiveGroupResults(
    groupEntries: ScheduleEntry[],
    espnMatches: EspnScoreboardMatch[],
    espnToLocal: Record<string, string>,
  ): { updates: Record<string, MatchResult>; finishedCount: number; liveCount: number } {
    const updates: Record<string, MatchResult> = {};
    let finishedCount = 0;
    let liveCount = 0;

    for (const entry of groupEntries) {
      if (entry.kind !== "group") continue;

      const espn = findEspnMatch(entry, espnMatches, espnToLocal);
      if (!espn) continue;

      const result = espnScoresToResult(entry, espn, espnToLocal);
      if (!result) continue;

      updates[entry.id] = result;
      if (espn.state === "post") {
        finishedCount += 1;
      } else if (espn.state === "in") {
        liveCount += 1;
      }
    }

    return { updates, finishedCount, liveCount };
  }
  ```

- [ ] **Step 2: Chạy TypeScript check để xác thực kiểu dữ liệu**
  Chạy: `npx tsc --noEmit`
  Yêu cầu: Thành công không có lỗi (lưu ý: các lỗi liên quan đến file test và component chưa sửa sẽ hiển thị, ta sẽ sửa chúng ở các task sau).

- [ ] **Step 3: Commit**
  Chạy:
  ```bash
  rtk git add src/lib/sync-live-results.ts
  rtk git commit -m "feat: support live matches and return liveCount in buildLiveGroupResults"
  ```

---

### Task 2: Cập nhật và bổ sung Unit Test cho logic đồng bộ

**Files:**
- Modify: [sync-live-results.test.ts](file:///C:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/lib/__tests__/sync-live-results.test.ts)

- [ ] **Step 1: Cập nhật các test case hiện tại để kiểm tra cấu trúc kiểu dữ liệu mới**
  Cập nhật destructuring `{ updates, finishedCount }` thành `{ updates, finishedCount, liveCount }` ở các test case cũ và thêm `expect(liveCount).toBe(0)` ở các test case cho trận đã kết thúc hoặc không hợp lệ.
  Thay thế test case `"ignores live and scheduled matches"` thành `"processes live matches and ignores scheduled matches"` để kiểm thử việc nhận kết quả trận đấu đang diễn ra.

  Đoạn code test sau khi thay đổi:
  ```typescript
  import { describe, expect, it } from "vitest";
  import { buildLiveGroupResults } from "../sync-live-results";
  import type { EspnScoreboardMatch } from "../espn-match";
  import type { ScheduleEntry } from "../schedule";

  const groupEntry = {
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
  } as ScheduleEntry;

  const espnToLocal: Record<string, string> = {
    "203": "43911",
    "467": "43883",
  };

  describe("buildLiveGroupResults", () => {
    it("maps finished ESPN scores to local group match results", () => {
      const espnMatches: EspnScoreboardMatch[] = [{
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
      }];

      const { updates, finishedCount, liveCount } = buildLiveGroupResults(
        [groupEntry],
        espnMatches,
        espnToLocal,
      );

      expect(finishedCount).toBe(1);
      expect(liveCount).toBe(0);
      expect(updates["400021443"]).toEqual({ home: 2, away: 0 });
    });

    it("swaps scores when ESPN home/away are reversed vs seed", () => {
      const espnMatches: EspnScoreboardMatch[] = [{
        id: "760415",
        date: "2026-06-11T19:00Z",
        status: "STATUS_FULL_TIME",
        state: "post",
        shortDetail: "FT",
        displayClock: "90'",
        homeId: "467",
        awayId: "203",
        homeScore: "1",
        awayScore: "3",
      }];

      const { updates, finishedCount, liveCount } = buildLiveGroupResults(
        [groupEntry],
        espnMatches,
        espnToLocal,
      );

      expect(finishedCount).toBe(1);
      expect(liveCount).toBe(0);
      expect(updates["400021443"]).toEqual({ home: 3, away: 1 });
    });

    it("processes live matches and ignores scheduled matches", () => {
      const espnMatches: EspnScoreboardMatch[] = [
        {
          id: "live",
          date: "2026-06-11T19:00Z",
          status: "STATUS_FIRST_HALF",
          state: "in",
          shortDetail: "32'",
          displayClock: "32'",
          homeId: "203",
          awayId: "467",
          homeScore: "1",
          awayScore: "0",
        },
        {
          id: "scheduled",
          date: "2026-06-12T02:00Z",
          status: "STATUS_SCHEDULED",
          state: "pre",
          shortDetail: "Scheduled",
          displayClock: "0'",
          homeId: "451",
          awayId: "450",
        },
      ];

      const { updates, finishedCount, liveCount } = buildLiveGroupResults(
        [groupEntry],
        espnMatches,
        espnToLocal,
      );

      expect(finishedCount).toBe(0);
      expect(liveCount).toBe(1);
      expect(updates["400021443"]).toEqual({ home: 1, away: 0 });
    });

    it("skips knockout schedule entries", () => {
      const knockoutEntry = {
        ...groupEntry,
        id: "ko-1",
        kind: "knockout",
      } as ScheduleEntry;

      const espnMatches: EspnScoreboardMatch[] = [{
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
      }];

      const { updates, finishedCount, liveCount } = buildLiveGroupResults(
        [knockoutEntry],
        espnMatches,
        espnToLocal,
      );

      expect(finishedCount).toBe(0);
      expect(liveCount).toBe(0);
      expect(updates).toEqual({});
    });
  });
  ```

- [ ] **Step 2: Chạy unit test để đảm bảo logic chạy đúng**
  Chạy: `rtk npm run test:unit`
  Yêu cầu: Tất cả các bài test (bao gồm cả sync-live-results.test.ts) đều phải PASSED.

- [ ] **Step 3: Commit**
  Chạy:
  ```bash
  rtk git add src/lib/__tests__/sync-live-results.test.ts
  rtk git commit -m "test: update sync-live-results tests to expect liveCount and support live matches"
  ```

---

### Task 3: Cập nhật component SyncLiveResultsButton để hiển thị thông tin động

**Files:**
- Modify: [SyncLiveResultsButton.tsx](file:///C:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/components/SyncLiveResultsButton.tsx)

- [ ] **Step 1: Cập nhật nút đồng bộ dữ liệu với số lượng trận live và finished**
  Thay đổi destructuring kết quả trả về từ `buildLiveGroupResults` để lấy thêm `liveCount`.
  Thay đổi logic kiểm tra dừng từ `finishedCount === 0` sang `finishedCount + liveCount === 0`.
  Xây dựng câu hỏi xác nhận (confirm message) phân biệt chi tiết từng tình huống trận đấu kết thúc và đang diễn ra.

  Đoạn code sau khi thay đổi:
  ```typescript
  "use client";

  import { useState } from "react";
  import { seed } from "@/lib/data";
  import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
  import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "@/lib/espn-match";
  import { groupMatchToEntry } from "@/lib/schedule";
  import { buildLiveGroupResults } from "@/lib/sync-live-results";
  import { useSimulation } from "@/lib/store";

  const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce<Record<string, string>>(
    (acc, [localId, espnId]) => {
      acc[espnId] = localId;
      return acc;
    },
    {},
  );

  export function SyncLiveResultsButton() {
    const applyLiveResults = useSimulation((s) => s.applyLiveResults);
    const [loading, setLoading] = useState(false);

    const handleSync = async () => {
      setLoading(true);
      try {
        const response = await fetch(ESPN_SCOREBOARD_URL);
        if (!response.ok) throw new Error("ESPN unavailable");

        const data = await response.json();
        const espnMatches = parseEspnScoreboard(data);
        const groupEntries = seed.groups.flatMap((group) =>
          group.matches.map((match) => groupMatchToEntry(match, group.letter, {})),
        );
        const { updates, finishedCount, liveCount } = buildLiveGroupResults(
          groupEntries,
          espnMatches,
          ESPN_TO_LOCAL,
        );

        const totalCount = finishedCount + liveCount;
        if (totalCount === 0) {
          window.alert("Chưa có trận vòng bảng nào kết thúc hoặc đang diễn ra trên ESPN.");
          return;
        }

        let message = "";
        if (finishedCount > 0 && liveCount > 0) {
          message = `Áp dụng ${totalCount} kết quả thật (${finishedCount} trận đã kết thúc, ${liveCount} trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
        } else if (finishedCount > 0) {
          message = `Áp dụng ${finishedCount} kết quả thật (trận đã kết thúc) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
        } else {
          message = `Áp dụng ${liveCount} kết quả thật (trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
        }

        const confirmed = window.confirm(message);
        if (!confirmed) return;

        applyLiveResults(updates);
      } catch {
        window.alert("Không thể tải kết quả từ ESPN. Thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <button
        type="button"
        data-testid="sync-live-results"
        disabled={loading}
        onClick={handleSync}
        className="px-3 py-1.5 text-xs rounded-lg border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
      >
        {loading ? "Đang tải..." : "Đồng bộ kết quả thật"}
      </button>
    );
  }
  ```

- [ ] **Step 2: Chạy kiểm tra TypeScript dự án để đảm bảo không lỗi type**
  Chạy: `npx tsc --noEmit`
  Yêu cầu: Không có bất kỳ lỗi biên dịch nào.

- [ ] **Step 3: Chạy toàn bộ Unit Tests**
  Chạy: `rtk npm run test:unit`
  Yêu cầu: Tất cả các test đều PASSED.

- [ ] **Step 4: Chạy thử Build sản phẩm để đảm bảo Next.js compile thành công**
  Chạy: `rtk npm run build`
  Yêu cầu: Build thành công hoàn toàn.

- [ ] **Step 5: Commit**
  Chạy:
  ```bash
  rtk git add src/components/SyncLiveResultsButton.tsx
  rtk git commit -m "feat: show detailed confirmation message for live/finished matches in SyncLiveResultsButton"
  ```
