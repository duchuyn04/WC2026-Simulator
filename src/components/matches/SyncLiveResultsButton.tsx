"use client";

import { useState } from "react";
import { seed } from "@/lib/data";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "@/lib/espn-match";
import { groupMatchToEntry } from "@/lib/schedule";
import { buildLiveGroupResults } from "@/lib/sync-live-results";
import { useSimulation } from "@/lib/store";
import { fetchTournamentStatsFromFifa } from "@/lib/tournament-stats-fetch";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce<Record<string, string>>(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {},
);

export function SyncLiveResultsButton() {
  const applyLiveResults = useSimulation((s) => s.applyLiveResults);
  const setTournamentStats = useSimulation((s) => s.setTournamentStats);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    let succeeded = false;
    try {
      // 1. Fetch and apply ESPN Scoreboard
      try {
        const response = await fetch(ESPN_SCOREBOARD_URL);
        if (response.ok) {
          const data = await response.json();
          const espnMatches = parseEspnScoreboard(data);
          const groupEntries = seed.groups.flatMap((group) =>
            group.matches.map((match, idx) => groupMatchToEntry(match, group.letter, {}, idx)),
          );
          const { updates } = buildLiveGroupResults(
            groupEntries,
            espnMatches,
            ESPN_TO_LOCAL,
          );
          applyLiveResults(updates);
          succeeded = true;
        }
      } catch (error) {
        console.warn("ESPN live sync failed:", error);
      }

      // 2. Fetch tournament stats
      try {
        const statsResponse = await fetch("/api/tournament-stats");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setTournamentStats(statsData);
          succeeded = true;
        } else {
          // Fallback
          const fallbackStats = await fetchTournamentStatsFromFifa();
          setTournamentStats(fallbackStats);
          succeeded = true;
        }
      } catch (statsError) {
        console.warn("Failed to fetch tournament stats, trying fallback:", statsError);
        try {
          const fallbackStats = await fetchTournamentStatsFromFifa();
          setTournamentStats(fallbackStats);
          succeeded = true;
        } catch (fallbackError) {
          console.error("Failed to fetch fallback tournament stats:", fallbackError);
        }
      }

      if (succeeded) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="sync-live-results"
      disabled={loading || isSuccess}
      onClick={handleSync}
      className="px-3 py-1.5 text-xs rounded-lg border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
    >
      {loading ? "Đang đồng bộ..." : isSuccess ? "Đã đồng bộ! ✓" : "Đồng bộ kết quả thật"}
    </button>
  );
}