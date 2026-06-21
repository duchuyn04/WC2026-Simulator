# Giao diện thẻ trận đấu nhỏ gọn & Thứ tự hiển thị mới Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thu nhỏ kích thước toàn bộ các thẻ trận đấu (Live, Đã đá, Sắp đá) về chung định dạng Nhỏ Gọn (Compact) và đổi thứ tự hiển thị của các khối trận đấu tại tab Trực tiếp theo thứ tự: Trực tiếp (Live) ➔ Đã đá (Recent/Done) ➔ Sắp đá (Upcoming).

**Architecture:** Căn chỉnh CSS classes Tailwind trong các component `LiveMatchCard.tsx`, `RecentMatchCard.tsx`, `UpcomingMatchCard.tsx` để đồng bộ kích thước cờ (`w-7 h-5`), padding và kích thước chữ. Sắp xếp lại thứ tự render các khối trong component `LivePanel.tsx`.

**Tech Stack:** React, Next.js, Tailwind CSS, Vitest

---

### Task 1: Thay đổi thứ tự hiển thị các khối trận đấu

**Files:**
- Modify: `src/components/LivePanel.tsx:218-308`

- [ ] **Step 1: Thay đổi thứ tự render trong LivePanel.tsx**
  
  Di chuyển Recent Matches (Done section) xuống bên dưới Live Section.
  
  Thay đổi trong file `src/components/LivePanel.tsx`:
  ```tsx
  // Tìm khối jsx hiển thị các phần tử:
  <div className="space-y-4">
    {/* Recent matches / done section */}
    {showDone && (
      <RecentMatchesPanel
        espnMatches={espnMatches}
        mode={filterMode === "done" ? "all-done" : "recent-5"}
        showSyncAll
        onOpenDetail={(entry, gameId, matchDate) => {
          setSelectedEntry(entry);
          setSelectedGameId(gameId);
          setSelectedMatchDate(matchDate);
        }}
      />
    )}

    {/* Live section */}
    {showLive && liveEntries.length > 0 && (
      ...
    )}

    {/* Upcoming section */}
    {showUpcoming && upcomingEntries.length > 0 && (
      ...
    )}
  </div>
  ```
  
  Thay đổi thành:
  ```tsx
  <div className="space-y-4">
    {/* Live section */}
    {showLive && liveEntries.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
            <span className="animate-pulse">🔴</span> ĐANG DIỄN RA
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <div className="space-y-3">
          {liveEntries.map((entry) => {
            const espnMatch = findEspnMatch(
              entry,
              espnMatches,
              ESPN_TO_LOCAL,
            );
            if (!espnMatch) return null;
            return (
              <LiveMatchCard
                key={entry.id}
                entry={entry}
                espnMatch={espnMatch}
                homeName={entry.home?.name ?? entry.homePlaceholder}
                awayName={entry.away?.name ?? entry.awayPlaceholder}
                homeCode={entry.home?.code ?? ""}
                awayCode={entry.away?.code ?? ""}
                onOpenDetail={(entry, gameId, matchDate) => {
                  setSelectedEntry(entry);
                  setSelectedGameId(gameId);
                  setSelectedMatchDate(matchDate);
                }}
              />
            );
          })}
        </div>
      </div>
    )}

    {/* Recent matches / done section */}
    {showDone && (
      <RecentMatchesPanel
        espnMatches={espnMatches}
        mode={filterMode === "done" ? "all-done" : "recent-5"}
        showSyncAll
        onOpenDetail={(entry, gameId, matchDate) => {
          setSelectedEntry(entry);
          setSelectedGameId(gameId);
          setSelectedMatchDate(matchDate);
        }}
      />
    )}

    {/* Upcoming section */}
    {showUpcoming && upcomingEntries.length > 0 && (
      <div>
        {/* Group by date */}
        {dateGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-amber-400">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-zinc-800/50" />
            </div>
            <div className="space-y-2">
              {group.entries.map((entry) => {
                const espnMatch = findEspnMatch(
                  entry,
                  espnMatches,
                  ESPN_TO_LOCAL,
                );
                return (
                  <UpcomingMatchCard
                    key={entry.id}
                    entry={entry}
                    gameId={espnMatch?.id}
                    onOpenDetail={(entry, gameId, matchDate) => {
                      setSelectedEntry(entry);
                      setSelectedGameId(gameId);
                      setSelectedMatchDate(matchDate);
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  ```

