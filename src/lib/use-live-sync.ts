import { useEffect, useState } from "react";
import { useSimulation } from "./store";
import { fetchTournamentStatsFromFifa } from "./tournament-stats-fetch";


export function useLiveSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const setTournamentStats = useSimulation((s) => s.setTournamentStats);

  useEffect(() => {
    let active = true;

    const performSync = async () => {
      if (document.visibilityState !== "visible") return;

      if (active) setIsSyncing(true);
      try {
        // Chỉ tự động cập nhật thống kê cầu thủ (vua phá lưới, kiến tạo...).
        // BXH mô phỏng chỉ được cập nhật khi người dùng bấm nút "Đồng bộ kết quả thật".
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
  }, [setTournamentStats]);

  return { isSyncing };
}
