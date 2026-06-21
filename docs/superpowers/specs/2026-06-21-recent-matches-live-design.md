# Design: Hiển thị kết quả các trận đấu gần nhất trong tab Trực tiếp

## Tóm tắt

Thêm section **"Các trận gần nhất"** vào đầu tab **Trực tiếp (Live)**, hiển thị 5 trận đã kết thúc gần nhất theo dữ liệu ESPN. Đồng thời bổ sung nút lọc **"Đã đá"** để xem toàn bộ trận đã kết thúc (không giới hạn số lượng). Người dùng có thể bấm vào từng trận để xem chi tiết (`MatchStatsModal`) và đồng bộ tỉ số vào simulator, hoặc đồng bộ hàng loạt qua nút **"Đồng bộ tất cả"**.

## Ngữ cảnh

- Tab **Trực tiếp** hiện chỉ có 2 nhóm: trận đang diễn ra (live) và trận sắp đá (upcoming, trong hôm nay/ngày mai).
- ESPN scoreboard API trả về các trận với trạng thái `pre` | `in` | `post`. Trận `post` là trận đã kết thúc nhưng chưa được sử dụng trong tab Live.
- Dữ liệu được fetch 15s/lần qua `useEspnLiveScores` và đã có sẵn trong `AppShell` để truyền xuống `LivePanel`.

## Yêu cầu đã làm rõ

| Câu hỏi | Quyết định |
|---|---|
| "Gần nhất" nghĩa là gì? | **5 trận đã kết thúc gần nhất** (state `post`), bất kể thời gian. |
| Hiển thị ở đâu? | **Ở đầu tab Trực tiếp**, phía trên LIVE và Sắp đá. |
| Có nhóm theo ngày không? | **Có**, nhóm theo ngày giống upcoming (Hôm nay, Hôm qua, Thứ X · dd/mm). |
| Bấm vào trận thì sao? | Mở **MatchStatsModal**; trong modal có nút áp dụng tỉ số vào simulator nếu là vòng bảng. |
| Có đồng bộ hàng loạt không? | **Có**, nút **"Đồng bộ tất cả"** ở đầu section, chỉ áp dụng cho trận vòng bảng. |
| Bao gồm knockout không? | **Có**, hiển thị tất cả trận đã kết thúc (vòng bảng + knockout). Đồng bộ chỉ áp dụng vòng bảng. |
| Empty state? | Hiện section với thông báo **"Chưa có trận nào kết thúc"**. |
| Tab lọc? | Thêm nút lọc thứ 3 **"Đã đá"**. Chế độ "Tất cả" hiện section 5 trận; chế độ "Đã đá" hiện toàn bộ trận đã kết thúc. |

## Các phương án đã xem xét

| Phương án | Mô tả | Ưu điểm | Nhược điểm | Kết luận |
|---|---|---|---|---|
| A — Mở rộng `LivePanel` trực tiếp | Viết logic + UI của recent section trong `LivePanel.tsx`. | Ít file, nhanh. | `LivePanel` đã 292 dòng, sẽ phình to thêm. | Từ chối. |
| B — Tách `RecentMatchesPanel` mới | Component độc lập nhận `espnMatches` + entries, `LivePanel` import đặt vào đầu. | Ranh giới rõ, dễ test, dễ bảo trì. | Thêm 1 file component. | **Chọn**. |
| C — Tái sử dụng `RecentMatches` hiện có | `RecentMatches` dùng cho phong độ đội bóng (W/L/D). | Reuse UI. | Shape dữ liệu khác, mục đích khác, khó tích hợp sync. | Từ chối. |

## Kiến trúc

Thay đổi tập trung ở 2 file chính:

- **`src/components/RecentMatchesPanel.tsx`** (mới): component độc lập, hiển thị danh sách trận đã kết thúc.
- **`src/components/LivePanel.tsx`**: thêm filter mode `"done"`, render `RecentMatchesPanel` ở các vị trí phù hợp.

Hỗ trợ:

- **`src/lib/espn-match.ts`**: dùng `espnMatch.state === "post"` để lọc trận kết thúc.
- **`src/lib/date-label.ts`** (mới hoặc refactor từ `LivePanel`): hàm `formatDateLabel` dùng chung cho `LivePanel` và `RecentMatchesPanel`.
- **`src/lib/sync-live-results.ts`**: tái sử dụng `buildLiveGroupResults()` cho nút "Đồng bộ tất cả".

