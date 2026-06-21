# Tài liệu thiết kế: Giao diện thẻ trận đấu nhỏ gọn & Thứ tự hiển thị mới

Tài liệu này đặc tả các thay đổi về mặt giao diện và sắp xếp các trận đấu tại tab "Trực tiếp" trong ứng dụng WC 2026 Simulator.

## 1. Mục tiêu
- Đồng bộ hóa kích thước và tỷ lệ hiển thị của tất cả các thẻ trận đấu (Live, Đã đá, Sắp đá) về cùng một dạng Nhỏ Gọn (Compact).
- Đổi thứ tự hiển thị của các khối danh sách trận đấu tại màn hình chính "Trực tiếp" để nâng cao trải nghiệm người dùng theo thứ tự: Trực tiếp (Live) ➔ Đã đá (Recent/Done) ➔ Sắp đá (Upcoming).

## 2. Chi tiết các thay đổi

### 2.1. Thay đổi thứ tự hiển thị các khối trận đấu (`src/components/LivePanel.tsx`)
Khi người dùng chọn xem tất cả (chế độ mặc định), sắp xếp lại cấu trúc JSX trong `LivePanel.tsx` theo thứ tự sau:
1. Khối các trận đang diễn ra (Live)
2. Khối các trận đã kết thúc (RecentMatchesPanel)
3. Khối các trận sắp diễn ra (Upcoming)

```tsx
// Thứ tự render mới trong LivePanel.tsx:
<div className="space-y-4">
  {/* 1. Live section */}
  {showLive && liveEntries.length > 0 && ( ... )}

  {/* 2. Recent matches / done section */}
  {showDone && (
    <RecentMatchesPanel ... />
  )}

  {/* 3. Upcoming section */}
  {showUpcoming && upcomingEntries.length > 0 && ( ... )}
</div>
```

### 2.2. Điều chỉnh giao diện Thẻ trận đấu đã kết thúc (`src/components/RecentMatchCard.tsx`)
Thu nhỏ thẻ trận đấu đã đá để tối ưu không gian danh sách:
- **Padding ngoài**: Thay đổi từ `p-3 sm:p-4` sang `p-2 sm:p-2.5`.
- **Cờ quốc gia (FlagIcon)**: Đổi giá trị prop `size` từ `"md"` sang `"sm"`.
- **Tỉ số**: Đổi lớp Tailwind từ `text-2xl sm:text-3xl lg:text-4xl` sang `text-lg sm:text-xl`.
- **Thông tin trạng thái ("FT" / "Đã kết thúc")**: Giảm cỡ chữ từ `text-[10px] sm:mt-1` xuống `text-[9px]`.

### 2.3. Điều chỉnh giao diện Thẻ trận đấu trực tiếp (`src/components/LiveMatchCard.tsx`)
Đồng bộ thẻ Live theo cùng tỷ lệ nhỏ gọn của thẻ đã kết thúc:
- **Padding ngoài**: Thay đổi từ `p-3 sm:p-4` sang `p-2 sm:p-2.5`.
- **Cờ quốc gia (FlagIcon)**: Đổi giá trị prop `size` từ `"md"` sang `"sm"`.
- **Tỉ số**: Đổi lớp Tailwind từ `text-2xl sm:text-3xl lg:text-4xl` sang `text-lg sm:text-xl`.
- **Thông tin Live & Thời gian**: Thay đổi từ `text-[10px] sm:text-[11px]` sang `text-[9px] sm:text-[10px]`.

### 2.4. Điều chỉnh giao diện Thẻ trận đấu sắp diễn ra (`src/components/UpcomingMatchCard.tsx`)
Đồng bộ nhẹ để chiều cao và tỷ lệ căn lề khớp với các thẻ trên:
- **Padding ngoài**: Thay đổi từ `px-3 sm:px-4 py-3` sang `px-3 sm:px-4 py-2 sm:py-2.5`.
- **Giờ thi đấu**: Thay đổi cỡ chữ từ `text-sm sm:text-base` sang `text-xs sm:text-sm`.
- **Sân vận động**: Thay đổi cỡ chữ từ `text-[10px] sm:text-[11px]` sang `text-[9px] sm:text-[10px]`.

## 3. Tiêu chí nghiệm thu (Acceptance Criteria)
1. Khi mở tab "Trực tiếp", nếu có đầy đủ các trận Live, Đã đá và Sắp đá, thứ tự hiển thị từ trên xuống dưới bắt buộc phải là: Live ➔ Đã đá ➔ Sắp đá.
2. Cờ của tất cả các đội bóng ở cả 3 loại thẻ đều có kích cỡ đồng bộ (`w-7 h-5`).
3. Chiều cao hiển thị của các thẻ tương đồng nhau, không còn hiện tượng thẻ đã đá quá lớn so với thẻ sắp đá hay thẻ live.
4. Chức năng xem chi tiết trận đấu (click vào thẻ) vẫn hoạt động bình thường trên tất cả các thẻ.
