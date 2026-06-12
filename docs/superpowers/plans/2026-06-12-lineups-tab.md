# Kế hoạch Triển khai tính năng Đội hình ra sân (Lineups Tab)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tab "Đội hình" vào MatchStatsModal hiển thị sơ đồ đội hình ra sân 2D trực quan.

**Architecture:** Trích xuất thông tin rosters từ API ESPN, phân nhóm cầu thủ theo vị trí (GK, DF, MF, FW) và render sơ đồ sân bóng dọc 2D với các avatar cầu thủ.

**Tech Stack:** React, Next.js, TypeScript, CSS

---

### Task 1: Cập nhật Type definitions cho rosters

**Files:**
- Modify: [MatchStatsModal.tsx](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/components/MatchStatsModal.tsx)

- [ ] **Step 1: Thêm type cho cấu trúc roster từ ESPN API**
  Thêm các interface sau vào phần định nghĩa type ở đầu file:
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
      abbreviation: string;
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
  ```

- [ ] **Step 2: Cập nhật EspnSummary để chứa rosters**
  Cập nhật type `EspnSummary`:
  ```typescript
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
    rosters?: EspnTeamRoster[];
  };
  ```

- [ ] **Step 3: Chạy TypeScript check**
  Run: `npx tsc --noEmit`
  Expected: Success without errors.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/components/MatchStatsModal.tsx
  git commit -m "feat(lineups): add TypeScript types for ESPN rosters"
  ```

---

### Task 2: Trích xuất và phân nhóm dữ liệu Đội hình xuất phát

**Files:**
- Modify: [MatchStatsModal.tsx](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/components/MatchStatsModal.tsx)

- [ ] **Step 1: Cập nhật hàm useMemo của view để trả về rosters**
  Cập nhật phần `view` useMemo ở khoảng dòng 261-285 để thêm `rosters` vào kết quả:
  ```typescript
  const view = useMemo(() => {
    const competition = data?.header?.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const homeHeader = competitors.find((team) => team.homeAway === "home") ?? competitors[0];
    const awayHeader = competitors.find((team) => team.homeAway === "away") ?? competitors[1];
    const boxscoreTeams = data?.boxscore?.teams ?? [];

    const makeTeam = (header: typeof homeHeader) => {
      if (!header?.id) return null;
      const boxscore = boxscoreTeams.find((team) => team.team.id === header.id);
      return {
        id: header.id,
        name: header.team?.displayName ?? boxscore?.team.displayName ?? "TBD",
        logo: header.team?.logos?.[0]?.href ?? boxscore?.team.logo,
        score: header.score ?? "-",
        statistics: boxscore?.statistics ?? [],
      };
    };

    return {
      competition,
      home: makeTeam(homeHeader),
      away: makeTeam(awayHeader),
      rosters: data?.rosters ?? [],
    };
  }, [data]);
  ```

- [ ] **Step 2: Viết logic lọc và phân nhóm cầu thủ đá chính**
  Viết `lineupData` useMemo ngay bên dưới `timelineEvents` useMemo:
  ```typescript
  const lineupData = useMemo(() => {
    if (!view.rosters || view.rosters.length === 0) return null;

    const parseTeamRoster = (homeAway: "home" | "away") => {
      const teamRoster = view.rosters.find((r) => r.homeAway === homeAway);
      if (!teamRoster) return null;

      const starters = (teamRoster.roster ?? []).filter((p) => p.starter);
      
      const gk = starters.filter((p) => p.position?.abbreviation === "G");
      const df = starters.filter((p) => p.position?.abbreviation === "D");
      const mf = starters.filter((p) => p.position?.abbreviation === "M");
      const fw = starters.filter((p) => p.position?.abbreviation === "F");

      const mapPlayer = (p: EspnRosterItem) => {
        const teamId = teamRoster.team?.id;
        const mainPlayerName = p.athlete?.shortName ?? p.athlete?.displayName ?? "";
        let fallbackImage = "";
        
        if (teamId && mainPlayerName) {
          const localTeamId = Object.keys(ESPN_TEAM_MAP).find(
            (key) => ESPN_TEAM_MAP[key] === teamId
          );
          const localTeam = teamsData.teams.find((t) => t.id === localTeamId);
          const localPicture = findLocalPlayerPicture(localTeam, mainPlayerName);
          if (localPicture) {
            fallbackImage = localPicture;
          }
        }

        return {
          id: p.athlete?.id,
          name: p.athlete?.shortName ?? p.athlete?.displayName ?? "",
          jersey: p.jersey,
          playerImage: p.athlete?.headshot?.href ?? "",
          fallbackImage,
        };
      };

      return {
        gk: gk.map(mapPlayer),
        df: df.map(mapPlayer),
        mf: mf.map(mapPlayer),
        fw: fw.map(mapPlayer),
      };
    };

    return {
      home: parseTeamRoster("home"),
      away: parseTeamRoster("away"),
    };
  }, [view.rosters]);
  ```

