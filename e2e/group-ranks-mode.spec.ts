import { test, expect } from "@playwright/test";
import { gotoFresh, goToTab, groupCard, dndKitDrag } from "./helpers";

test.describe("Chế độ chọn thứ hạng vòng bảng", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
    await page.getByTestId("group-mode-ranks").click();
  });

  test("hiển thị BXH kéo thả ngay trên card bảng", async ({ page }) => {
    await expect(page.getByTestId("group-mode-ranks")).toHaveClass(/bg-amber-500/);
    await expect(page.getByText("Kéo thả thứ hạng")).toBeVisible();
    const card = groupCard(page, "A");
    await expect(card.getByTestId("group-rank-list")).toBeVisible();
    await expect(card.getByTestId("standing-row-MEX")).toBeVisible();
    await expect(card.locator('input[type="number"]')).toHaveCount(0);
    await expect(card.getByText("pts")).toHaveCount(0);
    await expect(page.getByTestId("group-detail-btn-A")).toHaveCount(0);
  });

  test("kéo thả đổi thứ hạng bảng A trên card", async ({ page }) => {
    const card = groupCard(page, "A");
    await dndKitDrag(page, card.getByTestId("standing-row-KOR"), card.getByTestId("standing-row-MEX"));
    await expect(card.getByTestId("standing-row-KOR").getByText("🥇")).toBeVisible();
    await expect(card.getByTestId("standing-row-MEX").getByText("🥈")).toBeVisible();
  });

  test("kéo thả đổi hạng 3 bảng A", async ({ page }) => {
    const card = groupCard(page, "A");
    await dndKitDrag(page, card.getByTestId("standing-row-RSA"), card.getByTestId("standing-row-CZE"));
    await expect(card.getByTestId("standing-row-RSA").getByText("🥉")).toBeVisible();
  });

  test("tab Hạng 3 kéo thả xếp 1-12", async ({ page }) => {
    await goToTab(page, "third");
    await expect(page.getByTestId("third-place-rank-list")).toBeVisible();
    await expect(page.getByText("Hạng 1–8 (xanh) đi tiếp")).toBeVisible();
    const rows = page.locator("[data-testid^='sortable-team-']");
    await expect(rows).toHaveCount(12);
  });
});