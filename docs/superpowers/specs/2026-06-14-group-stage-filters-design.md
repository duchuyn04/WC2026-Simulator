# Thiết kế Bộ lọc Bảng đấu và Lượt trận ở Vòng bảng

Tài liệu thiết kế mô tả giải pháp bổ sung bộ lọc theo bảng đấu (Group) và lượt trận (Matchday) tại Vòng bảng cho giao diện Lịch thi đấu trong ứng dụng WC2026 Simulator.

## 1. Yêu cầu & Trải nghiệm người dùng (UX)

### 1.1 Yêu cầu tính năng
- Cho phép người dùng lọc lịch thi đấu vòng bảng theo từng bảng cụ thể (từ bảng A đến bảng L).
- Cho phép lọc lịch thi đấu vòng bảng theo lượt trận (Lượt trận 1, 2, 3).
- Các bộ lọc có thể hoạt động đồng thời (ví dụ: lọc các trận đấu ở **Bảng A** thuộc **Lượt trận 1**).

### 1.2 UX/UI Layout (Phương án B & Option 2 đã chọn)
- **Giao diện bộ lọc**: Sử dụng 2 ô chọn dạng thả xuống (Dropdown/Select) đặt bên cạnh ô Tìm kiếm:
  - Dropdown Bảng đấu: `Tất cả bảng` (mặc định), `Bảng A`, `Bảng B`, ..., `Bảng L`.
  - Dropdown Lượt trận: `Tất cả lượt` (mặc định), `Lượt trận 1`, `Lượt trận 2`, `Lượt trận 3`.
- **Vị trí hiển thị**:
  - Các dropdown được đặt trong một flex-row cùng hàng với ô Tìm kiếm trên màn hình lớn (Desktop).
  - Tự động chuyển thành dạng cột dọc (flex-col) trên màn hình nhỏ (Mobile) để đảm bảo không bị tràn giao diện.
- **Tương tác giữa các tab**:
  - Bộ lọc hiển thị ở cả hai tab: **"Tất cả trận đấu"** (All matches) và **"Vòng bảng"** (Group stage).
  - Khi người dùng ở tab khác như **"Nhánh Knockout"**, **"BXH Thực tế"**, **"Thống kê"**, các bộ lọc này sẽ tự động ẩn đi.
  - Khi người dùng áp dụng bộ lọc nhóm hoặc lượt trận trong khi ở tab "Tất cả trận đấu", các trận đấu knockout (không có thông tin bảng đấu) sẽ tự động bị ẩn để hiển thị đúng kết quả lọc.

## 2. Thiết kế Kỹ thuật & Luồng dữ liệu

### 2.1 Cập nhật Mô hình Dữ liệu (`src/lib/schedule.ts`)
- Bổ sung trường `matchday?: number` vào cấu trúc `ScheduleEntry`.
- Xác định `matchday` dựa trên vị trí (index) của trận đấu trong mảng `matches` của từng bảng đấu tĩnh trong file seed data. Một bảng có 4 đội sẽ có 6 trận đấu vòng bảng, tương ứng:
  - Trận 1 & 2 (index 0, 1): Lượt trận 1.
  - Trận 3 & 4 (index 2, 3): Lượt trận 2.
  - Trận 5 & 6 (index 4, 5): Lượt trận 3.

```typescript
export type ScheduleEntry = {
  // ... các thuộc tính cũ
  groupLetter?: string;
  matchday?: number; // 1 | 2 | 3
};
```

Cập nhật hàm chuyển đổi `groupMatchToEntry` để tiếp nhận chỉ mục trận đấu (`matchIndex`):
```typescript
export function groupMatchToEntry(
  match: GroupMatch,
  groupLetter: string,
  matchResults: Record<string, MatchResult>,
  matchIndex: number
): ScheduleEntry {
  return {
    // ...
    groupLetter,
    matchday: Math.floor(matchIndex / 2) + 1,
  };
}
```

### 2.2 Quản lý Trạng thái & Logic Lọc (`src/components/SchedulePanel.tsx`)
- Khai báo 2 state mới:
  ```typescript
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedMatchday, setSelectedMatchday] = useState<string>("all");
  ```
- Reset các bộ lọc này về `"all"` khi người dùng thay đổi tab chính (hoặc giữ nguyên tùy chọn - tuy nhiên để tránh bối rối cho người dùng, bộ lọc nên được áp dụng chính xác cho danh sách trận đấu đang hiển thị).
- Cập nhật logic trong `useMemo` lọc trận đấu (`filtered`):
  ```typescript
  // Lọc theo bảng đấu
  if (selectedGroup !== "all") {
    list = list.filter((e) => e.kind === "group" && e.groupLetter === selectedGroup);
  }
  // Lọc theo lượt trận
  if (selectedMatchday !== "all") {
    list = list.filter((e) => e.kind === "group" && e.matchday === Number(selectedMatchday));
  }
  ```

### 2.3 Cấu trúc DOM & CSS
Thanh điều khiển mới sẽ kết hợp Tìm kiếm và Dropdowns:
```tsx
<div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
  {/* Search Input */}
  <div className="relative flex-1">
    <input ... />
  </div>

  {/* Group & Matchday Dropdowns */}
  {(filter === "all" || filter === "group") && (
    <div className="flex gap-2">
      <select 
        value={selectedGroup} 
        onChange={(e) => setSelectedGroup(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none"
      >
        <option value="all">Tất cả bảng</option>
        {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map(letter => (
          <option key={letter} value={letter}>Bảng {letter}</option>
        ))}
      </select>

      <select 
        value={selectedMatchday} 
        onChange={(e) => setSelectedMatchday(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none"
      >
        <option value="all">Tất cả lượt</option>
        <option value="1">Lượt trận 1</option>
        <option value="2">Lượt trận 2</option>
        <option value="3">Lượt trận 3</option>
      </select>
    </div>
  )}
</div>
```

## 3. Kế hoạch Kiểm thử (Testing)

### 3.1 Unit Test (`src/lib/__tests__`)
- Viết test kiểm tra xem các trận đấu vòng bảng được map đúng `matchday` dựa trên index (0-1 -> lượt 1, 2-3 -> lượt 2, 4-5 -> lượt 3).
- Đảm bảo các hàm tiện ích lọc không bị lỗi khi dữ liệu bị thiếu hoặc không đúng định dạng.

### 3.2 E2E Test (Playwright)
- Kiểm tra tính tương thích hiển thị của dropdowns khi chuyển đổi giữa các tab.
- Mô phỏng hành động click chọn bảng đấu và lượt trận cụ thể, kiểm tra xem số lượng trận đấu hiển thị trên màn hình có thay đổi tương ứng không.
