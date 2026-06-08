"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSimulation } from "@/lib/store";
import { GroupDetailModal } from "./GroupDetailModal";
import { TeamBadge } from "./TeamBadge";
import type { GroupData, GroupStanding } from "@/lib/fifa/types";

const StandingsDnD = dynamic(() => import("./StandingsDnD").then((m) => m.StandingsDnD), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-600 px-3 py-4">Đang tải...</p>,
});

type Props = {
  group: GroupData;
  standing: GroupStanding;
};

export function GroupCard({ group, standing }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const matchResults = useSimulation((s) => s.matchResults);
  const manualOrder = useSimulation((s) => s.manualOrder);
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const setScore = useSimulation((s) => s.setScore);
  const setManualOrder = useSimulation((s) => s.setManualOrder);
  const clearManualOrder = useSimulation((s) => s.clearManualOrder);

  const isRanksMode = groupInputMode === "ranks";
  const isManual = !isRanksMode && !!manualOrder[group.letter];
  const medals = ["🥇", "🥈", "🥉", "4"];
  const playedCount = group.matches.filter((m) => {
    const r = matchResults[m.id];
    return r?.home !== undefined && r?.away !== undefined;
  }).length;

  const orderForGroup = useMemo(() => {
    const saved = manualOrder[group.letter];
    if (saved && saved.length === 4) return saved;
    return standing.ranked.map((row) => row.team.id);
  }, [manualOrder, group.letter, standing.ranked]);

  return (
    <>
      <div
        data-testid={`group-card-${group.letter}`}
        className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-amber-600/20 to-transparent border-b border-zinc-800">
          <div>
            <h3 className="text-xl font-bold tracking-wide">Bảng {group.letter}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isRanksMode
                ? "Kéo ⠿ để xếp thứ hạng"
                : `${playedCount}/6 trận đã nhập${isManual ? " · Thứ hạng thủ công" : ""}`}
            </p>
          </div>
          {!isRanksMode && (
            <button
              type="button"
              data-testid={`group-detail-btn-${group.letter}`}
              onClick={() => setDetailOpen(true)}
              className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
            >
              Chi tiết
            </button>
          )}
        </div>

        {isRanksMode ? (
          <div className="flex-1 p-3">
            <StandingsDnD
              ranked={standing.ranked}
              manual={false}
              hideStats
              compact
              onReorder={(ids) => setManualOrder(group.letter, ids)}
              onClearManual={() => clearManualOrder(group.letter)}
              testId="group-rank-list"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="flex-1 p-4 text-left hover:bg-zinc-900/40 transition-colors"
          >
            <div className="space-y-2">
              {standing.ranked.map((stat, i) => (
                <div
                  key={stat.team.id}
                  className="flex items-center gap-2 min-w-0 rounded-lg bg-zinc-900/50 px-2 py-1.5"
                >
                  <span className="w-5 shrink-0 text-center text-sm">{medals[i]}</span>
                  <TeamBadge team={stat.team} size="sm" />
                  <span className="ml-auto shrink-0 font-mono text-sm text-zinc-400 tabular-nums">
                    {stat.points}pts
                  </span>
                  <span className="shrink-0 font-mono text-xs text-zinc-600 tabular-nums">
                    {stat.gd > 0 ? `+${stat.gd}` : stat.gd}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">
              Bấm để nhập tỉ số và xem BXH thay đổi
            </p>
          </button>
        )}
      </div>

      {!isRanksMode && (
        <GroupDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          group={group}
          standing={standing}
          matchResults={matchResults}
          inputMode={groupInputMode}
          isManual={isManual}
          manualOrder={orderForGroup}
          onScore={setScore}
          onReorder={(ids) => setManualOrder(group.letter, ids)}
          onClearManual={() => clearManualOrder(group.letter)}
        />
      )}
    </>
  );
}