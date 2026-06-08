# WC 2026 Simulator

Mô phỏng kết quả FIFA World Cup 2026 — vòng bảng, hạng 3 (Annex C), knockout bracket.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Deploy (GitHub Pages)

**Live:** [https://duchuyn04.github.io/WC2026-Simulator/](https://duchuyn04.github.io/WC2026-Simulator/)

Lần đầu cần bật Pages (một lần):

1. Vào [Settings → Pages](https://github.com/duchuyn04/WC2026-Simulator/settings/pages)
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `/ (root)` → Save

Mỗi lần push `main`, GitHub Actions tự build và cập nhật nhánh `gh-pages`.

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E (Playwright) |
| `npm run fetch:rankings` | Cập nhật FIFA ranking từ inside.fifa.com |
| `npm run survey:fifa` | Tải lịch thi đấu từ FIFA API |