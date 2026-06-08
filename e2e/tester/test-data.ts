/**
 * BẢNG DỮ LIỆU TEST — Tester chỉnh sửa file này khi thêm kịch bản mới.
 * Mỗi test case tham chiếu ID + dữ liệu nhập + kết quả mong đợi (expected).
 */

export type TranTiSo = {
  /** Số thứ tự trận trong bảng (1 = trận đầu tiên hiển thị) */
  tran: number;
  nha: number;
  khach: number;
  moTa: string;
};

export type HangBXH = {
  maDoi: string;
  diem: number;
  hieuSo: number;
};

export const TC001 = {
  id: "TC-001",
  ten: "Vòng 1 Bảng A — thắng được 3 điểm",
  bang: "A",
  cacTran: [
    { tran: 1, nha: 2, khach: 0, moTa: "Mexico 2-0 South Africa" },
    { tran: 2, nha: 1, khach: 1, moTa: "Korea 1-1 Czechia" },
  ] as TranTiSo[],
  bxhMongDoi: [
    { maDoi: "MEX", diem: 3, hieuSo: 2 },
    { maDoi: "KOR", diem: 1, hieuSo: 0 },
    { maDoi: "CZE", diem: 1, hieuSo: 0 },
    { maDoi: "RSA", diem: 0, hieuSo: -2 },
  ] as HangBXH[],
};

export const TC002 = {
  id: "TC-002",
  ten: "Hòa 1-1 — mỗi đội được 1 điểm",
  bang: "A",
  cacTran: [{ tran: 1, nha: 1, khach: 1, moTa: "Mexico 1-1 South Africa" }] as TranTiSo[],
  bxhMongDoi: [
    { maDoi: "MEX", diem: 1, hieuSo: 0 },
    { maDoi: "RSA", diem: 1, hieuSo: 0 },
  ] as HangBXH[],
};

export const TC003 = {
  id: "TC-003",
  ten: "Bảng A đủ 6 trận — thứ hạng cuối bảng",
  bang: "A",
  cacTran: [
    { tran: 1, nha: 2, khach: 0, moTa: "Mexico 2-0 South Africa" },
    { tran: 2, nha: 2, khach: 1, moTa: "Korea 2-1 Czechia" },
    { tran: 3, nha: 0, khach: 0, moTa: "Czechia 0-0 South Africa" },
    { tran: 4, nha: 1, khach: 0, moTa: "Mexico 1-0 Korea" },
    { tran: 5, nha: 1, khach: 3, moTa: "Czechia 1-3 Mexico" },
    { tran: 6, nha: 1, khach: 2, moTa: "South Africa 1-2 Korea" },
  ] as TranTiSo[],
  thuHangCuoi: ["MEX", "KOR", "CZE", "RSA"],
  diemDauBang: { maDoi: "MEX", diem: 9 },
  diemNhiBang: { maDoi: "KOR", diem: 6 },
};

/** 8 đội hạng 3 đi tiếp khi nhập file kich-ban-12-bang.json */
export const TC004 = {
  id: "TC-004",
  ten: "Tab Hạng 3 — 8 đội đi tiếp, 4 đội loại",
  fileKichBan: "kich-ban-12-bang.json",
  soDoiDiTiep: 8,
  soDoiLoai: 4,
};

export const TC005 = {
  id: "TC-005",
  ten: "Đổi tỉ số vòng bảng → tab Knockout báo cập nhật",
  bang: "A",
  tran: 1,
  nha: 3,
  khach: 0,
};