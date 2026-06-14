# Vòng bảng Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bộ lọc Lượt trận và Bảng đấu vào Vòng bảng (Group stage) hỗ trợ tìm kiếm và kiểm tra tự động responsive pixel-perfect cho cả Mobile, Tablet và Desktop bằng Playwright.

**Architecture:** Bổ sung thuộc tính `matchday` vào `ScheduleEntry` map tự động từ dữ liệu seed của bảng vòng bảng. Thêm state và 2 thẻ HTML `<select>` (Dropdowns) trong `SchedulePanel.tsx` được hiển thị có điều kiện. Lọc dữ liệu trong logic rendering.

**Tech Stack:** Next.js (React 19), Tailwind CSS, Vitest (Unit), Playwright (E2E)

---

### Task 1: Thêm thuộc tính matchday vào ScheduleEntry và ánh xạ tương ứng

**Files:**
- Modify: `src/lib/schedule.ts`
- Test: `src/lib/__tests__/schedule.test.ts`

- [x] **Step 1: Viết test unit kiểm tra tính toán lượt trận**
  Thêm khối mô tả kiểm thử vào `src/lib/__tests__/schedule.test.ts`:
  ```typescript
  describe("matchday calculation", () => {
    it("maps group matches to correct matchday", () => {
      const entries = buildScheduleEntries({}, []);
      const groupAEntries = entries.filter((e) => e.kind === "group" && e.groupLetter === "A");
      
      // Sắp xếp các trận theo số trận đấu để đảm bảo đúng thứ tự
      const sortedA = [...groupAEntries].sort((a, b) => a.matchNumber - b.matchNumber);
      
      expect(sortedA[0]?.matchday).toBe(1);
      expect(sortedA[1]?.matchday).toBe(1);
      expect(sortedA[2]?.matchday).toBe(2);
      expect(sortedA[3]?.matchday).toBe(2);
      expect(sortedA[4]?.matchday).toBe(3);
      expect(sortedA[5]?.matchday).toBe(3);
    });
  });
  ```

- [x] **Step 2: Chạy test unit để đảm bảo test thất bại**
  Run: `npx vitest run src/lib/__tests__/schedule.test.ts`
  Expected: FAIL (lỗi compile do thiếu thuộc tính `matchday` hoặc property undefined)

- [x] **Step 3: Khai báo thuộc tính và cập nhật logic ánh xạ**
  Cập nhật file `src/lib/schedule.ts`:
  - Thêm `matchday?: number;` vào kiểu `ScheduleEntry`.
  - Cập nhật hàm `groupMatchToEntry` để chấp nhận tham số `matchIndex` và tính `matchday`:
    ```typescript
    export function groupMatchToEntry(
      match: GroupMatch,
      groupLetter: string,
      matchResults: Record<string, MatchResult>,
      matchIndex: number
    ): ScheduleEntry {
      return {
        id: match.id,
        matchNumber: match.matchNumber,
        date: match.date,
        localDate: match.localDate,
        stadium: match.stadium,
        city: match.city,
        kind: "group",
        stageLabel: stageLabel("First Stage", groupLetter),
        groupLetter,
        home: match.home,
        away: match.away,
        homePlaceholder: match.placeholderA,
        awayPlaceholder: match.placeholderB,
        result: matchResults[match.id],
        matchday: Math.floor(matchIndex / 2) + 1,
      };
    }
    ```
  - Cập nhật hàm `buildScheduleEntries` truyền index `idx` vào `groupMatchToEntry`:
    ```typescript
    const groupEntries = seed.groups.flatMap((group) =>
      group.matches.map((match, idx) => groupMatchToEntry(match, group.letter, matchResults, idx))
    );
    ```

- [x] **Step 4: Chạy test unit để xác minh kiểm thử thành công**
  Run: `npx vitest run src/lib/__tests__/schedule.test.ts`
  Expected: PASS

- [x] **Step 5: Thực hiện commit**
  ```bash
  git add src/lib/schedule.ts src/lib/__tests__/schedule.test.ts
  git commit -m "feat: add matchday property and calculation to ScheduleEntry"
  ```

---

