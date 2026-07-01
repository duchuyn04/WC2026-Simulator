"use client";

import { useState } from "react";
import { MatchStatsModal } from "./MatchStatsModal";
import type { RecentTeamMatch } from "@/lib/espn";

interface RecentMatchesProps {
  recentMatches: RecentTeamMatch[];
}

export function RecentMatches({ recentMatches }: RecentMatchesProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedMatchDate, setSelectedMatchDate] = useState<string | null>(null);

  if (!recentMatches || recentMatches.length === 0) return null;

  return (
    <>
      <div className="min-w-0 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-5">
        <h2 className="text-lg font-black sm:text-xl">Phong độ gần đây</h2>
        <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:mt-4 sm:flex-col sm:gap-3 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {recentMatches.map((match) => (
            <div 
              key={match.id} 
              className="group flex min-w-48 cursor-pointer items-center gap-2 rounded-xl bg-zinc-900/60 p-2 text-sm transition-colors hover:bg-zinc-800 sm:min-w-0 sm:gap-3 sm:p-3"
              onClick={() => { setSelectedGameId(match.id); setSelectedMatchDate(match.date ?? null); }}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white shadow-sm sm:h-10 sm:w-10 sm:rounded-xl ${
                  match.result === "W"
                    ? "bg-emerald-500"
                    : match.result === "L"
                    ? "bg-rose-500"
                    : "bg-zinc-500"
                }`}
              >
                {match.result}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors" title={match.name}>{match.name}</p>
                <p className="text-xs font-medium text-zinc-500 mt-0.5">
                  {new Date(match.date).toLocaleDateString("vi-VN")} · <span className="text-amber-400 font-bold">{match.homeTeam.score} - {match.awayTeam.score}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500 sm:mt-3">Dữ liệu từ ESPN</p>
      </div>

      {selectedGameId && (
        <MatchStatsModal gameId={selectedGameId} matchDate={selectedMatchDate} onClose={() => { setSelectedGameId(null); setSelectedMatchDate(null); }} />
      )}
    </>
  );
}
