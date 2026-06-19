"use client";

import { StandingsDnD } from "./lazy-standings";
import { ScoreInput } from "./ScoreInput";
import type { GroupData, GroupStanding, MatchResult } from "@/lib/fifa/types";
import type { GroupInputMode } from "@/lib/store";

type Props = {
  group: GroupData;
  standing: GroupStanding;
  matchResults: Record<string, MatchResult>;
  inputMode: GroupInputMode;
  isManual: boolean;
  manualOrder: string[];
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
  inputMode,
  isManual,
  manualOrder,
  onScore,
  onReorder,
  onClearManual,
  variant = "card",
  highlightStandings = false,
}: Props) {
  const isDetail = variant === "detail";
  const isRanksMode = inputMode === "ranks";

  return (
    <div className={isDetail ? "grid gap-6 lg:grid-cols-2 lg:gap-8" : "space-y-4"}>
      <section className="space-y-2">
        {isRanksMode ? (
          isDetail && (
            <p className="mb-3 text-sm text-amber-200/80">
              Kéo thả ⠿ để sắp xếp thứ hạng — không cần nhập tỉ số.
            </p>
          )
        ) : (
          <>
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
          </>
        )}
      </section>

      <section
        className={
          isDetail
            ? "rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 lg:sticky lg:top-0 lg:self-start"
            : ""
        }
      >
        {isDetail && !isRanksMode && (
          <p className="mb-3 text-sm text-amber-200/80">
            BXH cập nhật ngay khi nhập tỉ số — đội đổi hạng sẽ được tô sáng.
          </p>
        )}
        <StandingsDnD
          ranked={standing.ranked}
          manual={!isRanksMode && isManual}
          hideStats={isRanksMode}
          onReorder={onReorder}
          onClearManual={onClearManual}
          highlightChanges={highlightStandings && !isRanksMode}
          size={isDetail ? "lg" : "md"}
          testId={isRanksMode ? "group-rank-list" : undefined}
        />
      </section>
    </div>
  );
}