# Compact Sticky Schedule Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thu gọn sticky header của SchedulePanel xuống còn 1 dòng (~48px) bằng cách cuộn mất tiêu đề chính, hiển thị toolbar inline trên Desktop, và dùng toggle overlay/sub-panel cho Search/Filters trên Mobile.

**Architecture:**
- `SchedulePanel.tsx`: Thêm state `isSearchExpanded` và `isFiltersExpanded`.
- Đưa phần tiêu đề `h2` Lịch thi đấu ra ngoài sticky container.
- Tạo 2 cấu trúc layout riêng biệt cho Mobile (`flex md:hidden`) và Desktop (`hidden md:flex`).
- Thêm cơ chế toggle overlay cho ô Tìm kiếm và panel trượt cho 2 Dropdown lọc trên Mobile.

**Tech Stack:** Next.js, React, Tailwind CSS, Playwright (E2E)

---

## Files
- Modify: `src/components/SchedulePanel.tsx`
- Modify: `e2e/tester/TC-hang-3.spec.ts`

---

## Task 1: Thiết kế giao diện Compact Sticky Header trong SchedulePanel

**Files:**
- Modify: `src/components/SchedulePanel.tsx`

- [ ] **Step 1: Khai báo các state mới**
  Tìm vị trí đầu component `SchedulePanel`, sau các dòng khai báo hook/state hiện tại (khoảng dòng 610), thêm:
  ```tsx
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  ```

- [ ] **Step 2: Cập nhật outer wrapper & tiêu đề không sticky**
  Thay thế đoạn return JSX hiện tại (từ dòng 698) thành cấu trúc mới.
  Tiêu đề sẽ cuộn trôi:
  ```tsx
  return (
    <div className="min-w-0" data-testid="schedule-panel">
      {/* Tiêu đề chính cuộn trôi, không sticky */}
      <div className="flex items-baseline gap-3 pt-4 pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Lịch thi đấu</h2>
        <span className="text-sm text-zinc-500">104 trận</span>
      </div>

      {/* Sticky container */}
      <div
        className="sticky z-40 -mx-4 px-4 bg-[#0c0f14]/95 backdrop-blur-sm border-b border-zinc-800"
        style={{ top: "var(--navbar-height, 0px)" }}
      >
  ```

- [ ] **Step 3: Viết giao diện Desktop (inline 1 dòng)**
  Thêm container Desktop ngay bên dưới sticky container:
  ```tsx
        {/* 1. Giao diện Desktop (>= md: >= 768px) - Tất cả trên 1 dòng */}
        <div className="hidden md:flex items-center justify-between gap-3 py-2">
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <nav className="flex w-max min-w-full items-center gap-4 sm:gap-5 text-sm font-medium">
              {visibleFilters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`schedule-filter-${item.id}`}
                  onClick={() => setFilter(item.id)}
                  className={[
                    "pb-1 transition-colors whitespace-nowrap text-xs sm:text-sm",
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

          <div className="flex items-center gap-2 shrink-0">
            {filter !== "espn-standings" && filter !== "stats" && (
              <>
                <div className="relative">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-44 bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>

                {(filter === "all" || filter === "group") && (
                  <div className="flex gap-2">
                    <select
                      data-testid="schedule-group-filter"
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none"
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
                      className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="all">Tất cả lượt</option>
                      <option value="1">Lượt 1</option>
                      <option value="2">Lượt 2</option>
                      <option value="3">Lượt 3</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
  ```

