"use client";

import React, { useEffect, useState } from "react";
import { FlagIcon } from "./FlagIcon";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { seed } from "@/lib/data";
import { parseEspnScoreboard } from "@/lib/espn-match";
import {
  applyLiveMatchesToStandings,
  parseEspnStandings,
  type EspnStandingGroup,
} from "@/lib/espn-standings";
import type { Team } from "@/lib/fifa/types";
import SoccerSkeleton from "./SoccerSkeleton";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce((acc, [localId, espnId]) => {
  acc[espnId] = localId;
  return acc;
}, {} as Record<string, string>);

// Map Local Team ID to team details (code, name) from seed
const localTeamsMap = new Map<string, Team>();
for (const group of seed.groups) {
  for (const t of group.teams) {
    localTeamsMap.set(t.id, t);
  }
}

export function EspnStandingsBoard() {
  const [groups, setGroups] = useState<EspnStandingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStandings = async () => {
      try {
        const [standingsResponse, scoreboardResponse] = await Promise.all([
          fetch("https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings"),
          fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000"),
        ]);
        if (!standingsResponse.ok || !scoreboardResponse.ok) return;

        const [standingsData, scoreboardData] = await Promise.all([
          standingsResponse.json(),
          scoreboardResponse.json(),
        ]);
        const parsedGroups = applyLiveMatchesToStandings(
          parseEspnStandings(standingsData),
          parseEspnScoreboard(scoreboardData),
        );

        if (mounted && parsedGroups.length > 0) {
          setGroups(parsedGroups);
        }
      } catch {
        // Keep the last valid table while ESPN is temporarily unavailable.
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStandings();
    const interval = setInterval(fetchStandings, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <SoccerSkeleton variant="standings" />;
  }

  if (!groups || groups.length === 0) {
    return <p className="text-center text-zinc-500 py-12">Không tải được dữ liệu BXH.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.some((group) => group.hasLiveMatch) && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          BXH tạm tính theo các trận đang diễn ra
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 animate-in fade-in duration-500 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.name} className="flex flex-col border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden shadow-lg shadow-black/20">
          <div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/80 px-4 py-2">
            <h3 className="text-sm font-bold tracking-widest text-zinc-200 uppercase">{group.name}</h3>
            {group.hasLiveMatch && (
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                Live
              </span>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/50 text-zinc-500 bg-zinc-950/40">
                <th className="font-medium text-center w-8 py-2">#</th>
                <th className="font-medium text-left px-2 py-2">Đội tuyển</th>
                <th className="font-medium text-center w-8 py-2" title="Trận">Tr</th>
                <th className="font-medium text-center w-8 py-2" title="Hiệu số">HS</th>
                <th className="font-bold text-center w-10 py-2 text-zinc-300">Đ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {group.teams.map((t, idx) => {
                const localId = ESPN_TO_LOCAL[t.espnTeamId];
                const localTeam = localId ? localTeamsMap.get(localId) : null;
                const isTop2 = idx < 2; // Top 2 advance
                return (
                  <tr
                    key={t.espnTeamId}
                    className={`transition-colors hover:bg-zinc-800/30 ${
                      t.isLive ? "bg-rose-950/15" : isTop2 ? "bg-emerald-900/10" : ""
                    }`}
                  >
                    <td className={`text-center py-2 ${isTop2 ? "text-emerald-400 font-bold" : "text-zinc-500"}`}>
                      {t.rank || idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {localTeam ? (
                          <FlagIcon code={localTeam.code} size="sm" title={localTeam.name} />
                        ) : (
                          <div className="w-5 h-3.5 bg-zinc-800 rounded-sm"></div>
                        )}
                        <span className={`max-w-[120px] truncate font-semibold ${isTop2 ? "text-zinc-100" : "text-zinc-300"}`}>
                          {localTeam ? localTeam.name : t.teamName}
                        </span>
                        {t.isLive && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-rose-500"
                            title="Đang thi đấu"
                          />
                        )}
                      </div>
                    </td>
                    <td className="text-center text-zinc-400 py-2">{t.gamesPlayed}</td>
                    <td className="text-center text-zinc-400 py-2">{t.pointDifferential > 0 ? `+${t.pointDifferential}` : t.pointDifferential}</td>
                    <td className="text-center font-bold text-amber-400 py-2">{t.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      </div>
    </div>
  );
}
