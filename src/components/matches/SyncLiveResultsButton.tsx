"use client";

import { useState } from "react";
import { seed } from "@/lib/data";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "@/lib/espn-match";
import { groupMatchToEntry } from "@/lib/schedule";
import { buildLiveGroupResults, buildFairPlayFromEspn } from "@/lib/sync-live-results";
import { useSimulation } from "@/lib/store";
import { fetchTournamentStatsFromFifa } from "@/lib/tournament-stats-fetch";
import type { FairPlayData } from "@/lib/fifa/types";

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
    try {
      const response = await fetch(ESPN_SCOREBOARD_URL);
      if (response.ok) {
        const data = await response.json();
        const espnMatches = parseEspnScoreboard(data);
        const groupEntries = seed.groups.flatMap((group) =>
          group.matches.map((match, idx) => groupMatchToEntry(match, group.letter, {}, idx)),
        );

        // 1. Apply scores immediately
        const { updates } = buildLiveGroupResults(groupEntries, espnMatches, ESPN_TO_LOCAL);

        // 2. Fetch fair play then apply scores + fair play atomically
        let fairPlay: Record<string, FairPlayData> = {};
        try {
          fairPlay = await buildFairPlayFromEspn(groupEntries, espnMatches, ESPN_TO_LOCAL);
        } catch (err) {
          console.warn("Fair play sync failed:", err);
        }
        applyLiveResults(updates, Object.keys(fairPlay).length > 0 ? fairPlay : undefined);
      }
    } catch (error) {
      console.warn("ESPN live sync failed:", error);
    }

    // 3. Fetch tournament stats (fire-and-forget)
    Promise.allSettled([
      fetch("/api/tournament-stats").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetchTournamentStatsFromFifa(),
    ]).then(([apiResult, fallbackResult]) => {
      const data =
        apiResult.status === "fulfilled" ? apiResult.value : fallbackResult.status === "fulfilled" ? fallbackResult.value : null;
      if (data) setTournamentStats(data);
    }).catch(() => {});

    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
    setLoading(false);
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