- [ ] **Step 4: Viết giao diện Mobile (< md: < 768px)**
  Thêm container Mobile ngay bên dưới phần Desktop:
  ```tsx
        {/* 2. Giao diện Mobile (< md: < 768px) - Gộp nút và ẩn/hiện */}
        <div className="flex md:hidden flex-col py-2">
          <div className="flex items-center justify-between gap-3 h-8 relative">
            {/* Overlay tìm kiếm khi mở rộng */}
            {isSearchExpanded ? (
              <div className="absolute inset-0 bg-[#0c0f14] flex items-center gap-2 z-10">
                <input
                  type="text"
                  placeholder="Tìm kiếm quốc gia, SVĐ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1 text-sm text-zinc-200 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setSearchQuery("");
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}

            {/* Tabs chính */}
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <nav className="flex w-max min-w-full items-center gap-4 text-xs font-medium">
                {visibleFilters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`schedule-filter-${item.id}`}
                    onClick={() => setFilter(item.id)}
                    className={[
                      "pb-1 transition-colors whitespace-nowrap",
                      filter === item.id
                        ? "underline decoration-[#ff4d6d] decoration-2 underline-offset-4 font-semibold text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300",
                    ].join(" ")}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Các icon chức năng trên Mobile */}
            {filter !== "espn-standings" && filter !== "stats" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="w-7 h-7 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 hover:text-zinc-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {(filter === "all" || filter === "group") && (
                  <button
                    type="button"
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className={[
                      "w-7 h-7 flex items-center justify-center border rounded-md transition-colors",
                      isFiltersExpanded
                        ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    ].join(" ")}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel dropdown phụ trên Mobile */}
          {isFiltersExpanded && (filter === "all" || filter === "group") && (
            <div className="flex gap-2 pt-2 pb-1 border-t border-zinc-800/50 mt-2 animate-fadeIn">
              <select
                data-testid="schedule-group-filter"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="flex-1 min-w-0 h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none"
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
                className="flex-1 min-w-0 h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="all">Tất cả lượt</option>
                <option value="1">Lượt trận 1</option>
                <option value="2">Lượt trận 2</option>
                <option value="3">Lượt trận 3</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content wrapper */}
      <div className="mt-4">
        {filter === "stats" ? (
          <TournamentStatsBoard />
        ) : filter === "espn-standings" ? (
          ...
  ```
  *(Đóng thẻ `</div>` tương ứng ở cuối file (dòng 876) để bọc toàn bộ content lại).*

- [ ] **Step 5: Kiểm tra biên dịch**
  Chạy lệnh kiểm tra TypeScript/Next.js build:
  ```bash
  npm run build
  ```
  Expected: Không có lỗi biên dịch.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/SchedulePanel.tsx
  git commit -m "feat: redesign sticky schedule header for multi-device support (Option B)"
  ```

---

## Task 2: Cập nhật E2E test và Sửa lỗi Click Interceptor trong modal

**Files:**
- Modify: `e2e/tester/TC-hang-3.spec.ts`

- [ ] **Step 1: Sửa lỗi modal không đóng trong TC-hang-3.spec.ts**
  Mở `e2e/tester/TC-hang-3.spec.ts`, tìm dòng 57 (ngay sau bước nhập tỉ số vòng bảng):
  ```typescript
  // TRƯỚC:
  await trang.nhapTiSo(TC005.bang, TC005.tran, TC005.nha, TC005.khach);
  ```
  Thêm dòng đóng modal để tránh modal đè lên tab Knockout:
  ```typescript
  // SAU:
  await trang.nhapTiSo(TC005.bang, TC005.tran, TC005.nha, TC005.khach);
  await page.getByRole("button", { name: "Đóng" }).click();
  ```

- [ ] **Step 2: Chạy kiểm thử TC-hang-3.spec.ts**
  Chạy lệnh:
  ```bash
  npx playwright test e2e/tester/TC-hang-3.spec.ts --reporter=line
  ```
  Expected: PASS cả 2 tests.

- [ ] **Step 3: Chạy toàn bộ E2E test suite**
  Chạy lệnh:
  ```bash
  npx playwright test --reporter=line
  ```
  Expected: Tất cả 108 tests đều PASS.

- [ ] **Step 4: Commit**
  ```bash
  git add e2e/tester/TC-hang-3.spec.ts
  git commit -m "fix: close group detail modal in tester TC-hang-3 spec to avoid click interception"
  ```