- [ ] **Step 2: Chạy kiểm thử để xác nhận code biên dịch tốt**
  
  Run: `npm run test`
  Expected: PASS tất cả unit test liên quan.

- [ ] **Step 3: Commit thay đổi**
  
  ```bash
  git add src/components/LivePanel.tsx
  git commit -m "feat: reorder match sections to Live -> Done -> Upcoming"
  ```

---

### Task 2: Thu nhỏ thẻ trận đấu đã kết thúc (RecentMatchCard)

**Files:**
- Modify: `src/components/RecentMatchCard.tsx:30-64`

- [ ] **Step 1: Cập nhật CSS classes của RecentMatchCard để làm gọn**
  
  Cập nhật padding, kích thước FlagIcon, cỡ chữ tỉ số và chữ trạng thái.
  
  Thay thế đoạn JSX cũ trong `src/components/RecentMatchCard.tsx`:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 transition-colors sm:p-4 ${
        handleClick
          ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <span className="truncate text-right text-xs font-semibold leading-tight sm:text-sm">
            {homeName}
          </span>
          <FlagIcon code={homeCode} size="md" title={homeName} />
        </div>

        <div className="flex-shrink-0 px-1 text-center sm:px-2">
          <div className="text-2xl font-black tracking-wider text-emerald-400 tabular-nums sm:text-3xl lg:text-4xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:mt-1">
            {espnMatch.shortDetail || "Đã kết thúc"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <FlagIcon code={awayCode} size="md" title={awayName} />
          <span className="truncate text-left text-xs font-semibold leading-tight sm:text-sm">
            {awayName}
          </span>
        </div>
      </div>
    </div>
  );
  ```
  
  Bằng đoạn JSX mới nhỏ gọn:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 transition-colors sm:p-2.5 ${
        handleClick
          ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-xs font-semibold text-white">
            {homeName}
          </span>
          <FlagIcon code={homeCode} size="sm" title={homeName} />
        </div>

        <div className="flex-shrink-0 px-1 text-center min-w-[70px]">
          <div className="text-lg font-black tracking-wider text-emerald-400 tabular-nums sm:text-xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            {espnMatch.shortDetail || "FT"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FlagIcon code={awayCode} size="sm" title={awayName} />
          <span className="truncate text-left text-xs font-semibold text-white">
            {awayName}
          </span>
        </div>
      </div>
    </div>
  );
  ```

- [ ] **Step 2: Chạy kiểm thử cho RecentMatchesPanel**
  
  Run: `npx vitest run src/components/__tests__/RecentMatchesPanel.test.tsx`
  Expected: PASS

- [ ] **Step 3: Commit thay đổi**
  
  ```bash
  git add src/components/RecentMatchCard.tsx
  git commit -m "style: shrink RecentMatchCard size to compact layout"
  ```

---

### Task 3: Đồng bộ thu nhỏ thẻ trận đấu trực tiếp (LiveMatchCard)

**Files:**
- Modify: `src/components/LiveMatchCard.tsx:22-59`

- [ ] **Step 1: Cập nhật CSS classes của LiveMatchCard**
  
  Cập nhật padding, cờ, tỉ số và chữ live.
  
  Thay thế đoạn JSX cũ trong `src/components/LiveMatchCard.tsx`:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-950/80 border border-zinc-800 border-l-2 border-l-red-500/60 rounded-xl p-3 sm:p-4 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Home team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 justify-end">
          <span className="font-semibold text-xs sm:text-sm truncate text-right leading-tight">{homeName}</span>
          <FlagIcon code={homeCode} size="md" title={homeName} />
        </div>

        {/* Score + live clock */}
        <div className="flex-shrink-0 text-center px-1 sm:px-2">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 tracking-wider tabular-nums">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5 sm:mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-red-400 uppercase tracking-wide">
              Live · {liveClock}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
          <FlagIcon code={awayCode} size="md" title={awayName} />
          <span className="font-semibold text-xs sm:text-sm truncate text-left leading-tight">{awayName}</span>
        </div>
      </div>
    </div>
  );
  ```

  Thay bằng:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-950/80 border border-zinc-800 border-l-2 border-l-red-500/60 rounded-xl p-2 sm:p-2.5 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 justify-end">
          <span className="font-semibold text-xs truncate text-right text-white">{homeName}</span>
          <FlagIcon code={homeCode} size="sm" title={homeName} />
        </div>

        {/* Score + live clock */}
        <div className="flex-shrink-0 text-center px-1 min-w-[70px]">
          <div className="text-lg font-black text-rose-500 tracking-wider tabular-nums sm:text-xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[9px] font-semibold text-rose-400 uppercase tracking-wide">
              Live · {liveClock}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <FlagIcon code={awayCode} size="sm" title={awayName} />
          <span className="font-semibold text-xs truncate text-left text-white">{awayName}</span>
        </div>
      </div>
    </div>
  );
  ```

