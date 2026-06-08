"use client";

import { useSimulation } from "@/lib/store";
import { useGroupStandings, useStoreHydrated } from "@/lib/hooks";
import { usePersistedScroll } from "@/lib/use-persisted-scroll";
import { seed } from "@/lib/data";
import { GroupCard } from "./GroupCard";
import { ThirdPlacePanel } from "./ThirdPlacePanel";
import { KnockoutBracket } from "./KnockoutBracket";
import { SchedulePanel } from "./SchedulePanel";
import { getFifaRankingsMeta } from "@/lib/fifa/rankings";
import type { TabId } from "@/lib/tabs";

const TABS: { id: TabId; label: string }[] = [
  { id: "groups", label: "Vòng bảng" },
  { id: "schedule", label: "Lịch thi đấu" },
  { id: "third", label: "Hạng 3" },
  { id: "knockout", label: "Knockout" },
];

export function AppShell() {
  const hydrated = useStoreHydrated();
  const activeTab = useSimulation((s) => s.activeTab);
  usePersistedScroll(activeTab);
  const setActiveTab = useSimulation((s) => s.setActiveTab);
  const knockoutSyncNotice = useSimulation((s) => s.knockoutSyncNotice);
  const standings = useGroupStandings();
  const resetAll = useSimulation((s) => s.resetAll);

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
                  Nhập tỉ số · Kéo thả thứ hạng · Dự đoán knockout
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Xóa toàn bộ kịch bản?")) resetAll();
                }}
                className="px-3 py-2 text-sm rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/50 transition-colors"
              >
                Đặt lại
              </button>
            </div>
          </div>

          <nav
            className={`grid grid-cols-2 sm:flex sm:w-fit gap-0.5 sm:gap-1 p-1 rounded-lg bg-zinc-900/80 border border-zinc-800 ${
              activeTab === "knockout" ? "mt-2" : "mt-4"
            }`}
          >
            {TABS.map((tab) => {
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
                    "relative w-full sm:w-auto sm:flex-none px-2 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-base font-medium rounded-md transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-amber-500 text-black"
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
            : "max-w-7xl mx-auto px-4 py-6"
        }
      >
        {activeTab === "groups" && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {seed.groups.map((g) => (
              <GroupCard
                key={g.letter}
                group={g}
                standing={standingMap.get(g.letter)!}
              />
            ))}
          </div>
        )}
        {activeTab === "schedule" && <SchedulePanel />}
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