- [ ] **Step 3: Chạy TypeScript check**
  Run: `npx tsc --noEmit`
  Expected: Success without errors.

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/components/MatchStatsModal.tsx
  git commit -m "feat(lineups): extract and group starters by position"
  ```

---

### Task 3: Hiển thị Tab "Đội hình" và vẽ 2D Pitch

**Files:**
- Modify: [MatchStatsModal.tsx](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/components/MatchStatsModal.tsx)

- [ ] **Step 1: Cập nhật activeTab state type**
  Cập nhật khai báo state `activeTab` ở dòng 204:
  ```typescript
  const [activeTab, setActiveTab] = useState<"stats" | "timeline" | "lineup">("stats");
  ```

- [ ] **Step 2: Thêm nút Tab "Đội hình" vào giao diện**
  Cập nhật khối chuyển tab ở dòng 517-540 để thêm nút tab "Đội hình":
  ```typescript
  <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
    <button
      type="button"
      onClick={() => setActiveTab("stats")}
      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        activeTab === "stats"
          ? "bg-emerald-500/20 text-emerald-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      Thống kê
    </button>
    <button
      type="button"
      onClick={() => setActiveTab("timeline")}
      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        activeTab === "timeline"
          ? "bg-emerald-500/20 text-emerald-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      Timeline
    </button>
    <button
      type="button"
      onClick={() => setActiveTab("lineup")}
      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
        activeTab === "lineup"
          ? "bg-emerald-500/20 text-emerald-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      Đội hình
    </button>
  </div>
  ```

- [ ] **Step 3: Render giao diện Sân bóng 2D khi tab được kích hoạt**
  Cập nhật phần hiển thị nội dung tab, thêm điều kiện render tab `lineup` ở cuối (trước thẻ đóng của body modal):
  ```typescript
  {activeTab === "lineup" && (
    !lineupData || !lineupData.home || !lineupData.away ? (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Chưa có dữ liệu đội hình cho trận đấu này.
      </div>
    ) : (
      <div className="relative mx-auto max-w-md p-2">
        {/* 2D Pitch Container */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-white/20 bg-emerald-950 p-6 flex flex-col justify-between shadow-inner">
          {/* Pitch lines */}
          <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/20 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
          
          {/* Penalty boxes */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-14 border-2 border-white/20 border-t-0" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 border-2 border-white/20 border-t-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-14 border-2 border-white/20 border-b-0" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-5 border-2 border-white/20 border-b-0" />

          {/* Player positioning helper function */}
          {(() => {
            const renderPlayerNode = (p: any, isHome: boolean) => (
              <div key={p.id} className="flex flex-col items-center text-center w-14 z-10">
                <div className="relative">
                  <PlayerAvatar src={p.playerImage} fallbackSrc={p.fallbackImage} />
                  {!p.playerImage && (
                    <div className={`absolute inset-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/50 ${isHome ? 'bg-blue-600' : 'bg-rose-600'}`}>
                      {p.jersey}
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[9px] font-bold text-white truncate w-full drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">
                  {p.name}
                </span>
              </div>
            );

            return (
              <>
                {/* AWAY TEAM (Top Half) */}
                <div className="flex flex-col justify-between h-[45%]">
                  {/* GK */}
                  <div className="flex justify-center">
                    {lineupData.away.gk.map((p) => renderPlayerNode(p, false))}
                  </div>
                  {/* DF */}
                  <div className="flex justify-around">
                    {lineupData.away.df.map((p) => renderPlayerNode(p, false))}
                  </div>
                  {/* MF */}
                  <div className="flex justify-around px-2">
                    {lineupData.away.mf.map((p) => renderPlayerNode(p, false))}
                  </div>
                  {/* FW */}
                  <div className="flex justify-around px-4">
                    {lineupData.away.fw.map((p) => renderPlayerNode(p, false))}
                  </div>
                </div>

                {/* HOME TEAM (Bottom Half) */}
                <div className="flex flex-col-reverse justify-between h-[45%]">
                  {/* GK */}
                  <div className="flex justify-center">
                    {lineupData.home.gk.map((p) => renderPlayerNode(p, true))}
                  </div>
                  {/* DF */}
                  <div className="flex justify-around">
                    {lineupData.home.df.map((p) => renderPlayerNode(p, true))}
                  </div>
                  {/* MF */}
                  <div className="flex justify-around px-2">
                    {lineupData.home.mf.map((p) => renderPlayerNode(p, true))}
                  </div>
                  {/* FW */}
                  <div className="flex justify-around px-4">
                    {lineupData.home.fw.map((p) => renderPlayerNode(p, true))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )
  )}
  ```

- [ ] **Step 4: Chạy toàn bộ verify**
  Run: `npx tsc --noEmit && npm run test && npm run build`
  Expected: Tất cả vượt qua thành công, không lỗi linter/build.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/components/MatchStatsModal.tsx
  git commit -m "feat(lineups): add 2D football pitch view and tab ui"
  ```
