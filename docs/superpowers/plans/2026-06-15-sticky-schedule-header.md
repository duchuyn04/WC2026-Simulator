# Sticky Schedule Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm toàn bộ khối "Lịch thi đấu 104 trận" + tab nav + search/dropdowns sticky bên dưới AppShell navbar khi scroll trong SchedulePanel.

**Architecture:**
- `AppShell.tsx`: Thêm `ref` + `ResizeObserver` để set CSS variable `--navbar-height` trên `document.documentElement`.
- `SchedulePanel.tsx`: Wrap title row + tabs + toolbar thành một `sticky` div dùng `top: var(--navbar-height)`, background blur, z-index 40.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS, TypeScript

---

## Files

- Modify: `src/components/AppShell.tsx` — thêm ref + ResizeObserver
- Modify: `src/components/SchedulePanel.tsx` — sticky header wrapper

---

## Task 1: Set `--navbar-height` CSS variable trong AppShell

**Files:**
- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Thêm `useRef`, `useEffect` import nếu chưa có**

  Dòng 1 hiện tại chỉ có `"use client"`. Các hooks đã được import từ React thông qua named imports. Kiểm tra file có `import React` hay chỉ named imports — nếu chỉ dùng named imports, thêm:

  ```tsx
  import { useRef, useEffect } from "react";
  ```

  vào cùng dòng với các hooks hiện tại (không tạo import mới nếu đã có `react` import).

