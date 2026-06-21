"use client";

import Link from "next/link";
import { FlagIcon } from "./FlagIcon";
import type { ScheduleEntry } from "@/lib/schedule";

type UpcomingMatchCardProps = {
  entry: ScheduleEntry;
  gameId?: string;
  onOpenDetail?: (entry: ScheduleEntry, gameId: string, matchDate: string) => void;
};

function getTeamSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-and-/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function UpcomingMatchCard({ entry, gameId, onOpenDetail }: UpcomingMatchCardProps) {
  let timeStr = "--:--";
  if (entry.date) {
    const d = new Date(entry.date);
    if (!Number.isNaN(d.getTime())) {
      timeStr = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
    }
  }

  const stadiumStr = entry.stadium ? entry.stadium : entry.city ?? "";

  const handleClick = onOpenDetail && gameId && entry.date
    ? () => onOpenDetail(entry, gameId, entry.date!)
    : undefined;

  return (
    <div
      onClick={handleClick}
      className={`bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 transition-colors ${
        handleClick ? "cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/70 active:scale-[0.99]" : "hover:border-zinc-700 hover:bg-zinc-900/70"
      }`}
    >
      {/* Home side */}
      {entry.home ? (
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <span className="font-semibold text-xs sm:text-sm truncate">{entry.home.name}</span>
          <Link
            href={`/teams/${getTeamSlug(entry.home.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.home.code} size="sm" title={entry.home.name} />
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-xs sm:text-sm text-zinc-500">{entry.homePlaceholder}</span>
        </div>
      )}

      {/* Center: time + stadium */}
      <div className="flex-shrink-0 text-center min-w-[72px] sm:min-w-[88px]">
        <div className="text-sm sm:text-base font-mono font-semibold text-amber-400 tabular-nums">
          {timeStr}
        </div>
        {stadiumStr && (
          <div className="text-[10px] sm:text-[11px] text-zinc-500 truncate max-w-[96px] sm:max-w-[120px] mt-0.5">
            {stadiumStr}
          </div>
        )}
      </div>

      {/* Away side */}
      {entry.away ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href={`/teams/${getTeamSlug(entry.away.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <FlagIcon code={entry.away.code} size="sm" title={entry.away.name} />
          </Link>
          <span className="font-semibold text-xs sm:text-sm truncate">{entry.away.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs sm:text-sm text-zinc-500">{entry.awayPlaceholder}</span>
        </div>
      )}
    </div>
  );
}