```text
AppShell
└── LivePanel
    ├── RecentMatchesPanel (mode="recent-5" | "all-done")
    │   └── RecentMatchCard
    ├── Live section
    │   └── LiveMatchCard
    └── Upcoming section
        └── UpcomingMatchCard
```

## Component `RecentMatchesPanel`

### Props

```ts
type RecentMatchesPanelProps = {
  espnMatches: EspnScoreboardMatch[];
  entries: ScheduleEntry[];
  mode: "recent-5" | "all-done";
  title?: string;
  showSyncAll?: boolean;
  onOpenDetail?: (gameId: string, matchDate: string) => void;
};
```

- `mode === "recent-5"`: hiển thị tối đa 5 trận gần nhất, dùng cho chế độ "Tất cả" của `LivePanel`.
- `mode === "all-done"`: hiển thị toàn bộ trận đã kết thúc, dùng cho chế độ "Đã đá".

### Logic bên trong

1. **Lọc trận đã kết thúc:**
   - Duyệt `entries`, tìm `espnMatch` tương ứng qua `findEspnMatch`.
   - Chỉ giữ lại nếu `espnMatch.state === "post"` và có cả `homeScore` lẫn `awayScore`.
   - Nếu `espnMatches.length === 0`: trả về `[]` (không đoán mò).

2. **Sort:** mới nhất → cũ nhất theo `espnMatch.date`.

3. **Giới hạn:** nếu `mode === "recent-5"`, lấy 5 phần tử đầu.

4. **Nhóm theo ngày:** dùng `formatDateLabel` (tái sử dụng/refactor từ `LivePanel`).

5. **Render:**
   - Header: title + nút `"Đồng bộ tất cả"` (nếu `showSyncAll`).
   - Danh sách nhóm theo ngày, mỗi trận là `<RecentMatchCard />`.
   - Empty state: `"Chưa có trận nào kết thúc"`.

### Component con `RecentMatchCard`

Tạo mới, không sửa `LiveMatchCard` để tránh ảnh hưởng luồng live hiện tại.

- Giao diện giống `LiveMatchCard` nhưng:
  - Không hiệu ứng pulse/live.
  - Không có border-left đỏ.
  - Badge trạng thái là `"Đã kết thúc"` hoặc `shortDetail` từ ESPN.
- Props:

```ts
type RecentMatchCardProps = {
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  onOpenDetail?: (gameId: string, matchDate: string) => void;
};
```

## Luồng dữ liệu & đồng bộ

### Lọc trận đã kết thúc

```ts
function getDoneEntries(
  entries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>
): DoneEntry[] {
  return entries
    .map((entry) => {
      const espn = findEspnMatch(entry, espnMatches, espnToLocal);
      if (!espn || espn.state !== "post") return null;
      if (espn.homeScore == null || espn.awayScore == null) return null;
      return { entry, espn };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.espn.date).getTime() - new Date(a.espn.date).getTime());
}
```

### Nhóm theo ngày

Tái sử dụng `formatDateLabel` từ `LivePanel`. Đề xuất refactor thành `src/lib/date-label.ts` để dùng chung.

### Đồng bộ từng trận trong `MatchStatsModal`

Khi xem một trận đã kết thúc, thêm nút `"Áp dụng vào mô phỏng"`:

- Nếu trận là vòng bảng: gọi `applyLiveResults({ [entry.id]: result })`.
- Nếu là knockout: disabled + tooltip/text `"Chỉ đồng bộ được trận vòng bảng"`.

Để biết entry ID, modal cần nhận thêm prop `entryId` (hoặc tìm entry từ `gameId` + `matchDate` trong `LivePanel` trước khi mở modal).

### Đồng bộ tất cả từ `RecentMatchesPanel`

```ts
function syncAllDone(doneEntries: DoneEntry[]) {
  const groupUpdates: Record<string, MatchResult> = {};
  for (const { entry, espn } of doneEntries) {
    if (entry.kind !== "group") continue;
    const result = espnScoresToResult(entry, espn, espnToLocal);
    if (result) groupUpdates[entry.id] = result;
  }
  applyLiveResults(groupUpdates);
}
```

- Chỉ sync trận vòng bảng.
- Sau khi sync, hiện thông báo `"Đã đồng bộ X trận"` tạm thởi (giống `SyncLiveResultsButton`).

## `LivePanel` cập nhật

