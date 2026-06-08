import { test, expect } from "@playwright/test";
import { gotoFresh } from "./helpers";

test.describe("WC 2026 Simulator — smoke", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  test("loads app shell", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "WC 2026 Simulator" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vòng bảng" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hạng 3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Knockout" })).toBeVisible();
  });

  test("Mexico City Stadium visible on groups", async ({ page }) => {
    await expect(page.getByText(/Mexico City Stadium/).first()).toBeVisible();
  });
});