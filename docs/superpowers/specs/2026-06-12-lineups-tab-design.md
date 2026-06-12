# Thiết kế tính năng Đội hình ra sân (Lineups Tab)

Thêm tab "Đội hình" vào cửa sổ chi tiết trận đấu (`MatchStatsModal`) để hiển thị sơ đồ đội hình ra sân trực quan của cả hai đội dưới dạng sân cỏ 2D.

## Yêu cầu người dùng & Thiết kế giao diện
- Thêm tab thứ 3 tên là **"Đội hình"** bên cạnh "Thống kê" và "Timeline".
- Hiển thị danh sách 11 cầu thủ đá chính dưới dạng sơ đồ sân bóng dọc 2D.
- Đội khách (Away Team) nằm ở nửa sân phía trên, đội nhà (Home Team) nằm ở nửa sân phía dưới.
- Chỉ hiển thị cầu thủ đá chính (Starting XI), không hiển thị cầu thủ dự bị và huấn luyện viên trưởng (theo yêu cầu của người dùng).
- Cầu thủ được biểu diễn bằng một hình tròn chứa số áo (hoặc ảnh chân dung nếu có) kèm tên ngắn bên dưới.
- Màu sắc và đường nét sân bóng mang phong cách tối giản, hiện đại, hòa hợp với giao diện tối của ứng dụng.

## Nguồn dữ liệu & Cấu trúc Type
Dữ liệu đội hình được lấy từ thuộc tính `rosters` nằm trong dữ liệu trả về từ API ESPN hiện tại (`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${gameId}`).

Cần cập nhật các định nghĩa TypeScript trong `MatchStatsModal.tsx`:
```typescript
interface EspnAthlete {
  id: string;
  displayName: string;
  shortName?: string;
  headshot?: {
    href: string;
  };
}

interface EspnRosterItem {
  starter: boolean;
  jersey: string;
  position: {
    abbreviation: string; // 'G' | 'D' | 'M' | 'F'
    displayName: string;
  };
  athlete: EspnAthlete;
}

interface EspnTeamRoster {
  homeAway: "home" | "away";
  team: {
    id: string;
  };
  roster: EspnRosterItem[];
}

// Cập nhật EspnSummary
type EspnSummary = {
  header?: {
    season?: { name?: string };
    competitions?: Array<{
      date?: string;
      venue?: { fullName?: string; address?: { city?: string } };
      status?: { type?: { shortDetail?: string; description?: string } };
      competitors?: Array<{
        id?: string;
        homeAway?: "home" | "away";
        score?: string;
        team?: {
          id?: string;
          displayName?: string;
          logos?: Array<{ href?: string }>;
        };
      }>;
      details?: EspnDetail[];
    }>;
  };
  boxscore?: { teams?: EspnBoxscoreTeam[] };
  keyEvents?: EspnDetail[];
  rosters?: EspnTeamRoster[]; // Thêm trường này
};
```

## Giải thuật sắp xếp vị trí trên sân
Để vẽ sơ đồ 2D đơn giản và chính xác, các cầu thủ đá chính (`starter === true`) của mỗi đội sẽ được phân loại dựa trên vị trí viết tắt (`position.abbreviation` hoặc `position.name`):
- **G (Goalkeeper)**: Thủ môn
- **D (Defender)**: Hậu vệ
- **M (Midfielder)**: Tiền vệ
- **F (Forward / Striker)**: Tiền đạo

Mỗi nhóm vị trí sẽ được hiển thị trên một hàng ngang. Khoảng cách giữa các cầu thủ trên cùng một hàng được phân bổ đều:
1. **Hàng Thủ môn (Goalkeeper)**: 1 cầu thủ (ở giữa).
2. **Hàng Hậu vệ (Defenders)**: các cầu thủ DF chia đều chiều ngang.
3. **Hàng Tiền vệ (Midfielders)**: các cầu thủ MF chia đều chiều ngang.
4. **Hàng Tiền đạo (Forwards)**: các cầu thủ FW chia đều chiều ngang.

Nửa sân phía trên (Đội khách) xếp từ trên xuống dưới: GK -> DF -> MF -> FW.
Nửa sân phía dưới (Đội nhà) xếp từ dưới lên trên: GK -> DF -> MF -> FW.

## Thiết kế Component & Styling
- Sử dụng CSS trong component để vẽ sân cỏ: màu nền xanh đậm (`#14532d` hoặc `#1b4332`), kẻ các đường biên, vòng cấm địa và vòng tròn giữa sân bằng đường viền mờ trắng.
- Mỗi cầu thủ là một phần tử có:
  - Vòng tròn hiển thị ảnh chân dung của cầu thủ (`athlete.headshot.href`). Nếu không có ảnh hoặc ảnh lỗi, hiển thị số áo trên nền màu của đội (đỏ/xanh) hoặc màu trung tính.
  - Tên hiển thị dạng rút gọn (`athlete.shortName || athlete.displayName`).
  - Sử dụng helper `findLocalPlayerPicture` đã có trong component để làm ảnh fallback nếu không có ảnh từ ESPN.

## Kế hoạch kiểm thử & Xác minh
- **Kiểm thử tự động**:
  - Chạy `npm run test` để đảm bảo không có regressions.
- **Kiểm thử thủ công**:
  - Mở chi tiết một trận đấu đã hoặc đang diễn ra để xác minh dữ liệu Đội hình được tải và vẽ chính xác.
  - Đảm bảo giao diện responsive trên mobile và desktop.
