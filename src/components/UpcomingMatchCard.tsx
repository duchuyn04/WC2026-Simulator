"use client";

import Link from "next/link";
import { FlagIcon } from "./FlagIcon";
import type { ScheduleEntry } from "@/lib/schedule";

type UpcomingMatchCardProps = {
  entry: ScheduleEntry;
};

function getTeamSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-and-/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function UpcomingMatchCard({ entry }: UpcomingMatchCardProps) {
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

  return (
    <div className="bg-[#16182a] border border-white/5 rounded-lg px-4 py-3 flex items-center justify-between">
      {/* Home side */}
      {entry.home ? (
        <Link
          href={`/teams/${getTeamSlug(entry.home.name)}`}
          className="flex items-center gap-2 min-w-0 flex-1 hover:underline decoration-zinc-500"
        >
          <FlagIcon code={entry.home.code} size="sm" title={entry.home.name} />
          <span className="font-semibold text-sm truncate">{entry.home.name}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-zinc-500">{entry.homePlaceholder}</span>
        </div>
      )}

      {/* Center: time + stadium */}
      <div className="text-center mx-3 min-w-[80px]">
        <div className="text-sm font-mono text-zinc-400">{timeStr}</div>
        {stadiumStr && (
          <div className="text-[10px] text-zinc-600 truncate max-w-[100px]">{stadiumStr}</div>
        )}
      </div>

      {/* Away side */}
      {entry.away ? (
        <Link
          href={`/teams/${getTeamSlug(entry.away.name)}`}
          className="flex items-center gap-2 min-w-0 flex-1 justify-end hover:underline decoration-zinc-500"
        >
          <span className="font-semibold text-sm truncate">{entry.away.name}</span>
          <FlagIcon code={entry.away.code} size="sm" title={entry.away.name} />
        </Link>
      ) : (
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm text-zinc-500">{entry.awayPlaceholder}</span>
        </div>
      )}
    </div>
  );
}
