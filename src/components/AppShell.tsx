"use client";

import { useRef, useEffect, useMemo } from "react";
import { useSimulation } from "@/lib/store";
import Link from "next/link";
import { useGroupStandings, useStoreHydrated } from "@/lib/hooks";
import { usePersistedScroll } from "@/lib/use-persisted-scroll";
import { seed } from "@/lib/data";
import { GroupCard } from "./GroupCard";
import { GroupInputModeToggle } from "./GroupInputModeToggle";
import { ThirdPlacePanel } from "./ThirdPlacePanel";
import { KnockoutBracket } from "./KnockoutBracket";
import { SchedulePanel } from "./SchedulePanel";
import { getFifaRankingsMeta } from "@/lib/fifa/rankings";
import type { TabId } from "@/lib/tabs";
import { SyncLiveResultsButton } from "./SyncLiveResultsButton";
import SoccerSkeleton from "./SoccerSkeleton";
import { useLiveSync } from "../lib/use-live-sync";
import { LivePanel } from "./LivePanel";
import { useEspnLiveScores } from "@/lib/use-espn-live-scores";

export function AppShell() {
  const hydrated = useStoreHydrated();
  const { isSyncing } = useLiveSync();
  const activeTab = useSimulation((s) => s.activeTab);
  usePersistedScroll(activeTab);
  const setActiveTab = useSimulation((s) => s.setActiveTab);
  const knockoutSyncNotice = useSimulation((s) => s.knockoutSyncNotice);
  const { matches: espnMatches } = useEspnLiveScores();
  const standings = useGroupStandings();
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const resetAll = useSimulation((s) => s.resetAll);
  const favoriteMatches = useSimulation((s) => s.favoriteMatches);
  const favoriteTeams = useSimulation((s) => s.favoriteTeams);

  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(
        "--navbar-height",
        `${header.offsetHeight}px`,
      );
    });
    observer.observe(header);
    return () => observer.disconnect();
  }, [hydrated]);

  const SIMULATOR_TABS: { id: TabId; label: string }[] = [
    { id: "groups", label: "Vòng bảng" },
    { id: "third", label: "Hạng 3" },
    { id: "knockout", label: "Knockout" },
  ];

  const SCHEDULE_TABS = useMemo(
    () => [
      { id: "schedule" as TabId, label: "Tất cả lịch thi đấu" },
      { id: "fav-matches" as TabId, label: `Trận yêu thích (${favoriteMatches.length})` },
      { id: "fav-teams" as TabId, label: `Đội yêu thích (${favoriteTeams.length})` },
    ],
    [favoriteMatches.length, favoriteTeams.length],
  );

  const isSimulatorMode =
    activeTab === "groups" || activeTab === "third" || activeTab === "knockout";
  const currentTabs =
    activeTab === "live"
      ? []
      : isSimulatorMode
        ? SIMULATOR_TABS
        : SCHEDULE_TABS;

  const standingMap = useMemo(
    () => new Map(standings.map((s) => [s.letter, s])),
    [standings],
  );
  const fifaRankMeta = useMemo(() => getFifaRankingsMeta(), []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0c0f14] text-zinc-100 flex flex-col">
        <header className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur py-4">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-amber-500 font-semibold">
              FIFA World Cup
            </p>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              WC 2026 Simulator
            </h1>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          <SoccerSkeleton variant="standings" />
        </main>
      </div>
    );
  }

  return (
    <div
      className={[
        "flex flex-col bg-[#0c0f14] text-zinc-100",
        activeTab === "knockout" ? "h-screen overflow-hidden" : "min-h-screen",
      ].join(" ")}
    >
      <header
        ref={headerRef}
        className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur"
      >
        <div
          className={`max-w-7xl mx-auto px-4 ${activeTab === "knockout" ? "py-2" : "py-3 sm:py-4"}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-amber-500 font-semibold">
                FIFA World Cup
              </p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  WC 2026 Simulator
                </h1>
                {isSyncing && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-1 align-middle self-center animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Đang cập nhật...</span>
                  </div>
                )}
              </div>
              {activeTab !== "knockout" && (
                <p className="hidden sm:block text-sm text-zinc-500 mt-0.5">
                  {activeTab === "live"
                    ? "Kết quả trực tiếp · Tỉ số các trận đang diễn ra"
                    : activeTab === "groups" && groupInputMode === "ranks"
                      ? "Kéo thả thứ hạng · Xếp hạng 3 · Knockout"
                      : isSimulatorMode
                        ? "Nhập tỉ số · Kéo thả thứ hạng · Dự đoán knockout"
                        : "Xem lịch thi đấu · Lọc trận đấu và đội bóng yêu thích"}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:flex-col sm:items-end sm:gap-1.5">
              {isSimulatorMode && (
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <SyncLiveResultsButton />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Xóa toàn bộ kịch bản?")) resetAll();
                    }}
                    className="px-2 sm:px-3 py-1.5 text-xs rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/50 transition-colors"
                  >
                    Đặt lại
                  </button>
                </div>
              )}
              <div className="flex bg-zinc-900/80 border border-zinc-800 p-0.5 sm:p-1 rounded-lg text-xs sm:text-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("groups")}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 font-medium rounded-md transition-colors ${
                    isSimulatorMode
                      ? "bg-[#6a041f] text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  Mô phỏng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === "schedule" ||
                    activeTab === "fav-matches" ||
                    activeTab === "fav-teams"
                      ? "bg-[#6a041f] text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <span className="hidden sm:inline">
                    Lịch thi đấu &amp; Yêu thích
                  </span>
                  <span className="sm:hidden">Lịch &amp; YT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("live")}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 font-medium rounded-md transition-colors ${
                    activeTab === "live"
                      ? "bg-[#6a041f] text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  <span className="hidden sm:inline">Trực tiếp</span>
                  <span className="sm:hidden">Live</span>
                </button>
                <Link
                  href="/teams"
                  className="px-2 sm:px-3 py-1 sm:py-1.5 font-medium rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Đội tuyển
                </Link>
              </div>
            </div>
          </div>

          {currentTabs.length > 0 && (
            <nav
              className={`grid grid-cols-3 sm:flex sm:flex-wrap gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs sm:text-sm ${
                activeTab === "knockout" ? "mt-2" : "mt-2 sm:mt-4"
              }`}
            >
              {currentTabs.map((tab) => {
                const showKnockoutDot =
                  tab.id === "knockout" &&
                  knockoutSyncNotice?.pending &&
                  activeTab !== "knockout";

                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "relative w-full sm:w-auto px-2 sm:px-3 py-2 font-medium rounded-md transition-colors whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-zinc-800 text-white font-semibold"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {tab.label}
                    {showKnockoutDot && (
                      <span
                        data-testid="knockout-sync-dot"
                        className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-300 ring-2 ring-zinc-900"
                        aria-label="Knockout đã cập nhật"
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <main
        className={
          activeTab === "knockout"
            ? "flex min-h-0 flex-1 w-full flex-col overflow-hidden px-2 py-2 sm:px-3"
            : "mx-auto w-full min-w-0 max-w-7xl px-4 py-6"
        }
      >
        {activeTab === "groups" && (
          <div className="space-y-4">
            <GroupInputModeToggle />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {seed.groups.map((g) => (
                <GroupCard
                  key={g.letter}
                  group={g}
                  standing={standingMap.get(g.letter)!}
                />
              ))}
            </div>
          </div>
        )}
        {activeTab === "schedule" && <SchedulePanel espnMatches={espnMatches} />}
        {activeTab === "fav-matches" && (
          <SchedulePanel filterMode="fav-matches" espnMatches={espnMatches} />
        )}
        {activeTab === "fav-teams" && <SchedulePanel filterMode="fav-teams" espnMatches={espnMatches} />}
        {activeTab === "third" && <ThirdPlacePanel />}
        {activeTab === "knockout" && <KnockoutBracket />}
        {activeTab === "live" && (
          <LivePanel espnMatches={espnMatches} />
        )}
      </main>

      {activeTab !== "knockout" && (
        <footer className="shrink-0 border-t border-zinc-800 py-4 text-center text-sm text-zinc-600 space-y-1">
          <p>Dữ liệu trận đấu từ FIFA API · Annex C 495 tổ hợp hạng 3</p>
          <p>
            FIFA Ranking:{" "}
            <a
              href={fifaRankMeta.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500/80 hover:text-amber-400 underline underline-offset-2"
            >
              inside.fifa.com
            </a>
            {fifaRankMeta.lastOfficialUpdate
              ? ` · cập nhật chính thức ${fifaRankMeta.lastOfficialUpdate}`
              : null}
          </p>
        </footer>
      )}
    </div>
  );
}
