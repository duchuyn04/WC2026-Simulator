# WC 2026 Simulator

Ứng dụng web mô phỏng kết quả **FIFA World Cup 2026** — nhập tỉ số vòng bảng, xếp hạng đội hạng 3 theo Annex C, dự đoán knockout và xem toàn bộ lịch thi đấu theo giờ Việt Nam.

**Demo:** [https://duchuyn04.github.io/WC2026-Simulator/](https://duchuyn04.github.io/WC2026-Simulator/)

## Tính năng

| Mục | Mô tả |
|-----|--------|
| **Vòng bảng** | 12 bảng × 4 đội, nhập tỉ số 72 trận, BXH cập nhật theo luật FIFA (điểm, hiệu số, fair play, FIFA Ranking) |
| **Lịch thi đấu** | 104 trận (vòng bảng + knockout) sắp theo ngày, giờ VN, sân; hiển thị tỉ số mô phỏng và đội thắng knockout |
| **Hạng 3** | Xếp 12 đội hạng 3, chọn 8 đội vào vòng knock-out theo **495 tổ hợp Annex C** |
| **Knockout** | Nhánh 32 đội, chọn đội thắng từng trận, đồng bộ tự động khi đổi kết quả vòng bảng |
| **Lưu kịch bản** | Tự động lưu trên trình duyệt (localStorage) — tỉ số, thứ hạng thủ công, lựa chọn knockout |
| **Responsive** | Tối ưu mobile (zoom/pan nhánh knockout), cờ đội local, không tràn ngang |

## Công nghệ

- **Next.js 16** (App Router, static export cho GitHub Pages)
- **React 19** + **TypeScript**
- **Zustand** (state + persist)
- **Tailwind CSS 4**
- **Vitest** (unit) · **Playwright** (E2E)
- Dữ liệu: FIFA API (`survey:fifa`), FIFA Ranking ([inside.fifa.com](https://inside.fifa.com))

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Build production (giống GitHub Pages):

```bash
GITHUB_PAGES=true npm run build
```

## Deploy

### GitHub Pages (hiện tại)

Push lên `main` → workflow `.github/workflows/deploy.yml` build và đẩy nhánh `gh-pages`.

Lần đầu bật Pages:

1. [Settings → Pages](https://github.com/duchuyn04/WC2026-Simulator/settings/pages)
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `/ (root)` → Save

`basePath` khi build: `/WC2026-Simulator` (xem `next.config.ts`).

### Vercel / domain gốc

Bỏ `GITHUB_PAGES` và `basePath` khi deploy lên domain gốc (`/`).

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E (Playwright) |
| `npm run fetch:rankings` | Cập nhật FIFA ranking từ inside.fifa.com |
| `npm run survey:fifa` | Tải lịch & đội từ FIFA API → `data/wc2026-seed.json` |
| `npm run download:flags` | Tải cờ đội vào `public/flags/` |

## Cấu trúc dữ liệu

- `data/wc2026-seed.json` — 48 đội, 72 trận vòng bảng, 32 trận knockout
- `data/third-place-combinations.json` — Annex C (495 tổ hợp)
- `data/fifa-rankings.json` — FIFA Ranking (tie-break)

## Giấy phép

Dự án cá nhân / học tập. Logo và dữ liệu FIFA thuộc FIFA.