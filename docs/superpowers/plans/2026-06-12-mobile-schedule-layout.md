# Mobile Schedule Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the mobile layout in the schedule panel to display matchups and scores without requiring horizontal scrolling.

**Architecture:** We will keep the desktop table layout (`hidden md:block`) but wrap it in an `md:block` display class. For mobile and tablet devices below 768px, we will build a card-based matches list (`block md:hidden`). Each card will present the match details, teams (stacked vertically with flags and names), scores/status, and actions (favorite star, head-to-head history, and stats details) in a compact, readable viewport.

**Tech Stack:** React, Next.js, Tailwind CSS, Playwright.

---

### Task 1: Create Mobile Card Component and Render Logic

**Files:**
- Modify: [SchedulePanel.tsx](file:///c:/Users/juven/Desktop/road%20to%20wc/wc2026-app/src/components/SchedulePanel.tsx)

- [ ] **Step 1: Define the `ScheduleMobileCard` component in `SchedulePanel.tsx`**

Write a responsive card component for mobile matching the design specifications. Inside `src/components/SchedulePanel.tsx`, define:
```tsx
function ScheduleMobileCard({
  entry,
  espnMatches,
  onOpenMatch,
  onOpenH2H,
}: {
  entry: ScheduleEntry;
  espnMatches: EspnScoreboardMatch[];
  onOpenMatch: (gameId: string, matchDate?: string) => void;
  onOpenH2H: (home: { id: string; name: string; flagUrl: string }, away: { id: string; name: string; flagUrl: string }) => void;
}) {
  const winnerId = entry.kind === "knockout" ? entry.winner?.id : undefined;
  const toggleFavoriteMatch = useSimulation((s) => s.toggleFavoriteMatch);
  const favoriteMatches = useSimulation((s) => s.favoriteMatches);
  const isFavMatch = favoriteMatches.includes(entry.id);
  const favoriteTeams = useSimulation((s) => s.favoriteTeams);

  let timeStr = "--:--";
  if (entry.date) {
    const d = new Date(entry.date);
    if (!Number.isNaN(d.getTime())) {
      timeStr = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
    }
  }

  const matchedEspn = findEspnMatch(entry, espnMatches, ESPN_TO_LOCAL);
  let espnMatch = matchedEspn;
  if (
    matchedEspn &&
    entry.away?.id &&
    matchedEspn.homeId &&
    ESPN_TO_LOCAL[matchedEspn.homeId] === entry.away.id
  ) {
    espnMatch = {
      ...matchedEspn,
      homeScore: matchedEspn.awayScore,
      awayScore: matchedEspn.homeScore,
    };
  }

  const isHomeWinner = entry.home && winnerId === entry.home.id;
  const isAwayWinner = entry.away && winnerId === entry.away.id;
  const isHomeLoser = entry.home && winnerId && winnerId !== entry.home.id;
  const isAwayLoser = entry.away && winnerId && winnerId !== entry.away.id;

  const homeTone = isHomeWinner ? "text-amber-300 font-bold" : isHomeLoser ? "text-zinc-500" : "text-zinc-100";
  const awayTone = isAwayWinner ? "text-amber-300 font-bold" : isAwayLoser ? "text-zinc-500" : "text-zinc-100";

  const getMobileScore = () => {
    if (espnMatch && hasEspnMatchScore(espnMatch)) {
      return {
        home: espnMatch.homeScore,
        away: espnMatch.awayScore,
        isLive: isEspnMatchLive(espnMatch),
        liveClock: getEspnLiveClock(espnMatch),
        isHalftime: isEspnMatchHalftime(espnMatch),
        detail: espnMatch.shortDetail,
      };
    }
    if (entry.kind === "group" && isPlayedResult(entry.result)) {
      return { home: entry.result.home, away: entry.result.away };
    }
    return null;
  };

  const scores = getMobileScore();

  return (
    <div
      data-testid={`schedule-match-${entry.matchNumber}`}
      className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 space-y-3 hover:bg-zinc-900/20 transition-colors"
    >
      {/* Top row: Match info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-semibold">Trận {entry.matchNumber}</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono">{timeStr}</span>
          </span>
        </div>
        <div className="max-w-[150px] truncate" title={entry.stageLabel}>
          {entry.stageLabel}
        </div>
      </div>

      {/* Middle: Teams and Score */}
      <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
        {/* Teams vertical stack */}
        <div className="space-y-2">
          {/* Home team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {entry.home ? (
                <>
                  <FlagIcon code={entry.home.code} size="sm" title={entry.home.name} />
                  <span className={`text-sm truncate ${homeTone}`}>{entry.home.name}</span>
                  {favoriteTeams.includes(entry.home.id) && <span className="text-[10px]">⭐</span>}
                </>
              ) : (
                <span className="text-sm text-zinc-500 italic">{entry.homePlaceholder}</span>
              )}
            </div>
            {scores && (
              <span className="font-mono text-sm font-bold text-zinc-200">{scores.home}</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {entry.away ? (
                <>
                  <FlagIcon code={entry.away.code} size="sm" title={entry.away.name} />
                  <span className={`text-sm truncate ${awayTone}`}>{entry.away.name}</span>
                  {favoriteTeams.includes(entry.away.id) && <span className="text-[10px]">⭐</span>}
                </>
              ) : (
                <span className="text-sm text-zinc-500 italic">{entry.awayPlaceholder}</span>
              )}
            </div>
            {scores && (
              <span className="font-mono text-sm font-bold text-zinc-200">{scores.away}</span>
            )}
          </div>
        </div>

        {/* Live score indicator / H2H button */}
        <div className="flex flex-col items-end justify-center min-w-[70px] border-l border-zinc-900 pl-3">
          {scores?.isLive ? (
            <span className="text-[9px] font-bold text-rose-500 animate-pulse whitespace-nowrap">
              LIVE {scores.liveClock}
            </span>
          ) : scores?.isHalftime ? (
            <span className="text-[9px] font-bold text-amber-400 whitespace-nowrap">
              HT
            </span>
          ) : scores?.detail ? (
            <span className="text-[9px] font-bold text-zinc-500 whitespace-nowrap">{scores.detail}</span>
          ) : !scores ? (
            <span className="text-xs font-semibold text-zinc-600 uppercase">VS</span>
          ) : (
            entry.kind === "knockout" && entry.winner && (
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                ✓ {entry.winner.code}
              </span>
            )
          )}

          {matchedEspn && (
            <button
              onClick={() => onOpenMatch(matchedEspn.id, entry.date)}
              className="mt-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded"
            >
              Chi tiết
            </button>
          )}
        </div>
      </div>

      {/* Bottom: Stadium + Actions */}
      <div className="flex items-center justify-between text-[11px] text-zinc-600 pt-1.5 border-t border-zinc-900/50">
        <div className="truncate max-w-[70%]">
          {entry.stadium || entry.city ? (
            <span>📍 {entry.stadium} {entry.city ? `- ${entry.city}` : ""}</span>
          ) : (
            <span className="italic">Chưa xác định địa điểm</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {entry.home && entry.away && (
            <button
              onClick={() => onOpenH2H(entry.home!, entry.away!)}
              className="text-zinc-500 hover:text-emerald-400 transition-colors"
              title="Lịch sử đối đầu"
              aria-label={`Lịch sử đối đầu ${entry.home.name} vs ${entry.away.name}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => toggleFavoriteMatch(entry.id)}
            className={`transition-colors ${isFavMatch ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title={isFavMatch ? "Bỏ yêu thích" : "Yêu thích trận"}
          >
            {isFavMatch ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-1.81.588l1.15 5.394a.562.562 0 01-.84.61l-4.717-2.784a.563.563 0 00-.57 0l-4.717 2.784a.562.562 0 01-.84-.61l1.15-5.394a.563.563 0 00-1.81-.588l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-1.81.588l1.15 5.394a.562.562 0 01-.84.61l-4.717-2.784a.563.563 0 00-.57 0l-4.717 2.784a.562.562 0 01-.84-.61l1.15-5.394a.563.563 0 00-1.81-.588l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update the render section of `SchedulePanel.tsx`**
In the JSX returned by `SchedulePanel`, modify the table-container class to hide on mobile screens (`hidden md:block`), and add the mobile view (`block md:hidden`) alongside it:
```tsx
      ) : (
        <div className="space-y-6">
          {/* Mobile view (< 768px) */}
          <div className="block md:hidden space-y-6">
            {dateGroups.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center bg-[#6a041f]/20 text-[#ff4d6d] font-bold px-3 py-1 rounded-full text-xs">
                    {group.dateLabel}
                  </div>
                  <div className="h-px flex-1 bg-zinc-800/50" />
                </div>
                {/* Matches list */}
                <div className="space-y-3">
                  {group.entries.map((entry) => (
                    <ScheduleMobileCard
                      key={entry.id}
                      entry={entry}
                      espnMatches={espnMatches}
                      onOpenMatch={(gameId, matchDate) => { setSelectedGameId(gameId); setSelectedMatchDate(matchDate ?? null); }}
                      onOpenH2H={(h, a) => setH2hTeams({ home: h, away: a })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view (>= 768px) */}
          <div className="hidden md:block max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-4 py-3 text-center whitespace-nowrap">TRẬN</th>
                  <th className="px-4 py-3 text-center">GIỜ</th>
                  <th className="px-4 py-3">VÒNG ĐẤU</th>
                  <th className="px-4 py-3 text-right">ĐỘI 1</th>
                  <th className="px-2 py-3 text-center">TỈ SỐ</th>
                  <th className="px-4 py-3">ĐỘI 2</th>
                  <th className="px-4 py-3 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {dateGroups.map((group) => (
                  <React.Fragment key={group.dateKey}>
                    <tr className="bg-zinc-900/30">
                      <td colSpan={7} className="px-4 py-2">
                        <div className="inline-flex items-center justify-center bg-[#6a041f]/20 text-[#ff4d6d] font-bold px-3 py-1 rounded-full text-sm">
                          {group.dateLabel}
                        </div>
                      </td>
                    </tr>
                    {group.entries.map((entry) => (
                      <ScheduleTableRow
                        key={entry.id}
                        entry={entry}
                        espnMatches={espnMatches}
                        onOpenMatch={(gameId, matchDate) => { setSelectedGameId(gameId); setSelectedMatchDate(matchDate ?? null); }}
                        onOpenH2H={(h, a) => setH2hTeams({ home: h, away: a })}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Run Vitest to check for compilation issues**
Run: `rtk npm run test`
Expected: Unit tests pass.

- [ ] **Step 4: Run Playwright responsive E2E tests to verify layout correctness**
Run: `rtk npx playwright test e2e/responsive.spec.ts`
Expected: Pass.

- [ ] **Step 5: Commit changes**
Run: `rtk git commit -m "feat(schedule): add mobile card-based layout for schedule list"`