- [ ] **Step 2: Thêm `headerRef` trong component**

  Ngay sau dòng `const favoriteTeams = useSimulation(...)` (line ~30), thêm:

  ```tsx
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${header.offsetHeight}px`
      );
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  ```

- [ ] **Step 3: Attach `ref={headerRef}` vào `<header>` element (line 77)**

  ```tsx
  // TRƯỚC:
  <header className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur">

  // SAU:
  <header ref={headerRef} className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur">
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/AppShell.tsx
  git commit -m "feat: expose --navbar-height CSS var via ResizeObserver"
  ```

---

## Task 2: Sticky schedule header trong SchedulePanel

**Files:**
- Modify: `src/components/SchedulePanel.tsx` (lines 698–775)

> **Context hiện tại (lines 698–775):**
> ```tsx
> return (
>   <div className="min-w-0 space-y-4" data-testid="schedule-panel">
>     {/* title row */}
>     <div className="flex items-baseline gap-3">
>       <h2 ...>Lịch thi đấu</h2>
>       <span ...>104 trận</span>
>     </div>
>     {/* tabs + toolbar */}
>     <div className="flex min-w-0 flex-col gap-2 border-b border-zinc-800 py-2">
>       ...tabs...
>       ...toolbar (search + dropdowns)...
>     </div>
>     {/* content */}
>     ...
>   </div>
> )
> ```
>
> **Sau khi thay đổi:** Wrap 2 div trên (title + tabs/toolbar) vào sticky container. `space-y-4` trên outer wrapper cần bỏ vì sticky header tự quản lý spacing.
>
> **Negative margin trick:** SchedulePanel render trong `<main className="... px-4">`. Dùng `-mx-4 px-4` để kéo background sticky ra tới edge của viewport, che content scroll bên dưới.

- [ ] **Step 1: Wrap title + tabs/toolbar thành sticky div**

  Thay thế từ `{/* Header matching... */}` đến hết closing `</div>` của toolbar block (lines 700–775) bằng:

  ```tsx
  {/* Sticky schedule header: title + tabs + toolbar */}
  <div
    className="sticky z-40 -mx-4 px-4 bg-[#0c0f14]/95 backdrop-blur-sm pb-0"
    style={{ top: "var(--navbar-height, 0px)" }}
  >
    {/* Header matching documented behavior and E2E expectations */}
    <div className="flex items-baseline gap-3 pt-4 pb-3">
      <h2 className="text-xl font-semibold tracking-tight">Lịch thi đấu</h2>
      <span className="text-sm text-zinc-500">104 trận</span>
    </div>

    {/* Sub-navigation & Toolbar */}
    <div className="flex min-w-0 flex-col gap-2 border-b border-zinc-800 pb-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex w-max min-w-full items-center gap-4 sm:gap-5 text-sm font-medium">
            {visibleFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`schedule-filter-${item.id}`}
                onClick={() => setFilter(item.id)}
                className={[
                  "pb-3 transition-colors whitespace-nowrap text-xs sm:text-sm",
                  filter === item.id
                    ? "underline decoration-[#ff4d6d] decoration-2 underline-offset-8 font-semibold text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {filter !== "espn-standings" && filter !== "stats" && (
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pb-2">
          <div className="relative flex-1">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm quốc gia, SVĐ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
            />
          </div>

          {(filter === "all" || filter === "group") && (
            <div className="flex gap-2 w-full md:w-auto">
              <select
                data-testid="schedule-group-filter"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="flex-1 min-w-0 h-9 bg-zinc-900 border border-zinc-800 rounded-md px-2 sm:px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              >
                <option value="all">Tất cả bảng</option>
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((letter) => (
                  <option key={letter} value={letter}>Bảng {letter}</option>
                ))}
              </select>

              <select
                data-testid="schedule-matchday-filter"
                value={selectedMatchday}
                onChange={(e) => setSelectedMatchday(e.target.value)}
                className="flex-1 min-w-0 h-9 bg-zinc-900 border border-zinc-800 rounded-md px-2 sm:px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              >
                <option value="all">Tất cả lượt</option>
                <option value="1">Lượt trận 1</option>
                <option value="2">Lượt trận 2</option>
                <option value="3">Lượt trận 3</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  ```

- [ ] **Step 2: Cập nhật outer wrapper và content spacing**

  Outer wrapper line 699: đổi `space-y-4` thành không có gap (sticky header tự quản lý):
  ```tsx
  // TRƯỚC:
  <div className="min-w-0 space-y-4" data-testid="schedule-panel">

  // SAU:
  <div className="min-w-0" data-testid="schedule-panel">
  ```

  Wrap phần content (stats/standings/match-list) vào `<div className="mt-4">`:
  ```tsx
  <div className="mt-4">
    {filter === "stats" ? (
      <TournamentStatsBoard />
    ) : filter === "espn-standings" ? (
      ...
    ) : dateGroups.length === 0 ? (
      ...
    ) : (
      ...
    )}
  </div>
  ```

- [ ] **Step 3: Smoke test thủ công**

  ```bash
  npm run dev
  ```

  Mở http://localhost:3000, vào tab "Lịch thi đấu", scroll xuống. Kiểm tra:
  - "Lịch thi đấu 104 trận" + tabs + search bám theo khi scroll
  - Không bị che bởi AppShell navbar (không overlap)
  - Background opaque (content bên dưới không lộ qua)
  - Horizontal scroll vẫn hoạt động trên mobile

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/SchedulePanel.tsx
  git commit -m "feat: sticky schedule header (title + tabs + search toolbar)"
  ```

---

## Task 3: Verify E2E tests

**Files:**
- Modify: `e2e/helpers.ts` (nếu cần)

- [ ] **Step 1: Chạy E2E navigation tests**

  ```bash
  npx playwright test e2e/navigation.spec.ts --reporter=line
  ```

  Expected: tất cả pass. Heading `Lịch thi đấu` và `104 trận` vẫn visible (chỉ sticky, không xóa).

- [ ] **Step 2: Chạy full E2E suite**

  ```bash
  npx playwright test --reporter=line
  ```

  Expected: tất cả pass. Nếu có test fail do scroll position bị ảnh hưởng bởi sticky header, cập nhật test tương ứng.

- [ ] **Step 3: Commit nếu có thay đổi test**

  ```bash
  git add e2e/
  git commit -m "fix: update e2e tests for sticky schedule header"
  ```