```ts
type FilterMode = "all" | "live" | "upcoming" | "done";
```

Hành vi theo filter:

- `"all"` (mặc định): hiện `RecentMatchesPanel mode="recent-5"` ở trên cùng, sau đó LIVE và upcoming.
- `"live"`: chỉ hiện LIVE, không hiện recent.
- `"upcoming"`: chỉ hiện upcoming, không hiện recent.
- `"done"`: chỉ hiện `RecentMatchesPanel mode="all-done"` (không giới hạn), ẩn LIVE/upcoming.

Thanh toggle thêm nút thứ 3:

```text
🔴 LIVE (N)    ⏰ Sắp đá (M)    ✅ Đã đá (K)
```

Style nút `"Đã đá"` dùng tông xanh lá (`emerald`) để phân biệt với đỏ (live) và vàng (upcoming).

## Error handling

| Tình huống | Cách xử lý |
|---|---|
| ESPN chưa load hoặc lỗi (`espnMatches.length === 0`) | Hiện empty state `"Chưa có trận nào kết thúc"`. Không đoán mò. |
| Trận `post` nhưng thiếu tỉ số | Bỏ qua, không render card. |
| Không tìm được `ScheduleEntry` cho `espnMatch` | Bỏ qua. |
| Đồng bộ tất cả nhưng không có trận vòng bảng | Nút sync disabled hoặc hiện `"Không có trận vòng bảng nào để đồng bộ"`. |
| Đồng bộ từng trận knockout | Nút áp dụng disabled + tooltip `"Chỉ đồng bộ được trận vòng bảng"`. |
| `MatchStatsModal` fetch lỗi | Giữ nguyên xử lý hiện tại; nút sync không hiện cho đến khi có dữ liệu. |

## Testing

### Unit tests (Vitest)

File mới: `src/lib/__tests__/recent-matches.test.ts`

- Lọc đúng trận `post`, bỏ qua `pre`/`in`.
- Sort mới nhất → cũ nhất.
- Nhóm theo ngày đúng.
- Giới hạn 5 khi `mode === "recent-5"`.
- Không đoán kết thúc khi `espnMatches` rỗng.
- `syncAllDone` chỉ tạo updates cho trận vòng bảng.

### Component tests

File mới: `src/components/__tests__/RecentMatchesPanel.test.tsx`

- Hiện đúng title theo mode.
- Hiện nút "Đồng bộ tất cả" khi `showSyncAll`.
- Gọi `onOpenDetail` khi click card.
- Empty state khi không có trận.

### E2E tests (Playwright)

Mở rộng `e2e/live-panel.spec.ts` (hoặc tạo mới nếu chưa có):

- Tab Trực tiếp hiển thị section recent khi có dữ liệu mock.
- Toggle "Đã đá" hiển thị toàn bộ trận đã kết thúc.
- Nút "Đồng bộ tất cả" cập nhật tỉ số vòng bảng.

> Lưu ý: vì ESPN API là dữ liệu thật thay đổi, test phải mock `fetch` hoặc dùng fixture.

## Files thay đổi / tạo mới

| File | Thay đổi |
|---|---|
| `src/components/RecentMatchesPanel.tsx` | Tạo mới |
| `src/components/RecentMatchCard.tsx` | Tạo mới |
| `src/components/LivePanel.tsx` | Thêm filter `"done"`, render `RecentMatchesPanel` |
| `src/lib/date-label.ts` | Tạo mới (refactor từ `LivePanel`) |
| `src/components/MatchStatsModal.tsx` | Thêm nút "Áp dụng vào mô phỏng" cho trận đã kết thúc |
| `src/lib/__tests__/recent-matches.test.ts` | Tạo mới |
| `src/components/__tests__/RecentMatchesPanel.test.tsx` | Tạo mới |
| `e2e/live-panel.spec.ts` | Tạo mới hoặc mở rộng |

## Success criteria

1. Tab Trực tiếp hiển thị section "Các trận gần nhất" với đúng 5 trận đã kết thúc gần nhất.
2. Nút lọc "Đã đá" hiển thị toàn bộ trận đã kết thúc, nhóm theo ngày.
3. Bấm vào trận mở `MatchStatsModal`.
4. Nút "Đồng bộ tất cả" chỉ áp dụng tỉ số các trận vòng bảng vào simulator.
5. Unit/component/E2E tests pass.
6. ESLint pass.
