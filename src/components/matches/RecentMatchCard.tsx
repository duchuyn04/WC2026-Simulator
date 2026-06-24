"use client";

import { FlagIcon } from "@/components/ui/FlagIcon";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import type { ScheduleEntry } from "@/lib/schedule";

import { prefetchMatchStats } from "./MatchStatsModal";

type RecentMatchCardProps = {
  entry: ScheduleEntry;
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};

export function RecentMatchCard({
  entry,
  espnMatch,
  homeName,
  awayName,
  homeCode,
  awayCode,
  onOpenDetail,
}: RecentMatchCardProps) {
  const handleClick = onOpenDetail
    ? () => onOpenDetail(entry, espnMatch.id, espnMatch.date)
    : undefined;
    
  const handlePointerEnter = onOpenDetail
    ? () => prefetchMatchStats(espnMatch.id)
    : undefined;

  return (
    <div
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-2 transition-colors sm:p-2.5 ${
        handleClick
          ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-xs font-semibold text-white">
            {homeName}
          </span>
          <FlagIcon code={homeCode} size="sm" title={homeName} />
        </div>

        <div className="flex-shrink-0 px-1 text-center min-w-[70px]">
          <div className="text-lg font-black tracking-wider text-emerald-400 tabular-nums sm:text-xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
            {espnMatch.shortDetail || "Đã kết thúc"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FlagIcon code={awayCode} size="sm" title={awayName} />
          <span className="truncate text-left text-xs font-semibold text-white">
            {awayName}
          </span>
        </div>
      </div>
    </div>
  );
}
