# Design Spec: Compact Sticky Schedule Header (Option B)

## 1. Goal
Tối ưu hóa không gian hiển thị danh sách trận đấu trên SchedulePanel bằng cách thu hẹp chiều cao sticky header từ ~120px xuống còn ~48px (1 dòng duy nhất), giúp diện tích hiển thị tăng từ 50% lên 80% trên thiết bị di động.

## 2. Architecture & Design

### A. Quy tắc Sticky
- Tiêu đề chính `Lịch thi đấu (104 trận)` sẽ trượt mất khi cuộn trang (không sticky).
- Chỉ có dòng điều hướng tab và bộ lọc/tìm kiếm là sticky ngay dưới navbar chính của AppShell.
- Chiều cao sticky header thu gọn còn 1 dòng (~48px).

### B. Responsive Layouts

#### 1. Trên Desktop (`md` trở lên: >= 768px)
- Dàn trang theo hàng ngang (`flex flex-row items-center justify-between gap-3`).
- **Bên trái:** Tabs lựa chọn bộ lọc chính (Tất cả trận đấu, Vòng bảng, Nhánh Knockout, BXH Thực tế, Thống kê) cuộn ngang.
- **Bên phải:**
  - Ô tìm kiếm rộng `180px` hiển thị tĩnh.
  - Các dropdowns chọn Bảng và lượt trận hiển thị tĩnh ngay cạnh ô tìm kiếm.
  
#### 2. Trên Mobile (`md` trở xuống: < 768px)
- Dàn trang theo hàng ngang: `[Tabs cuộn ngang] [Nút Icon 🔍] [Nút Icon ⚙️]`
- **Trạng thái Tìm kiếm (Search State):**
  - Khai báo state `isSearchExpanded` (boolean).
  - Khi `isSearchExpanded === true`: Hiển thị một overlay full-width đè lên thanh tabs, chứa ô nhập tìm kiếm và nút đóng `❌`.
- **Trạng thái Bộ lọc (Filter State):**
  - Khai báo state `isFiltersExpanded` (boolean).
  - Khi `isFiltersExpanded === true`: Hiển thị một sub-panel nhỏ ngay bên dưới dòng sticky chứa 2 dropdown select (Bảng, Lượt).

## 3. UI/UX & Tailwind Classes
- **Sticky container:** `sticky z-40 -mx-4 px-4 bg-[#0c0f14]/95 backdrop-blur-sm border-b border-zinc-800`
- **Top Offset:** `style={{ top: "var(--navbar-height, 0px)" }}`
- **Sub-panel bộ lọc mobile:** `flex gap-2 w-full pt-2 pb-2`

## 4. Testability (E2E)
Giữ nguyên các `data-testid` hiện có cho:
- Tabs: `data-testid="schedule-filter-*"`
- Search Input: `input` (dùng selector thông thường hoặc text placeholder)
- Dropdowns: `data-testid="schedule-group-filter"` và `data-testid="schedule-matchday-filter"`
- Nhờ vậy, các E2E tests kiểm thử chức năng lọc/tabs sẽ không bị phá vỡ.
