"use client";

import { useMemo, useState } from "react";
import { useSchedule } from "@/lib/hooks";
import {
  findEspnMatch,
  categorizeLiveEntry,
  type EspnScoreboardMatch,
} from "@/lib/espn-match";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { LiveMatchCard } from "./LiveMatchCard";
import { UpcomingMatchCard } from "./UpcomingMatchCard";
import { MatchStatsModal } from "./MatchStatsModal";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {} as Record<string, string>,
);

function formatDateLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  const todayStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(today);
  const tomorrowStr = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(tomorrow);

  if (dStr === todayStr) return `HÔM NAY · ${dStr}`;
  if (dStr === tomorrowStr) return `NGÀY MAI · ${dStr}`;
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
  });
}

type FilterMode = "live" | "upcoming";

type LivePanelProps = {
  espnMatches: EspnScoreboardMatch[];
  espnLoading: boolean;
};

export function LivePanel({ espnMatches, espnLoading }: LivePanelProps) {
  const [filterMode, setFilterMode] = useState<FilterMode | "all">("all");
  const allEntries = useSchedule();

  // Match detail modal state
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedMatchDate, setSelectedMatchDate] = useState<string | null>(
    null,
  );

  const { liveEntries, upcomingEntries } = useMemo(() => {
    const live: typeof allEntries = [];
    const upcoming: typeof allEntries = [];
    const espnLoaded = espnMatches.length > 0;

    for (const entry of allEntries) {
      if (!entry.date) continue;
      const eventDate = new Date(entry.date);
      const espnMatch = findEspnMatch(entry, espnMatches, ESPN_TO_LOCAL);

      const category = categorizeLiveEntry({
        eventDate,
        espnMatch,
        espnLoaded,
      });
      if (category === "live") live.push(entry);
      else if (category === "upcoming") upcoming.push(entry);
    }

    // Sort upcoming by date
    upcoming.sort(
      (a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime(),
    );

    return { liveEntries: live, upcomingEntries: upcoming };
  }, [allEntries, espnMatches]);

  const showLive = filterMode === "all" || filterMode === "live";
  const showUpcoming = filterMode === "all" || filterMode === "upcoming";

  const hasContent =
    (showLive && liveEntries.length > 0) ||
    (showUpcoming && upcomingEntries.length > 0);

  if (!hasContent) {
    return (
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight pt-4 pb-3">
          Trực tiếp
        </h2>

        {/* Toggle bar — always visible so user can switch back */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() =>
              setFilterMode(filterMode === "live" ? "all" : "live")
            }
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              showLive
                ? "bg-rose-950/40 border border-rose-500/30 text-rose-400"
                : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            🔴 LIVE {liveEntries.length > 0 && `(${liveEntries.length})`}
          </button>
          <button
            type="button"
            onClick={() =>
              setFilterMode(filterMode === "upcoming" ? "all" : "upcoming")
            }
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              showUpcoming
                ? "bg-amber-950/30 border border-amber-500/20 text-amber-400"
                : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            ⏰ Sắp đá{" "}
            {upcomingEntries.length > 0 && `(${upcomingEntries.length})`}
          </button>
        </div>

        <p className="text-zinc-500 text-sm py-12 text-center">
          Không có trận đấu trực tiếp hoặc sắp đá trong 1-2 ngày tới.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-3 pt-4 pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Trực tiếp</h2>
        {liveEntries.length > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
          </span>
        )}
      </div>

      {/* Toggle bar */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setFilterMode(filterMode === "live" ? "all" : "live")}
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
            showLive
              ? "bg-rose-950/40 border border-rose-500/30 text-rose-400"
              : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          🔴 LIVE {liveEntries.length > 0 && `(${liveEntries.length})`}
        </button>
        <button
          type="button"
          onClick={() =>
            setFilterMode(filterMode === "upcoming" ? "all" : "upcoming")
          }
          className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
            showUpcoming
              ? "bg-amber-950/30 border border-amber-500/20 text-amber-400"
              : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          ⏰ Sắp đá{" "}
          {upcomingEntries.length > 0 && `(${upcomingEntries.length})`}
        </button>
      </div>

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
                    espnMatch={espnMatch}
                    homeName={entry.home?.name ?? entry.homePlaceholder}
                    awayName={entry.away?.name ?? entry.awayPlaceholder}
                    homeCode={entry.home?.code ?? ""}
                    awayCode={entry.away?.code ?? ""}
                    onOpenDetail={(gameId, matchDate) => {
                      setSelectedGameId(gameId);
                      setSelectedMatchDate(matchDate);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming section */}
        {showUpcoming && upcomingEntries.length > 0 && (
          <div>
            {/* Group by date */}
            {(() => {
              const groups: {
                label: string;
                entries: typeof upcomingEntries;
              }[] = [];
              let currentLabel = "";
              let currentGroup: typeof upcomingEntries = [];
              for (const entry of upcomingEntries) {
                const label = formatDateLabel(new Date(entry.date!));
                if (label !== currentLabel) {
                  if (currentGroup.length > 0) {
                    groups.push({ label: currentLabel, entries: currentGroup });
                  }
                  currentLabel = label;
                  currentGroup = [];
                }
                currentGroup.push(entry);
              }
              if (currentGroup.length > 0) {
                groups.push({ label: currentLabel, entries: currentGroup });
              }
              return groups.map((group) => (
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
                          onOpenDetail={(gameId, matchDate) => {
                            setSelectedGameId(gameId);
                            setSelectedMatchDate(matchDate);
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <MatchStatsModal
        gameId={selectedGameId}
        matchDate={selectedMatchDate}
        onClose={() => {
          setSelectedGameId(null);
          setSelectedMatchDate(null);
        }}
      />
    </div>
  );
}
