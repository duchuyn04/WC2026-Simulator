import { expect, test } from "@playwright/test";

test("shows FIFA tournament leaderboards across all statistic tabs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Lịch thi đấu & Yêu thích" }).click();
  await page.getByTestId("schedule-filter-stats").click();

  const stats = page.getByTestId("tournament-stats");
  await expect(stats.getByText("Dữ liệu chính thức từ FIFA")).toBeVisible();
  await expect(stats.getByText(/Đã tổng hợp \d+ trận hoàn tất/)).toBeVisible();

  const categories = [
    ["goals", "Vua phá lưới"],
    ["assists", "Kiến tạo nhiều nhất"],
    ["penalties", "Sút penalty nhiều nhất"],
    ["yellowCards", "Nhận thẻ vàng nhiều nhất"],
    ["redCards", "Nhận thẻ đỏ nhiều nhất"],
  ] as const;

  for (const [id, heading] of categories) {
    const tab = page.getByTestId(`stats-category-${id}`);
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(
      stats.getByRole("heading", { name: heading }),
    ).toBeVisible();
  }
});
