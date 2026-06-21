"use client";

import { FlagIcon } from "./FlagIcon";
import type { EspnScoreboardMatch } from "@/lib/espn-match";
import type { ScheduleEntry } from "@/lib/schedule";

type LiveMatchCardProps = {
  entry: ScheduleEntry;
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};

export function LiveMatchCard({ entry, espnMatch, homeName, awayName, homeCode, awayCode, onOpenDetail }: LiveMatchCardProps) {
  const liveClock = `${espnMatch.displayClock || espnMatch.shortDetail}`;

  const handleClick = onOpenDetail ? () => onOpenDetail(entry, espnMatch.id, espnMatch.date) : undefined;

  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-950/80 border border-zinc-800 border-l-2 border-l-red-500/60 rounded-xl p-3 sm:p-4 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Home team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 justify-end">
          <span className="font-semibold text-xs sm:text-sm truncate text-right leading-tight">{homeName}</span>
          <FlagIcon code={homeCode} size="md" title={homeName} />
        </div>

        {/* Score + live clock */}
        <div className="flex-shrink-0 text-center px-1 sm:px-2">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 tracking-wider tabular-nums">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5 sm:mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-red-400 uppercase tracking-wide">
              Live · {liveClock}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
          <FlagIcon code={awayCode} size="md" title={awayName} />
          <span className="font-semibold text-xs sm:text-sm truncate text-left leading-tight">{awayName}</span>
        </div>
      </div>
    </div>
  );
}
