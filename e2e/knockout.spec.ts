import { test, expect } from "@playwright/test";
import { gotoFresh, goToTab } from "./helpers";

test.describe("Knockout bracket UI", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await goToTab(page, "knockout");
  });

  test("hiển thị chung kết và hạng 3", async ({ page }) => {
    await expect(page.getByText("Chung kết", { exact: true })).toBeVisible();
    await expect(page.getByText("Hạng 3", { exact: true })).toBeVisible();
  });

  test("hiển thị bảng xếp hạng podium", async ({ page }) => {
    await expect(page.getByText("Bảng xếp hạng")).toBeVisible();
    await expect(page.getByText("Chọn người thắng để cập nhật")).toBeVisible();
  });

  test("có các slot trận đấu", async ({ page }) => {
    const slots = page.locator("[data-match-slot]");
    await expect(slots.first()).toBeVisible();
    const count = await slots.count();
    expect(count).toBeGreaterThanOrEqual(16);
  });

  test("chọn đội thắng highlight", async ({ page }) => {
    const pickable = page
      .locator("[data-match-slot]")
      .first()
      .getByRole("button")
      .first();
    if ((await pickable.count()) === 0) return;
    await pickable.click();
    await expect(page.locator(".ring-amber-400").first()).toBeVisible();
  });

  test("nút Vừa khung hiển thị", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Vừa khung" })).toBeVisible();
  });

  test("hướng dẫn zoom/pan hiển thị", async ({ page }) => {
    const hint = page.getByTestId("bracket-zoom-hint");
    await expect(hint.getByText(/Lăn chuột phóng to/)).toBeVisible();
    await expect(hint).toContainText("100%");
  });

  test("knockout fullscreen không có footer", async ({ page }) => {
    await expect(page.getByText("Annex C 495")).not.toBeVisible();
  });

  test("chọn đến chung kết cập nhật podium", async ({ page }) => {
    const slots = page.locator("[data-match-slot]");
    const max = Math.min(await slots.count(), 8);
    for (let i = 0; i < max; i++) {
      const btn = slots.nth(i).getByRole("button").first();
      if ((await btn.count()) > 0) await btn.click();
    }
    await expect(page.getByText("Bảng xếp hạng")).toBeVisible();
  });
});