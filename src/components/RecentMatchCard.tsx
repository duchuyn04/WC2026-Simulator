"use client";

import { FlagIcon } from "./FlagIcon";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import type { ScheduleEntry } from "@/lib/schedule";

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

  return (
    <div
      onClick={handleClick}
      className={`rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 transition-colors sm:p-4 ${
        handleClick
          ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <span className="truncate text-right text-xs font-semibold leading-tight sm:text-sm">
            {homeName}
          </span>
          <FlagIcon code={homeCode} size="md" title={homeName} />
        </div>

        <div className="flex-shrink-0 px-1 text-center sm:px-2">
          <div className="text-2xl font-black tracking-wider text-emerald-400 tabular-nums sm:text-3xl lg:text-4xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:mt-1">
            {espnMatch.shortDetail || "Đã kết thúc"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <FlagIcon code={awayCode} size="md" title={awayName} />
          <span className="truncate text-left text-xs font-semibold leading-tight sm:text-sm">
            {awayName}
          </span>
        </div>
      </div>
    </div>
  );
}
