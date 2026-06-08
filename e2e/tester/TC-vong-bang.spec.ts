/**
 * ═══════════════════════════════════════════════════════════════
 *  TEST SCRIPT CHO TESTER — VÒNG BẢNG & TÍNH ĐIỂM
 * ═══════════════════════════════════════════════════════════════
 *
 *  Chạy:  npm run test:tester
 *  Chạy 1 case:  npx playwright test e2e/tester/TC-vong-bang.spec.ts -g "TC-001"
 *  Xem report:   npx playwright show-report
 *
 *  Dữ liệu test: e2e/tester/test-data.ts  (tester sửa expected tại đây)
 */

import { test } from "@playwright/test";
import { TC001, TC002, TC003 } from "./test-data";
import { TrangVongBang } from "./pages";

test.describe("Vòng bảng — Tính điểm BXH", () => {
  test(`${TC001.id} | ${TC001.ten}`, async ({ page }) => {
    const trang = new TrangVongBang(page);

    await test.step("Bước 1: Mở ứng dụng WC 2026 Simulator", async () => {
      await trang.moApp();
    });

    await test.step(`Bước 2: Nhập tỉ số vòng 1 Bảng ${TC001.bang}`, async () => {
      for (const tran of TC001.cacTran) {
        await test.step(`  → ${tran.moTa}`, async () => {
          await trang.nhapTiSo(TC001.bang, tran.tran, tran.nha, tran.khach);
        });
      }
    });

    await test.step("Bước 3: Kiểm tra điểm và hiệu số từng đội", async () => {
      for (const hang of TC001.bxhMongDoi) {
        await test.step(`  → ${hang.maDoi}: ${hang.diem} điểm, hiệu số ${hang.hieuSo}`, async () => {
          await trang.kiemTraDiem(TC001.bang, hang);
        });
      }
    });
  });

  test(`${TC002.id} | ${TC002.ten}`, async ({ page }) => {
    const trang = new TrangVongBang(page);

    await test.step("Bước 1: Mở ứng dụng", async () => {
      await trang.moApp();
    });

    await test.step(`Bước 2: Nhập ${TC002.cacTran[0].moTa}`, async () => {
      const t = TC002.cacTran[0];
      await trang.nhapTiSo(TC002.bang, t.tran, t.nha, t.khach);
    });

    await test.step("Bước 3: Cả hai đội phải có 1 điểm, hiệu số 0", async () => {
      for (const hang of TC002.bxhMongDoi) {
        await trang.kiemTraDiem(TC002.bang, hang);
      }
    });
  });

  test(`${TC003.id} | ${TC003.ten}`, async ({ page }) => {
    const trang = new TrangVongBang(page);

    await test.step("Bước 1: Mở ứng dụng", async () => {
      await trang.moApp();
    });

    await test.step("Bước 2: Nhập đủ 6 trận Bảng A", async () => {
      for (const tran of TC003.cacTran) {
        await test.step(`  → ${tran.moTa}`, async () => {
          await trang.nhapTiSo(TC003.bang, tran.tran, tran.nha, tran.khach);
        });
      }
    });

    await test.step(`Bước 3: Nhà vô địch ${TC003.diemDauBang.maDoi} có ${TC003.diemDauBang.diem} điểm`, async () => {
      await trang.kiemTraDiem(TC003.bang, {
        maDoi: TC003.diemDauBang.maDoi,
        diem: TC003.diemDauBang.diem,
        hieuSo: 5,
      });
    });

    await test.step(`Bước 4: Nhì bảng ${TC003.diemNhiBang.maDoi} có ${TC003.diemNhiBang.diem} điểm`, async () => {
      await trang.kiemTraDiem(TC003.bang, {
        maDoi: TC003.diemNhiBang.maDoi,
        diem: TC003.diemNhiBang.diem,
        hieuSo: 1,
      });
    });

    await test.step(`Bước 5: Thứ hạng: ${TC003.thuHangCuoi.join(" > ")}`, async () => {
      await trang.kiemTraThuHang(TC003.bang, TC003.thuHangCuoi);
    });
  });
});