import { test, expect } from "@playwright/test";
import { gotoFresh } from "./helpers";

test.describe("Tab Trực tiếp", () => {
  test.beforeEach(async ({ page }) => {
    // Mock MUST be registered BEFORE gotoFresh so the fetch on page load is intercepted
    await page.route(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            events: [
              {
                id: "760415",
                date: "2026-06-11T19:00Z",
                competitions: [
                  {
                    status: {
                      displayClock: "90'",
                      type: {
                        name: "STATUS_FULL_TIME",
                        state: "post",
                        shortDetail: "FT",
                      },
                    },
                    competitors: [
                      { homeAway: "home", score: "2", team: { id: "203" } },
                      { homeAway: "away", score: "1", team: { id: "467" } },
                    ],
                  },
                ],
              },
            ],
          }),
        });
      }
    );

    await gotoFresh(page);
  });

  test("hiển thị section Các trận gần nhất khi có trận đã kết thúc", async ({ page }) => {
    await page.getByRole("button", { name: /Trực tiếp/i }).click();
    await expect(page.getByText("Các trận gần nhất")).toBeVisible();
    await expect(page.getByText("Mexico")).toBeVisible();
    await expect(page.getByText("South Africa")).toBeVisible();
  });

  test("lọc Đã đá hiển thị toàn bộ trận đã kết thúc", async ({ page }) => {
    await page.getByRole("button", { name: /Trực tiếp/i }).click();
    await page.getByRole("button", { name: /Đã đá/i }).click();
    await expect(page.getByText("Các trận đã kết thúc")).toBeVisible();
  });
});
