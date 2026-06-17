# 24-Hour Auto-Update FIFA Squads Design Spec

- **Status**: Approved
- **Date**: 2026-06-17
- **Author**: Claude Code

## 1. Context & Requirements

`data/fifa-teams-squads.json` chứa đội hình 48 đội tuyển và ảnh cầu thủ. URL ảnh từ FIFA API có thể bị hỏng hoặc thay đổi theo thờigian (ví dụ Portugal trước đó trả về URL 404, sau khi refresh lại có URL hợp lệ).

Yêu cầu:
1. Tự động refresh `data/fifa-teams-squads.json` mỗi 24 giờ từ FIFA API.
2. Có client-side fallback để user thấy ảnh mới nhất ngay cả khi static export chưa kịp deploy.
3. Cải thiện placeholder cho cầu thủ/HCV thiếu ảnh.

## 2. Proposed Changes

### A. GitHub Actions workflow `.github/workflows/update-squads.yml`

Trigger:
- `schedule: cron: "0 0 * * *"` (00:00 UTC = 07:00 giờ Việt Nam).
- `workflow_dispatch`.

Concurrency:
- Group `update-squads`, `cancel-in-progress: true`.

Steps:
1. Checkout `main`.
2. Setup Node 22, `npm ci`.
3. Chạy `npm run fetch:teams-squads`.
4. Kiểm tra `git diff --quiet -- data/fifa-teams-squads.json`.
5. Nếu thay đổi:
   - Config git user `github-actions[bot]`.
   - Commit `data/fifa-teams-squads.json` với message `chore: update FIFA squads`.
   - Push lên `main`.
   - Trigger deploy workflow `deploy.yml` qua `gh workflow run deploy.yml --ref main`.

Permissions:
- `contents: write` để commit.
- `actions: write` để trigger deploy workflow.

### B. Client-side fallback `src/lib/fifa-squads-fetch.ts`

Vì app deploy dạng static export lên GitHub Pages, Next.js API routes không hoạt động ở production. Client phải gọi FIFA API trực tiếp (đã có tiền lệ với `fetchTournamentStatsFromFifa`).

Hàm `fetchTeamSquadFromFifa(teamId: string)`:
- Gọi `https://api.fifa.com/api/v3/teams/{teamId}/squad?idCompetition=17&idSeason=285023&language=en`.
- Normalize response thành player shape giống `fifa-teams-squads.json`:
  - `id`, `name`, `shortName`, `jerseyNumber`, `position`, `realPosition`, `birthDate`, `heightCm`, `weightKg`, `countryCode`, `pictureUrl`, `pictureSource`.
- Trả về mảng player hoặc `null` nếu lỗi.

### C. Hook `useLiveSquadSync(team)`

Sử dụng trong `src/app/teams/[slug]/page.tsx` hoặc `TeamRoster`:
- Input: team object từ static JSON.
- So sánh `data.fetchedAt` với `Date.now()`.
- Nếu chênh lệch > 24h:
  - Gọi `fetchTeamSquadFromFifa(team.id)`.
  - Nếu thành công, merge ảnh mới (`pictureUrl`) vào danh sách cầu thủ đang render, match theo `player.id` (FIFA player ID) và fallback theo `jerseyNumber`.
  - Không persist localStorage — chỉ dùng trong session hiện tại để tránh data lỗi lan truyền.
- Nếu thất bại, giữ nguyên static JSON.

### D. Cải thiện placeholder

Chỉnh sửa `src/components/PortraitImage.tsx` / `PortraitPlaceholder.tsx`:
- Thay text "No image" bằng icon silhouette/badge đội.
- Giữ gradient màu đội làm nền.
- Hiển thị số áo + vị trí rõ ràng ở giữa.
- Áp dụng cho cả cầu thủ và HLV (nếu `headCoach.pictureUrl` null).

Không thay đổi props API; chỉ cải thiện UI bên trong component.

## 3. Testing and Verification Plan

1. **Workflow**: chạy `workflow_dispatch` thủ công, xác minh commit + deploy đúng.
2. **Client fetch**: test trên `npm run dev` và production GitHub Pages với team có data cũ.
3. **Placeholder**: kiểm tra 5 đội còn thiếu ảnh (ARG, ENG, HAI, NZL, UZB) hiển thị placeholder mới.
4. **Unit tests**: chạy `npm run test` để đảm bảo `PortraitImage` / `TeamRoster` không bị ảnh hưởng.
5. **Build**: `npm run build` phải pass.

## 4. Rollback

- Revert workflow file và source changes.
- Data file có thể restore từ git history.

## 5. File List

| File | Action |
|------|--------|
| `.github/workflows/update-squads.yml` | Create |
| `src/lib/fifa-squads-fetch.ts` | Create |
| `src/lib/hooks.ts` or `src/app/teams/[slug]/page.tsx` | Edit — integrate `useLiveSquadSync` |
| `src/components/PortraitImage.tsx` | Edit — improve placeholder |
| `src/components/PortraitPlaceholder.tsx` (if split) | Edit or create |
| `data/fifa-teams-squads.json` | Already refreshed; will be auto-updated by workflow |

## 6. Notes

- FIFA API hiện tại cho phép CORS từ browser (dựa trên pattern `fetchTournamentStatsFromFifa` đang hoạt động).
- Nếu FIFA thay đổi CORS, client fallback sẽ thất bại và giữ nguyên static JSON.
- Workflow chỉ commit khi có thay đổi thực sự, tránh deploy thừa.
