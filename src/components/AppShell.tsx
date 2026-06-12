"use client";

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

export function AppShell() {
  const hydrated = useStoreHydrated();
  const activeTab = useSimulation((s) => s.activeTab);
  usePersistedScroll(activeTab);
  const setActiveTab = useSimulation((s) => s.setActiveTab);
  const knockoutSyncNotice = useSimulation((s) => s.knockoutSyncNotice);
  const standings = useGroupStandings();
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const resetAll = useSimulation((s) => s.resetAll);
  const favoriteMatches = useSimulation((s) => s.favoriteMatches);
  const favoriteTeams = useSimulation((s) => s.favoriteTeams);

  const SIMULATOR_TABS: { id: TabId; label: string }[] = [
    { id: "groups", label: "Vòng bảng" },
    { id: "third", label: "Hạng 3" },
    { id: "knockout", label: "Knockout" },
  ];

  const SCHEDULE_TABS: { id: TabId; label: string }[] = [
    { id: "schedule", label: "Tất cả lịch thi đấu" },
    { id: "fav-matches", label: `Trận yêu thích (${favoriteMatches.length})` },
    { id: "fav-teams", label: `Đội yêu thích (${favoriteTeams.length})` },
  ];

  const isSimulatorMode = SIMULATOR_TABS.some(t => t.id === activeTab);
  const currentTabs = isSimulatorMode ? SIMULATOR_TABS : SCHEDULE_TABS;

  const standingMap = new Map(standings.map((s) => [s.letter, s]));
  const fifaRankMeta = getFifaRankingsMeta();

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-zinc-500 text-base">
        Đang tải...
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
      <header className="sticky top-0 z-50 shrink-0 border-b border-zinc-800 bg-[#0c0f14]/95 backdrop-blur">
        <div
          className={`max-w-7xl mx-auto px-4 ${activeTab === "knockout" ? "py-2" : "py-4"}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-amber-500 font-semibold">
                FIFA World Cup
              </p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                WC 2026 Simulator
              </h1>
              {activeTab !== "knockout" && (
                <p className="text-base text-zinc-500 mt-0.5">
                  {activeTab === "groups" && groupInputMode === "ranks"
                    ? "Kéo thả thứ hạng · Xếp hạng 3 · Knockout"
                    : isSimulatorMode 
                      ? "Nhập tỉ số · Kéo thả thứ hạng · Dự đoán knockout"
                      : "Xem lịch thi đấu · Lọc trận đấu và đội bóng yêu thích"}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              {isSimulatorMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <SyncLiveResultsButton />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Xóa toàn bộ kịch bản?")) resetAll();
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/50 transition-colors"
                  >
                    Đặt lại
                  </button>
                </div>
              )}
              <div className="flex flex-wrap bg-zinc-900/80 border border-zinc-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab("groups")}
                  className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
                  className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    !isSimulatorMode
                      ? "bg-[#6a041f] text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  }`}
                >
                  Lịch thi đấu & Yêu thích
                </button>
                <Link
                  href="/teams"
                  className="px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Đội tuyển
                </Link>
              </div>
            </div>
          </div>

          <nav
            className={`grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800 ${
              activeTab === "knockout" ? "mt-2" : "mt-4"
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
                    "relative w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
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
        {activeTab === "schedule" && <SchedulePanel />}
        {activeTab === "fav-matches" && <SchedulePanel filterMode="fav-matches" />}
        {activeTab === "fav-teams" && <SchedulePanel filterMode="fav-teams" />}
        {activeTab === "third" && <ThirdPlacePanel />}
        {activeTab === "knockout" && <KnockoutBracket />}
      </main>

      {activeTab !== "knockout" && (
        <footer className="shrink-0 border-t border-zinc-800 py-4 text-center text-sm text-zinc-600 space-y-1">
          <p>
            Dữ liệu trận đấu từ FIFA API · Annex C 495 tổ hợp hạng 3
          </p>
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
