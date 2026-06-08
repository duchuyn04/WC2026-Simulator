"use client";

import { useMemo } from "react";
import { useThirdPlace } from "@/lib/hooks";
import { useSimulation } from "@/lib/store";
import { getFifaRankingsMeta } from "@/lib/fifa/rankings";
import { TeamBadge } from "./TeamBadge";
import { SortableTeamList } from "./SortableTeamList";

export function ThirdPlacePanel() {
  const third = useThirdPlace();
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const setThirdPlaceOrder = useSimulation((s) => s.setThirdPlaceOrder);
  const clearThirdPlaceOrder = useSimulation((s) => s.clearThirdPlaceOrder);
  const fifaRankMeta = getFifaRankingsMeta();
  const isRanksMode = groupInputMode === "ranks";

  const rankRows = useMemo(
    () =>
      third.ranked.map((team, index) => ({
        id: team.team.id,
        team: team.team,
        subtitle: `Bảng ${team.group}`,
        qualified: index < 8,
      })),
    [third.ranked]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
        <h2 className="text-2xl font-bold mb-1">8 đội hạng 3 tốt nhất</h2>
        <p className={`text-base text-zinc-400 ${fifaRankMeta.lastOfficialUpdate ? "mb-2" : "mb-4"}`}>
          {isRanksMode ? (
            <>
              Kéo thả xếp thứ tự 1 → 12 — <span className="text-emerald-400/90">top 8</span> vào
              knockout. Tổ hợp bảng:{" "}
              <code className="text-amber-400 font-mono text-sm">
                {third.qualifyingGroups || "—"}
              </code>
            </>
          ) : (
            <>
              Xếp hạng theo điểm → hiệu số → bàn thắng → fair play →{" "}
              <a
                href={fifaRankMeta.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500/90 hover:text-amber-400 underline underline-offset-2"
              >
                FIFA ranking
              </a>
              . Tổ hợp bảng:{" "}
              <code className="text-amber-400 font-mono text-sm">
                {third.qualifyingGroups || "—"}
              </code>
            </>
          )}
        </p>
        {fifaRankMeta.lastOfficialUpdate && (
          <p className="text-xs text-zinc-500 mb-4">
            BXH FIFA ({fifaRankMeta.teamCount} đội) · cập nhật chính thức{" "}
            {fifaRankMeta.lastOfficialUpdate}
          </p>
        )}

        {isRanksMode ? (
          <SortableTeamList
            rows={rankRows}
            onReorder={setThirdPlaceOrder}
            onClearManual={clearThirdPlaceOrder}
            manual
            size="md"
            title="Xếp hạng 12 đội hạng 3"
            hint="Hạng 1–8 (xanh) đi tiếp · Hạng 9–12 bị loại"
            testId="third-place-rank-list"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {third.qualified.map((t, i) => (
              <div
                key={t.team.id}
                className="flex min-w-0 items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50"
              >
                <span className="w-6 shrink-0 text-center font-bold text-emerald-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <TeamBadge team={t.team} />
                </div>
                <span className="shrink-0 text-xs sm:text-sm font-mono text-zinc-400 tabular-nums">
                  {t.points}pts · {t.gd > 0 ? `+${t.gd}` : t.gd} · Bảng {t.group}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isRanksMode && third.eliminated.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6">
          <h3 className="text-base font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Bị loại (hạng 3)
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {third.eliminated.map((t) => (
              <div
                key={t.team.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 opacity-60"
              >
                <TeamBadge team={t.team} />
                <span className="ml-auto text-sm font-mono text-zinc-500">
                  {t.points}pts · Bảng {t.group}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}