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

    test("lịch thi đấu — danh sách và lọc", async ({ page }) => {
      await goToTab(page, "schedule");
      await expect(page.getByTestId("schedule-panel")).toBeVisible();
      await expect(page.getByTestId("schedule-match-1")).toBeVisible();
      await page.getByTestId("schedule-filter-knockout").click();
      await expect(page.getByTestId("schedule-match-1")).toBeHidden();
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
