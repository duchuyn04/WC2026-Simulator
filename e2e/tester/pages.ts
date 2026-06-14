import { expect, type Page } from "@playwright/test";
import type { HangBXH, TranTiSo } from "./test-data";

/** Trang Vòng bảng — viết theo ngôn ngữ tester */
export class TrangVongBang {
  constructor(private page: Page) {}

  async moApp() {
    await this.page.addInitScript(() => localStorage.removeItem("wc2026-simulation"));
    await this.page.goto("/");
    await expect(this.page.getByRole("heading", { name: "WC 2026 Simulator" })).toBeVisible();
  }

  theBang(chuCai: string) {
    return this.page.getByTestId(`group-card-${chuCai}`);
  }

  hangBXH(maDoi: string, bang = "A") {
    return this.theBang(bang).getByTestId(`standing-row-${maDoi}`);
  }

  async moChiTiet(bang: string) {
    const modal = this.page.getByTestId(`group-detail-modal-${bang}`);
    if (await modal.isHidden()) {
      await this.page.getByTestId(`group-detail-btn-${bang}`).click();
      await modal.waitFor();
    }
  }

  async nhapTiSo(bang: string, tran: number, nha: number, khach: number) {
    await this.moChiTiet(bang);
    const oNhap = this.page.getByTestId(`group-detail-modal-${bang}`).locator('input[type="number"]');
    const idx = (tran - 1) * 2;
    await oNhap.nth(idx).fill(String(nha));
    await oNhap.nth(idx + 1).fill(String(khach));
  }

  async nhapNhieuTran(bang: string, cacTran: TranTiSo[]) {
    for (const t of cacTran) {
      await this.nhapTiSo(bang, t.tran, t.nha, t.khach);
    }
  }

  async kiemTraDiem(bang: string, hang: HangBXH) {
    const row = this.page.getByTestId(`group-detail-modal-${bang}`).getByTestId(`standing-row-${hang.maDoi}`);
    await expect(row, `${hang.maDoi} phải có ${hang.diem}pts`).toContainText(`${hang.diem}pts`);
    const hieuSo = hang.hieuSo > 0 ? `+${hang.hieuSo}` : String(hang.hieuSo);
    await expect(row, `${hang.maDoi} hiệu số ${hieuSo}`).toContainText(hieuSo);
  }

  async kiemTraThuHang(bang: string, thuTuMaDoi: string[]) {
    const rows = this.page.getByTestId(`group-detail-modal-${bang}`).locator("[data-testid^='standing-row-']");
    for (let i = 0; i < thuTuMaDoi.length; i++) {
      await expect(rows.nth(i)).toHaveAttribute("data-testid", `standing-row-${thuTuMaDoi[i]}`);
    }
  }
}

/** Tab Hạng 3 */
export class TrangHangBa {
  constructor(private page: Page) {}

  async chuyenTab() {
    await this.page.getByTestId("tab-third").click();
    await expect(this.page.getByRole("heading", { name: "8 đội hạng 3 tốt nhất" })).toBeVisible();
  }

  async kiemTraSoLuong() {
    await expect(this.page.locator(".border-emerald-800\\/50")).toHaveCount(8);
    await expect(this.page.getByText("Bị loại (hạng 3)")).toBeVisible();
  }

  async kiemTraCoMaTongHop() {
    const code = this.page.locator("code.text-amber-400");
    await expect(code).not.toHaveText("—");
    await expect(code).toHaveText(/^[A-L](,[A-L]){7}$/);
  }
}

/** Import kịch bản JSON */
export class TienIchKichBan {
  constructor(private page: Page) {}

  async nhapFile(duongDanFile: string) {
    await this.page.locator('input[type="file"]').setInputFiles(duongDanFile);
  }
}