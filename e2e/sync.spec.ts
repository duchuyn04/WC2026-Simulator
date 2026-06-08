import { test, expect } from "@playwright/test";
import { gotoFresh, goToTab, knockoutTab, openGroupDetail, groupDetailModal } from "./helpers";

test.describe("Vòng bảng → Knockout sync", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  async function scoreFirstMatch(page: import("@playwright/test").Page, home: string, away: string) {
    await openGroupDetail(page, "A");
    const modal = groupDetailModal(page, "A");
    await modal.locator('input[type="number"]').first().fill(home);
    await modal.locator('input[type="number"]').nth(1).fill(away);
    await page.getByRole("button", { name: "Đóng" }).click();
  }

  test("đổi tỉ số hiện chấm trên tab Knockout", async ({ page }) => {
    await scoreFirstMatch(page, "3", "0");
    await expect(page.getByTestId("knockout-sync-dot")).toBeVisible();
  });

  test("mở Knockout hiện banner sync", async ({ page }) => {
    await scoreFirstMatch(page, "2", "1");
    await goToTab(page, "knockout");
    await expect(page.getByText("Knockout đã cập nhật theo BXH mới")).toBeVisible();
  });

  test("đóng banner sync", async ({ page }) => {
    await scoreFirstMatch(page, "1", "0");
    await goToTab(page, "knockout");
    await page.getByRole("button", { name: "Đóng" }).click();
    await expect(page.getByText("Knockout đã cập nhật theo BXH mới")).not.toBeVisible();
  });

  test("chấm tab ẩn khi đang ở Knockout, hiện lại khi quay về", async ({ page }) => {
    await scoreFirstMatch(page, "4", "0");
    await goToTab(page, "knockout");
    await expect(page.getByTestId("knockout-sync-dot")).not.toBeVisible();

    await goToTab(page, "groups");
    await expect(page.getByTestId("knockout-sync-dot")).toBeVisible();
    await expect(knockoutTab(page)).toBeVisible();
  });
});