<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# WC 2026 Simulator - Dự án Mô phỏng World Cup 2026

Chào mừng các Agent! Đây là dự án ứng dụng mô phỏng và dự đoán kịch bản kết quả của giải vô địch bóng đá thế giới FIFA World Cup 2026.

## 📌 Tổng quan dự án
Ứng dụng cung cấp các tính năng giúp người dùng nhập điểm số trực tiếp các trận đấu, kéo thả để xếp thứ tự các bảng đấu, so sánh các đội xếp thứ 3 có thành tích tốt nhất, đồng bộ hóa kết quả thực tế từ ESPN và tự động sinh nhánh đấu Knockout (vòng loại trực tiếp) dựa trên thuật toán chính thức của FIFA.

## 🛠️ Công nghệ sử dụng (Tech Stack)
- **Framework chính:** Next.js (App Router, React 19).
- **Quản lý trạng thái (State Management):** Zustand (lưu trữ và đồng bộ hóa kịch bản mô phỏng).
- **Styling:** Tailwind CSS v4.
- **Kiểm thử (Testing):**
  - **Unit Test:** Vitest (kiểm thử thuật toán xếp hạng và các component).
  - **E2E Test:** Playwright.

## 📂 Cấu trúc thư mục quan trọng
- `/src/app`: Định nghĩa các route chính và layout toàn cục.
  - `page.tsx`: Cổng vào chính của ứng dụng, hiển thị `<AppShell />`.
  - `globals.css`: File cấu hình CSS và các keyframe animations dùng chung (như hoạt ảnh quả bóng nảy tâng bóng).
- `/src/components`: Chứa các React Component tương tác.
  - `AppShell.tsx`: Trình bao bọc giao diện, quản lý thanh điều hướng, các tab và nút chức năng.
  - `SoccerSkeleton.tsx`: Component skeleton loader dùng chung chỉ hiển thị quả bóng bóng đá nảy.
  - `EspnStandingsBoard.tsx`: Bảng xếp hạng trực tiếp đồng bộ từ ESPN.
  - `TeamStatsBoard.tsx`: Thống kê các chỉ số của từng đội tuyển.
  - `MatchStatsModal.tsx`: Popup chi tiết các chỉ số thống kê của một trận đấu.
  - `GroupCard.tsx`: Thẻ hiển thị bảng đấu vòng bảng hỗ trợ kéo thả.
  - `StandingsDnD.tsx` / `StandingsPreview.tsx`: Hỗ trợ chế độ kéo thả xếp hạng bằng `@dnd-kit`.
  - `KnockoutBracket.tsx` / `BracketTree.tsx`: Giao diện hiển thị nhánh đấu vòng loại trực tiếp.
- `/src/lib`: Logic nghiệp vụ, thuật toán xếp thứ hạng và các hàm tiện ích (`espn-standings.ts`, `compute-standings.ts`, v.v.).
- `/data`: Dữ liệu tĩnh của các đội tuyển, cầu thủ và lịch thi đấu FIFA/ESPN.

## ⚡ Các luồng hoạt động chính của Simulator
1. **Hydration (Tải lại trang):** Khi người dùng F5 tải lại trang, store Zustand sẽ hydrate (đồng bộ lại kịch bản từ localStorage). Trong khi chờ, `AppShell.tsx` sẽ hiển thị tiêu đề và component `SoccerSkeleton` (với hình ảnh trái bóng nảy).
2. **Vòng bảng (Groups Stage):** Người dùng có hai chế độ nhập:
   - Nhập tỷ số các trận đấu để tự động tính điểm.
   - Chế độ kéo thả (Ranks mode) để tự sắp xếp thứ hạng các đội.
3. **So sánh hạng 3 (Third-place Playoff):** Theo thể thức mới, 8 đội đứng thứ 3 có thành tích tốt nhất trong tổng số 12 bảng đấu sẽ giành quyền vào vòng 32 đội. Logic này được xử lý tự động trong `ThirdPlacePanel.tsx`.
4. **Nhánh đấu Knockout (Knockout Bracket):** Nhánh đấu tự động cập nhật dựa trên bảng xếp hạng vòng bảng. Người dùng có thể dự đoán tiếp kết quả các trận đấu knockout cho tới trận chung kết.
5. **Đồng bộ trực tiếp (ESPN Sync):** Người dùng có thể nhấn nút đồng bộ kết quả thật từ ESPN để cập nhật dữ liệu BXH thời gian thực.

## 📋 Hướng dẫn phát triển dành cho Agent
- **Độc lập và Cô lập:** Khi viết các component mới, hãy thiết kế các interface rõ ràng và tránh code trùng lặp. Sử dụng lại `SoccerSkeleton` khi cần màn hình chờ.
- **Styling:** Dùng Tailwind v4. Bất kỳ animation tùy chỉnh nào hãy thêm trực tiếp vào `src/app/globals.css`.
- **Đảm bảo Unit Tests luôn xanh:** Chạy `npm run test` trước và sau khi thực hiện bất kỳ thay đổi nào.
