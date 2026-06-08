import { test, expect } from "@playwright/test";
import { gotoFresh, openGroupDetail, groupDetailModal } from "./helpers";

const GROUPS = "ABCDEFGHIJKL".split("");

test.describe("Vòng bảng", () => {
  test.beforeEach(async ({ page }) => {
    await gotoFresh(page);
  });

  for (const letter of GROUPS) {
    test(`hiển thị Bảng ${letter}`, async ({ page }) => {
      await expect(page.getByRole("heading", { name: `Bảng ${letter}` })).toBeVisible();
    });
  }

  test("popup chi tiết có 12 ô nhập tỉ số", async ({ page }) => {
    await openGroupDetail(page, "A");
    await expect(groupDetailModal(page, "A").locator('input[type="number"]')).toHaveCount(12);
  });

  test("nhập tỉ số trong popup cập nhật điểm", async ({ page }) => {
    await openGroupDetail(page, "A");
    const modal = groupDetailModal(page, "A");
    const first = modal.locator('input[type="number"]').first();
    const second = modal.locator('input[type="number"]').nth(1);
    await first.fill("3");
    await second.fill("0");
    await expect(page.getByText("3pts").first()).toBeVisible();
  });

  test("xóa tỉ số trả về rỗng", async ({ page }) => {
    await openGroupDetail(page, "A");
    const first = groupDetailModal(page, "A").locator('input[type="number"]').first();
    await first.fill("2");
    await first.fill("");
    await expect(first).toHaveValue("");
  });

  test("nhập một bên không tự điền -1 bên kia", async ({ page }) => {
    await openGroupDetail(page, "A");
    const modal = groupDetailModal(page, "A");
    const first = modal.locator('input[type="number"]').first();
    const second = modal.locator('input[type="number"]').nth(1);
    await first.fill("1");
    await expect(second).toHaveValue("");
  });

  test("popup chi tiết hiển thị giờ VN và sân", async ({ page }) => {
    await openGroupDetail(page, "A");
    const modal = groupDetailModal(page, "A");
    await expect(modal.getByText("Giờ VN:").first()).toBeVisible();
    await expect(modal.getByText("Sân:").first()).toBeVisible();
  });

  test("cờ đội tải từ local assets", async ({ page }) => {
    const flag = page.locator('img[src*="/flags/"]').first();
    await expect(flag).toBeVisible();
    const ok = await flag.evaluate((img) => (img as HTMLImageElement).naturalWidth > 0);
    expect(ok).toBe(true);
  });
});