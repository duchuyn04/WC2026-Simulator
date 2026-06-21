"use client";

import { useMemo, useState } from "react";
import { useSchedule } from "@/lib/hooks";
import {
  getDoneEntries,
  groupDoneEntriesByDate,
  syncAllDone,
} from "@/lib/recent-matches";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { useSimulation } from "@/lib/store";
import { RecentMatchCard } from "./RecentMatchCard";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {} as Record<string, string>
);

type RecentMatchesPanelProps = {
  espnMatches: import("@/lib/espn-match").EspnScoreboardMatch[];
  mode: "recent-5" | "all-done";
  title?: string;
  showSyncAll?: boolean;
  onOpenDetail?: (gameId: string, matchDate: string) => void;
};

export function RecentMatchesPanel({
  espnMatches,
  mode,
  title,
  showSyncAll,
  onOpenDetail,
}: RecentMatchesPanelProps) {
  const allEntries = useSchedule();
  const applyLiveResults = useSimulation((s) => s.applyLiveResults);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const doneEntries = useMemo(
    () => getDoneEntries(allEntries, espnMatches, ESPN_TO_LOCAL),
    [allEntries, espnMatches]
  );

  const displayedEntries = useMemo(
    () => (mode === "recent-5" ? doneEntries.slice(0, 5) : doneEntries),
    [doneEntries, mode]
  );

  const groups = useMemo(
    () => groupDoneEntriesByDate(displayedEntries),
    [displayedEntries]
  );

  const groupCount = doneEntries.filter((d) => d.entry.kind === "group").length;

  const handleSyncAll = () => {
    if (syncing || groupCount === 0) return;
    setSyncing(true);
    const updates = syncAllDone(doneEntries, ESPN_TO_LOCAL);
    applyLiveResults(updates);
    setSyncing(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  };

  const panelTitle =
    title ?? (mode === "recent-5" ? "Các trận gần nhất" : "Các trận đã kết thúc");
  const subtitle =
    mode === "recent-5" ? "5 trận đã kết thúc gần nhất" : undefined;

  return (
    <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div>
          <h3 className="text-base font-black sm:text-lg">⚽ {panelTitle}</h3>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {showSyncAll && (
          <button
            type="button"
            disabled={syncing || syncSuccess || groupCount === 0}
            onClick={handleSyncAll}
            className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/50 disabled:opacity-50 sm:px-3"
          >
            {syncing
              ? "Đang đồng bộ..."
              : syncSuccess
                ? "Đã đồng bộ! ✓"
                : "Đồng bộ tất cả"}
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Chưa có trận nào kết thúc.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                {group.label}
              </div>
              <div className="space-y-2 sm:space-y-3">
                {group.entries.map(({ entry, espn }) => (
                  <RecentMatchCard
                    key={entry.id}
                    espnMatch={espn}
                    homeName={entry.home?.name ?? entry.homePlaceholder}
                    awayName={entry.away?.name ?? entry.awayPlaceholder}
                    homeCode={entry.home?.code ?? ""}
                    awayCode={entry.away?.code ?? ""}
                    onOpenDetail={onOpenDetail}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
