"use client";

import { FlagIcon } from "./FlagIcon";
import type { EspnScoreboardMatch } from "@/lib/espn-match";

type LiveMatchCardProps = {
  espnMatch: EspnScoreboardMatch;
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
};

export function LiveMatchCard({ espnMatch, homeName, awayName, homeCode, awayCode }: LiveMatchCardProps) {
  const liveClock = `${espnMatch.displayClock || espnMatch.shortDetail}`;

  return (
    <div className="bg-gradient-to-br from-[#1a0a0a] to-[#2d0a0a] border border-red-500/25 rounded-xl p-4">
      <div className="flex items-center justify-between">
        {/* Home team */}
        <div className="flex-1 text-center">
          <div className="inline-flex justify-center">
            <FlagIcon code={homeCode} size="lg" title={homeName} />
          </div>
          <div className="font-bold text-sm mt-1">{homeName}</div>
        </div>

        {/* Score + clock */}
        <div className="flex-[0.6] text-center">
          <div className="text-4xl font-black text-emerald-500 tracking-wider tabular-nums">
            {espnMatch.homeScore} - {espnMatch.awayScore}
          </div>
          <div className="text-xs font-semibold text-rose-500 mt-1">
            <span className="animate-pulse mr-1">🔴</span>LIVE · {liveClock}
          </div>
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          <div className="inline-flex justify-center">
            <FlagIcon code={awayCode} size="lg" title={awayName} />
          </div>
          <div className="font-bold text-sm mt-1">{awayName}</div>
        </div>
      </div>
    </div>
  );
}
