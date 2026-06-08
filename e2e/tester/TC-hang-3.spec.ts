/**
 * TEST SCRIPT CHO TESTER — HẠNG 3 & ĐỒNG BỘ KNOCKOUT
 * Chạy: npm run test:tester
 */

import { join } from "path";
import { test, expect } from "@playwright/test";
import { TC004, TC005 } from "./test-data";
import { TrangVongBang, TrangHangBa, TienIchKichBan } from "./pages";

test.describe("Hạng 3 & Đồng bộ", () => {
  test(`${TC004.id} | ${TC004.ten}`, async ({ page }) => {
    const trang = new TrangVongBang(page);
    const hang3 = new TrangHangBa(page);
    const kichBan = new TienIchKichBan(page);
    const filePath = join(__dirname, "fixtures", TC004.fileKichBan);

    await test.step("Bước 1: Mở ứng dụng", async () => {
      await trang.moApp();
    });

    await test.step(`Bước 2: Nhập kịch bản ${TC004.fileKichBan} (72 trận vòng bảng)`, async () => {
      await kichBan.nhapFile(filePath);
    });

    await test.step("Bước 3: Chuyển sang tab Hạng 3", async () => {
      await hang3.chuyenTab();
    });

    await test.step(`Bước 4: Phải có đúng ${TC004.soDoiDiTiep} đội đi tiếp (khung xanh)`, async () => {
      await expect(page.locator(".border-emerald-800\\/50")).toHaveCount(TC004.soDoiDiTiep);
    });

    await test.step(`Bước 5: Phải có ${TC004.soDoiLoai} đội bị loại`, async () => {
      await expect(page.getByText("Bị loại (hạng 3)")).toBeVisible();
      const loai = page
        .locator("div")
        .filter({ has: page.getByText("Bị loại (hạng 3)") })
        .locator(".opacity-60");
      await expect(loai).toHaveCount(TC004.soDoiLoai);
    });

    await test.step("Bước 6: Hiển thị mã tổ hợp bảng (Annex C)", async () => {
      await hang3.kiemTraCoMaTongHop();
    });
  });

  test(`${TC005.id} | ${TC005.ten}`, async ({ page }) => {
    const trang = new TrangVongBang(page);

    await test.step("Bước 1: Mở ứng dụng", async () => {
      await trang.moApp();
    });

    await test.step(`Bước 2: Nhập tỉ số Bảng ${TC005.bang} trận ${TC005.tran}: ${TC005.nha}-${TC005.khach}`, async () => {
      await trang.nhapTiSo(TC005.bang, TC005.tran, TC005.nha, TC005.khach);
    });

    await test.step("Bước 3: Tab Knockout hiện chấm báo đã cập nhật", async () => {
      await expect(page.getByTestId("knockout-sync-dot")).toBeVisible();
    });

    await test.step("Bước 4: Vào Knockout — thấy banner thông báo", async () => {
      await page.getByTestId("tab-knockout").click();
      await expect(page.getByText("Knockout đã cập nhật theo BXH mới")).toBeVisible();
    });

    await test.step("Bước 5: Đóng banner", async () => {
      await page.getByRole("button", { name: "Đóng" }).click();
      await expect(page.getByText("Knockout đã cập nhật theo BXH mới")).not.toBeVisible();
    });
  });
});