- [ ] **Step 2: Chạy kiểm thử toàn bộ hệ thống**
  
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 3: Commit thay đổi**
  
  ```bash
  git add src/components/LiveMatchCard.tsx
  git commit -m "style: shrink LiveMatchCard size to match compact layout"
  ```

---

### Task 4: Đồng bộ thu nhỏ thẻ trận đấu sắp diễn ra (UpcomingMatchCard)

**Files:**
- Modify: `src/components/UpcomingMatchCard.tsx:43-98`

- [ ] **Step 1: Cập nhật CSS classes của UpcomingMatchCard**
  
  Cập nhật padding, cờ, kích cỡ hiển thị thời gian và sân vận động.
  
  Thay thế đoạn JSX cũ trong `src/components/UpcomingMatchCard.tsx`:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/70 active:scale-[0.99]" : "hover:border-zinc-700 hover:bg-zinc-900/70"
      }`}
    >
      {/* Home side */}
      {entry.home ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="font-semibold text-xs sm:text-sm truncate">{entry.home.name}</span>
          <Link
            href={`/teams/${getTeamSlug(entry.home.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.home.code} size="sm" title={entry.home.name} />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-xs sm:text-sm text-zinc-500">{entry.homePlaceholder}</span>
        </div>
      )}

      {/* Center: time + stadium */}
      <div className="flex-shrink-0 text-center min-w-[72px] sm:min-w-[88px]">
        <div className="text-sm sm:text-base font-mono font-semibold text-amber-400 tabular-nums">
          {timeStr}
        </div>
        {stadiumStr && (
          <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate max-w-[96px] sm:max-w-[120px] mt-0.5">
            {stadiumStr}
          </div>
        )}
      </div>

      {/* Away side */}
      {entry.away ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href={`/teams/${getTeamSlug(entry.away.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.away.code} size="sm" title={entry.away.name} />
          </Link>
          <span className="font-semibold text-xs sm:text-sm truncate">{entry.away.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs sm:text-sm text-zinc-500">{entry.awayPlaceholder}</span>
        </div>
      )}
    </div>
  );
  ```

  Thay bằng:
  ```tsx
  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-3 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/70 active:scale-[0.99]" : "hover:border-zinc-700 hover:bg-zinc-900/70"
      }`}
    >
      {/* Home side */}
      {entry.home ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="font-semibold text-xs truncate text-white">{entry.home.name}</span>
          <Link
            href={`/teams/${getTeamSlug(entry.home.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.home.code} size="sm" title={entry.home.name} />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-xs text-zinc-500">{entry.homePlaceholder}</span>
        </div>
      )}

      {/* Center: time + stadium */}
      <div className="flex-shrink-0 text-center min-w-[70px]">
        <div className="text-xs sm:text-sm font-mono font-semibold text-amber-400 bg-amber-950/30 border border-amber-500/10 py-0.5 px-1.5 rounded tabular-nums">
          {timeStr}
        </div>
        {stadiumStr && (
          <div className="text-[9px] sm:text-[10px] text-zinc-500 truncate max-w-[96px] sm:max-w-[120px] mt-0.5">
            {stadiumStr}
          </div>
        )}
      </div>

      {/* Away side */}
      {entry.away ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href={`/teams/${getTeamSlug(entry.away.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.away.code} size="sm" title={entry.away.name} />
          </Link>
          <span className="font-semibold text-xs truncate text-white">{entry.away.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-zinc-500">{entry.awayPlaceholder}</span>
        </div>
      )}
    </div>
  );
  ```

- [ ] **Step 2: Chạy kiểm thử toàn bộ hệ thống**
  
  Run: `npm run test`
  Expected: PASS

- [ ] **Step 3: Commit thay đổi**
  
  ```bash
  git add src/components/UpcomingMatchCard.tsx
  git commit -m "style: shrink UpcomingMatchCard size to match compact layout"
  ```