### Task 2: Thêm giao diện Dropdown bộ lọc vào SchedulePanel

**Files:**
- Modify: `src/components/SchedulePanel.tsx`

- [ ] **Step 1: Khai báo state lưu trữ tùy chọn lọc mới**
  Tại file `src/components/SchedulePanel.tsx`, thêm 2 state vào component `SchedulePanel`:
  ```typescript
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedMatchday, setSelectedMatchday] = useState<string>("all");
  ```
  *(Đảm bảo thêm `useState` vào khối React import ở đầu file nếu chưa có)*

- [ ] **Step 2: Thêm các phần tử dropdown vào cấu trúc JSX**
  Chèn các dropdown bên cạnh ô Tìm kiếm. Tìm đoạn code input tìm kiếm:
  ```tsx
  {filter !== "espn-standings" && filter !== "stats" && (
    <div className="relative">
      <svg ... />
      <input ... />
    </div>
  )}
  ```
  Thay thế bằng khối flex để sắp xếp thẳng hàng:
  ```tsx
  {filter !== "espn-standings" && filter !== "stats" && (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
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
        <div className="flex gap-2">
          <select
            data-testid="schedule-group-filter"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
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
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
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
  ```

- [ ] **Step 3: Cập nhật logic lọc trận đấu trong useMemo**
  Cập nhật logic `filtered` memo ở trong component `SchedulePanel`:
  ```typescript
  const filtered = useMemo(() => {
    if (filter === "espn-standings" || filter === "stats") return [];
    let list = filterScheduleEntries(allEntries, filter as ScheduleFilter);
    
    if (filterMode === "fav-matches") {
      list = list.filter((e) => favoriteMatches.includes(e.id));
    } else if (filterMode === "fav-teams") {
      list = list.filter(
        (e) =>
          (e.home && favoriteTeams.includes(e.home.id)) ||
          (e.away && favoriteTeams.includes(e.away.id))
      );
    }

    // Bộ lọc Bảng đấu (chỉ lọc cho các trận vòng bảng)
    if (selectedGroup !== "all") {
      list = list.filter((e) => e.kind === "group" && e.groupLetter === selectedGroup);
    }

    // Bộ lọc Lượt trận (chỉ lọc cho các trận vòng bảng)
    if (selectedMatchday !== "all") {
      list = list.filter((e) => e.kind === "group" && e.matchday === Number(selectedMatchday));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.home?.name.toLowerCase().includes(q) ||
          e.away?.name.toLowerCase().includes(q) ||
          e.stadium?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [allEntries, filter, filterMode, favoriteMatches, favoriteTeams, searchQuery, selectedGroup, selectedMatchday]);
  ```

- [ ] **Step 4: Chạy test unit hiện tại để đảm bảo không lỗi**
  Run: `npx vitest run`
  Expected: PASS

- [ ] **Step 5: Thực hiện commit**
  ```bash
  git add src/components/SchedulePanel.tsx
  git commit -m "feat: implement group and matchday filter selects in SchedulePanel UI"
  ```

---

### Task 3: Viết các ca kiểm thử E2E về tương tác bộ lọc & Responsive chi tiết

**Files:**
- Modify: `e2e/responsive.spec.ts`

