import { useEffect, useState } from "react";
import { seed } from "./data";
import { ESPN_TEAM_MAP } from "./espn-mapping";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "./espn-match";
import { groupMatchToEntry } from "./schedule";
import { buildLiveGroupResults } from "./sync-live-results";
import { useSimulation } from "./store";
import { fetchTournamentStatsFromFifa } from "./tournament-stats-fetch";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce<Record<string, string>>(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {},
);

export function useLiveSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const applyLiveResults = useSimulation((s) => s.applyLiveResults);
  const setTournamentStats = useSimulation((s) => s.setTournamentStats);

  useEffect(() => {
    let active = true;

    const performSync = async () => {
      if (document.visibilityState !== "visible") return;

      if (active) setIsSyncing(true);
      try {
        // 1. Fetch and apply ESPN Scoreboard
        try {
          const response = await fetch(ESPN_SCOREBOARD_URL);
          if (response.ok) {
            const data = await response.json();
            const espnMatches = parseEspnScoreboard(data);
            const groupEntries = seed.groups.flatMap((group) =>
              group.matches.map((match, idx) =>
                groupMatchToEntry(match, group.letter, {}, idx)
              )
            );
            const { updates } = buildLiveGroupResults(
              groupEntries,
              espnMatches,
              ESPN_TO_LOCAL
            );
            if (active) applyLiveResults(updates);
          }
        } catch (error) {
          console.warn("Background sync: Failed to fetch ESPN scoreboard", error);
        }

        // 2. Fetch tournament stats
        try {
          const statsResponse = await fetch("/api/tournament-stats");
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (active) setTournamentStats(statsData);
          } else {
            // Fallback
            const fallbackStats = await fetchTournamentStatsFromFifa();
            if (active) setTournamentStats(fallbackStats);
          }
        } catch {
          // Fallback
          try {
            const fallbackStats = await fetchTournamentStatsFromFifa();
            if (active) setTournamentStats(fallbackStats);
          } catch (fallbackError) {
            console.warn("Background sync: Failed to fetch fallback tournament stats", fallbackError);
          }
        }
      } finally {
        if (active) setIsSyncing(false);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        performSync();
      }
    };

    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    // Run on mount
    performSync();

    const interval = setInterval(performSync, 60000);
    return () => {
      active = false;
      clearInterval(interval);
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [applyLiveResults, setTournamentStats]);

  return { isSyncing };
}
