import { test, expect } from "@playwright/test";
import { gotoFresh, goToTab, openGroupDetail, groupDetailModal } from "./helpers";

test.describe("Điều hướng & tiện ích", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test("chuyển tab Hạng 3", async ({ page }) => {
    await goToTab(page, "third");
    await expect(page.getByRole("heading", { name: "8 đội hạng 3 tốt nhất" })).toBeVisible();
    await expect(page.getByText("Tổ hợp bảng")).toBeVisible();
    const qualified = page.locator(".border-emerald-800\\/50");
    await expect(qualified).toHaveCount(8);
  });

  test("tab Hạng 3 mode thứ hạng — kéo thả 12 đội", async ({ page }) => {
    await page.getByTestId("group-mode-ranks").click();
    await goToTab(page, "third");
    await expect(page.getByTestId("third-place-rank-list")).toBeVisible();
    await expect(page.locator("[data-testid^='sortable-team-']")).toHaveCount(12);
  });

  test("tab Hạng 3 hiện 4 đội bị loại", async ({ page }) => {
    await goToTab(page, "third");
    await expect(page.getByText("Bị loại (hạng 3)")).toBeVisible();
  });

  test("đặt lại xóa dữ liệu sau confirm", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await openGroupDetail(page, "A");
    await groupDetailModal(page, "A").locator('input[type="number"]').first().fill("5");
    await page.getByRole("button", { name: "Đóng" }).click();
    await page.getByRole("button", { name: "Đặt lại" }).click();
    await openGroupDetail(page, "A");
    await expect(groupDetailModal(page, "A").locator('input[type="number"]').first()).toHaveValue("");
  });

  test("tab Lịch thi đấu hiển thị danh sách trận", async ({ page }) => {
    await goToTab(page, "schedule");
    await expect(page.getByTestId("schedule-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lịch thi đấu" })).toBeVisible();
    await expect(page.getByTestId("schedule-match-1")).toBeVisible();
    await expect(page.getByText("104 trận")).toBeVisible();
  });

  test("vòng lặp đủ 4 tab", async ({ page }) => {
    await goToTab(page, "schedule");
    await expect(page.getByRole("heading", { name: "Lịch thi đấu" })).toBeVisible();
    await goToTab(page, "third");
    await expect(page.getByRole("heading", { name: "8 đội hạng 3 tốt nhất" })).toBeVisible();
    await goToTab(page, "knockout");
    await expect(page.getByText("Chung kết", { exact: true })).toBeVisible();
    await goToTab(page, "groups");
    await expect(page.getByRole("heading", { name: "Bảng A" })).toBeVisible();
  });
});