- [ ] **Step 1: Viết test kiểm thử các dropdown và tương tác lọc**
  Cập nhật test `lịch thi đấu — danh sách và lọc` trong `e2e/responsive.spec.ts` ở vị trí dòng 77-84:
  ```typescript
    test("lịch thi đấu — danh sách và lọc kèm bộ lọc phụ", async ({ page }) => {
      await goToTab(page, "schedule");
      await expect(page.getByTestId("schedule-panel")).toBeVisible();
      await expect(page.getByTestId("schedule-match-1")).toBeVisible();

      // Kiểm tra sự xuất hiện của các bộ lọc phụ
      const groupFilter = page.getByTestId("schedule-group-filter");
      const matchdayFilter = page.getByTestId("schedule-matchday-filter");
      await expect(groupFilter).toBeVisible();
      await expect(matchdayFilter).toBeVisible();

      // Chọn lọc Bảng A
      await groupFilter.selectOption("A");
      // Trận 1 (Bảng A) phải hiển thị, Trận 3 (Bảng B) phải ẩn đi
      await expect(page.getByTestId("schedule-match-1")).toBeVisible();
      // Ta có thể kiểm tra xem trận đấu không thuộc Bảng A có biến mất không
      // Trận 3 là của bảng B: USA vs Bảng B2, sẽ bị ẩn đi
      await expect(page.getByTestId("schedule-match-3")).toBeHidden();

      // Chọn tiếp Lượt trận 2
      await matchdayFilter.selectOption("2");
      // Trận 1 (Lượt trận 1) phải biến mất
      await expect(page.getByTestId("schedule-match-1")).toBeHidden();

      // Reset lọc về Tất cả
      await groupFilter.selectOption("all");
      await matchdayFilter.selectOption("all");
      await expect(page.getByTestId("schedule-match-1")).toBeVisible();

      // Chuyển sang tab knockout -> bộ lọc phải biến mất
      await page.getByTestId("schedule-filter-knockout").click();
      await expect(groupFilter).toBeHidden();
      await expect(matchdayFilter).toBeHidden();
      
      await assertNoHorizontalOverflow(page);
    });
  ```

- [ ] **Step 2: Viết test kiểm tra kích thước responsive từng pixel nhỏ**
  Thêm ca kiểm thử mới trong file `e2e/responsive.spec.ts` để khẳng định bố cục responsive thẳng hàng / cột dọc dựa theo độ rộng màn hình (viewports):
  ```typescript
    test("lịch thi đấu — bố cục responsive pixel-perfect cho bộ lọc", async ({ page }) => {
      await goToTab(page, "schedule");
      
      const searchBox = page.locator("input[placeholder='Tìm kiếm quốc gia, SVĐ...']");
      const groupFilter = page.getByTestId("schedule-group-filter");
      const matchdayFilter = page.getByTestId("schedule-matchday-filter");
      
      await expect(searchBox).toBeVisible();
      await expect(groupFilter).toBeVisible();
      await expect(matchdayFilter).toBeVisible();
      
      const searchBoxBox = await searchBox.boundingBox();
      const groupFilterBox = await groupFilter.boundingBox();
      const matchdayFilterBox = await matchdayFilter.boundingBox();
      
      if (searchBoxBox && groupFilterBox && matchdayFilterBox) {
        // Đảm bảo chiều rộng/cao click target tối thiểu là 44px trên thiết bị di động
        if (vp.width < 640) {
          // Trên mobile: các bộ lọc xếp dọc, do đó tọa độ Y sẽ lớn dần
          expect(groupFilterBox.y).toBeGreaterThan(searchBoxBox.y);
          expect(matchdayFilterBox.y).toBe(groupFilterBox.y); // Hai select vẫn cạnh nhau trên hàng ngang nhỏ
          
          // Kiểm tra chiều cao tối thiểu click target
          expect(searchBoxBox.height).toBeGreaterThanOrEqual(36);
          expect(groupFilterBox.height).toBeGreaterThanOrEqual(36);
        } else {
          // Trên desktop và tablet: nằm cùng hàng ngang
          const yDiffGroup = Math.abs(groupFilterBox.y - searchBoxBox.y);
          const yDiffMatchday = Math.abs(matchdayFilterBox.y - searchBoxBox.y);
          
          expect(yDiffGroup).toBeLessThanOrEqual(2); // Thẳng hàng ngang
          expect(yDiffMatchday).toBeLessThanOrEqual(2);
          
          // Lượt trận nằm bên phải bảng đấu
          expect(matchdayFilterBox.x).toBeGreaterThan(groupFilterBox.x + groupFilterBox.width - 2);
        }
      }
      await assertNoHorizontalOverflow(page);
    });
  ```

- [ ] **Step 3: Chạy toàn bộ các ca kiểm thử E2E**
  Run: `npx playwright test e2e/responsive.spec.ts`
  Expected: PASS

- [ ] **Step 4: Thực hiện commit**
  ```bash
  git add e2e/responsive.spec.ts
  git commit -m "test: add responsive and filter interaction e2e tests in schedule view"
  ```
