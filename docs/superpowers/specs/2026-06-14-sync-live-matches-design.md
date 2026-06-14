# Đặc tả thiết kế: Đồng bộ trận đấu đang diễn ra (Live Matches Sync)

Tài liệu này mô tả thiết kế chi tiết cho việc tích hợp kết quả của các trận đấu đang diễn ra (trạng thái `"in"` từ ESPN) vào trình giả lập World Cup 2026.

## 1. Bối cảnh & Mục tiêu

Hiện tại, tính năng đồng bộ kết quả từ ESPN (`SyncLiveResultsButton`) chỉ lấy các trận đấu đã kết thúc (`state: "post"`). Các trận đấu đang diễn ra bị bỏ qua, dẫn đến việc người dùng không thể cập nhật kết quả trực tiếp của các trận đang đá vào bảng mô phỏng của mình.

Mục tiêu:
* Cho phép đồng bộ tỉ số hiện tại của cả các trận đấu đang diễn ra (`state: "in"`).
* Đếm riêng số lượng trận đã kết thúc và trận đang diễn ra khi hiển thị hộp thoại xác nhận (Confirmation Prompt) cho người dùng.

## 2. Thiết kế chi tiết

### 2.1. Logic xử lý dữ liệu (`src/lib/sync-live-results.ts`)

#### Hàm `espnScoresToResult`
Thay đổi điều kiện kiểm tra trạng thái trận đấu từ chỉ chấp nhận `"post"` sang cả `"post"` và `"in"`.
Sử dụng hàm tiện ích sẵn có `hasEspnMatchScore` từ `src/lib/espn-match.ts`:

```typescript
// Trước đây:
// if (espn.state !== "post") return null;

// Thay thế bằng:
if (!hasEspnMatchScore(espn)) return null;
```

#### Hàm `buildLiveGroupResults`
Thay đổi chữ ký của hàm để trả về thêm số lượng trận đấu đang diễn ra (`liveCount`):

```typescript
export function buildLiveGroupResults(
  groupEntries: ScheduleEntry[],
  espnMatches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>,
): { 
  updates: Record<string, MatchResult>; 
  finishedCount: number; 
  liveCount: number; 
}
```

Trong vòng lặp duyệt qua các trận đấu, nếu trận đấu hợp lệ có tỉ số, phân loại để tăng bộ đếm tương ứng:
```typescript
if (espn.state === "post") {
  finishedCount += 1;
} else if (espn.state === "in") {
  liveCount += 1;
}
```

### 2.2. Thay đổi giao diện (`src/components/SyncLiveResultsButton.tsx`)

Nhận giá trị `liveCount` từ hàm `buildLiveGroupResults` và xử lý luồng hiển thị:

1. **Kiểm tra tổng số trận đấu được đồng bộ**:
   ```typescript
   const totalCount = finishedCount + liveCount;
   if (totalCount === 0) {
     window.alert("Chưa có trận vòng bảng nào kết thúc hoặc đang diễn ra trên ESPN.");
     return;
   }
   ```

2. **Hiển thị thông báo xác nhận chi tiết**:
   ```typescript
   let message = "";
   if (finishedCount > 0 && liveCount > 0) {
     message = `Áp dụng ${totalCount} kết quả thật (${finishedCount} trận đã kết thúc, ${liveCount} trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
   } else if (finishedCount > 0) {
     message = `Áp dụng ${finishedCount} kết quả thật (trận đã kết thúc) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
   } else {
     message = `Áp dụng ${liveCount} kết quả thật (trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
   }
   ```

### 2.3. Cập nhật Kiểm thử (`src/lib/__tests__/sync-live-results.test.ts`)

* Cập nhật các test case hiện tại để kiểm tra cấu trúc kết quả trả về mới có chứa `liveCount`.
* Chỉnh sửa test case `"ignores live and scheduled matches"` thành `"processes live matches and ignores scheduled matches"`. Đảm bảo trận đấu live (`state: "in"`) được đưa vào `updates` và tăng `liveCount`.

## 3. Kế hoạch xác minh (Verification Plan)

1. **Unit Test**: Chạy `npm run test:unit` để đảm bảo logic đồng bộ và đếm hoạt động chính xác.
2. **Build**: Chạy `npm run build` để kiểm tra lỗi TypeScript/Next.js.
