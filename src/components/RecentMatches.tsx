"use client";

import { useState } from "react";
import { MatchStatsModal } from "./MatchStatsModal";

interface RecentMatchesProps {
  recentMatches: any[];
}

export function RecentMatches({ recentMatches }: RecentMatchesProps) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  if (!recentMatches || recentMatches.length === 0) return null;

  return (
    <>
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-xl font-black">Phong độ gần đây</h2>
        <div className="mt-4 flex flex-col gap-3">
          {recentMatches.map((match) => (
            <div 
              key={match.id} 
              className="group flex cursor-pointer items-center gap-3 rounded-xl bg-zinc-900/60 p-3 text-sm transition-colors hover:bg-zinc-800"
              onClick={() => setSelectedGameId(match.id)}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-white shadow-sm ${
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
        <p className="mt-3 text-xs text-zinc-500">Dữ liệu từ ESPN</p>
      </div>

      {selectedGameId && (
        <MatchStatsModal gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />
      )}
    </>
  );
}
