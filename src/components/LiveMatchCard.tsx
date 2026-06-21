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
      className={`bg-zinc-950/80 border border-zinc-800 border-l-2 border-l-red-500/60 rounded-xl p-2 sm:p-2.5 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/80 active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 min-w-0 flex items-center gap-2 justify-end">
          <span className="font-semibold text-xs truncate text-right text-white">{homeName}</span>
          <FlagIcon code={homeCode} size="sm" title={homeName} />
        </div>

        {/* Score + live clock */}
        <div className="flex-shrink-0 text-center px-1 min-w-[70px]">
          <div className="text-lg font-black text-rose-500 tracking-wider tabular-nums sm:text-xl">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="flex items-center justify-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            <span className="text-[9px] font-semibold text-rose-400 uppercase tracking-wide">
              Live · {liveClock}
            </span>
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <FlagIcon code={awayCode} size="sm" title={awayName} />
          <span className="font-semibold text-xs truncate text-left text-white">{awayName}</span>
        </div>
      </div>
    </div>
  );
}
