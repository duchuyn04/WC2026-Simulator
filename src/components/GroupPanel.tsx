"use client";

import dynamic from "next/dynamic";
import { ScoreInput } from "./ScoreInput";
import type { GroupData, GroupStanding, MatchResult } from "@/lib/fifa/types";

const StandingsDnD = dynamic(() => import("./StandingsDnD").then((m) => m.StandingsDnD), {
  ssr: false,
  loading: () => <p className="text-sm text-zinc-600">Đang tải bảng xếp hạng...</p>,
});

type Props = {
  group: GroupData;
  standing: GroupStanding;
  matchResults: Record<string, MatchResult>;
  isManual: boolean;
  onScore: (matchId: string, home?: number | null, away?: number | null) => void;
  onReorder: (teamIds: string[]) => void;
  onClearManual: () => void;
  variant?: "card" | "detail";
  highlightStandings?: boolean;
};

export function GroupPanel({
  group,
  standing,
  matchResults,
  isManual,
  onScore,
  onReorder,
  onClearManual,
  variant = "card",
  highlightStandings = false,
}: Props) {
  const isDetail = variant === "detail";

  return (
    <div className={isDetail ? "grid gap-6 lg:grid-cols-2 lg:gap-8" : "space-y-4"}>
      <section className="space-y-2">
        <h4
          className={
            isDetail
              ? "text-base font-semibold uppercase tracking-wider text-zinc-400"
              : "text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-2"
          }
        >
          Kết quả trận
        </h4>
        <div className={isDetail ? "space-y-3" : "space-y-1.5"}>
          {group.matches.map((m) => (
            <ScoreInput
              key={m.id}
              match={m}
              result={matchResults[m.id]}
              onChange={(home, away) => onScore(m.id, home, away)}
            />
          ))}
        </div>
      </section>

      <section
        className={
          isDetail
            ? "rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 lg:sticky lg:top-0 lg:self-start"
            : ""
        }
      >
        {isDetail && (
          <p className="mb-3 text-sm text-amber-200/80">
            BXH cập nhật ngay khi nhập tỉ số — đội đổi hạng sẽ được tô sáng.
          </p>
        )}
        <StandingsDnD
          ranked={standing.ranked}
          manual={isManual}
          onReorder={onReorder}
          onClearManual={onClearManual}
          highlightChanges={highlightStandings}
          size={isDetail ? "lg" : "md"}
        />
      </section>
    </div>
  );
}