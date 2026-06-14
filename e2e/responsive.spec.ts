import { test, expect } from "@playwright/test";
import {
  gotoFresh,
  goToTab,
  openGroupDetail,
  groupDetailModal,
  assertNoHorizontalOverflow,
} from "./helpers";

const VIEWPORTS = [
  { name: "mobile-small", width: 320, height: 568 },
  { name: "iphone-se", width: 375, height: 667 },
  { name: "pixel-7", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "desktop-wide", width: 1536, height: 864 },
  { name: "full-hd", width: 1920, height: 1080 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`Responsive · ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await gotoFresh(page);
    });

    test("vòng bảng — không tràn ngang, mở modal chi tiết", async ({ page }) => {
      await expect(page.getByTestId("tab-groups")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await expect(page.getByTestId("group-card-A")).toBeVisible();
      await openGroupDetail(page, "A");

      const modal = groupDetailModal(page, "A");
      await expect(modal.getByRole("heading", { name: "Bảng A" })).toBeVisible();
      await expect(modal.locator('input[type="number"]').first()).toBeVisible();
      await assertNoHorizontalOverflow(page);

      await modal.getByRole("button", { name: "Đóng" }).click();
      await expect(modal).toBeHidden();
    });

    test("hạng 3 — danh sách hiển thị đủ", async ({ page }) => {
      await page.getByTestId("group-mode-ranks").click();
      await goToTab(page, "third");
      await expect(page.getByRole("heading", { name: "8 đội hạng 3 tốt nhất" })).toBeVisible();
      await expect(page.getByTestId("third-place-rank-list")).toBeVisible();
      await expect(page.locator("[data-testid^='sortable-team-']")).toHaveCount(12);
      await assertNoHorizontalOverflow(page);
    });

    test("knockout — zoom/pan mobile, vừa khung", async ({ page }) => {
      await goToTab(page, "knockout");
      await expect(page.getByText("Chung kết", { exact: true })).toBeVisible();
      await expect(page.getByTestId("bracket-fit-frame")).toBeVisible();
      await expect(page.getByTestId("bracket-zoom-in")).toBeVisible();

      const hint = page.getByTestId("bracket-zoom-hint");
      const isMobile = vp.width < 640;

      if (isMobile) {
        await expect(hint).toContainText("130%");
        const slotBox = await page.locator("[data-match-slot]").first().boundingBox();
        expect(slotBox?.width ?? 0).toBeGreaterThan(100);
      }

      await page.getByTestId("bracket-zoom-in").click();
      await expect(hint).toContainText(isMobile ? "143%" : "110%");

      await page.getByTestId("bracket-fit-frame").click();
      await expect(hint).toContainText("100%");
      await assertNoHorizontalOverflow(page);
    });

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
      
      expect(searchBoxBox).not.toBeNull();
      expect(groupFilterBox).not.toBeNull();
      expect(matchdayFilterBox).not.toBeNull();
      
      if (searchBoxBox && groupFilterBox && matchdayFilterBox) {
        if (vp.width < 768) {
          // Trên mobile và tablet nhỏ (dưới md breakpoint 768px): xếp dọc
          expect(groupFilterBox.y).toBeGreaterThan(searchBoxBox.y);
          // Hai select vẫn cạnh nhau trên hàng ngang nhỏ
          expect(matchdayFilterBox.y).toBe(groupFilterBox.y);
          
          // Kiểm tra chiều cao tối thiểu click target
          expect(searchBoxBox.height).toBeGreaterThanOrEqual(36);
          expect(groupFilterBox.height).toBeGreaterThanOrEqual(36);
        } else {
          // Trên desktop và tablet lớn (từ md breakpoint 768px trở lên): nằm cùng hàng ngang
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

    test("thống kê FIFA — đủ danh mục, không tràn trang", async ({ page }) => {
      await goToTab(page, "schedule");
      await page.getByTestId("schedule-filter-stats").click();

      const stats = page.getByTestId("tournament-stats");
      await expect(stats).toBeVisible();
      await expect(stats.getByText("Dữ liệu chính thức từ FIFA")).toBeVisible();

      for (const category of [
        "goals",
        "assists",
        "penalties",
        "ownGoals",
        "yellowCards",
        "redCards",
      ]) {
        const tab = page.getByTestId(`stats-category-${category}`);
        await tab.click();
        await expect(tab).toHaveAttribute("aria-selected", "true");
        await assertNoHorizontalOverflow(page);
      }
    });

    test("tab nav — đủ 4 tab, chuyển được", async ({ page }) => {
      const tabs = ["groups", "schedule", "third", "knockout"] as const;
      for (const tab of tabs) {
        await goToTab(page, tab);
        await expect(page.getByTestId(`tab-${tab}`)).toHaveClass(/bg-zinc-800/);
      }
      await assertNoHorizontalOverflow(page);
    });
  });
}
