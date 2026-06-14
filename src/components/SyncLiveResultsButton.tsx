"use client";

import { useState } from "react";
import { seed } from "@/lib/data";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard } from "@/lib/espn-match";
import { groupMatchToEntry } from "@/lib/schedule";
import { buildLiveGroupResults } from "@/lib/sync-live-results";
import { useSimulation } from "@/lib/store";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce<Record<string, string>>(
  (acc, [localId, espnId]) => {
    acc[espnId] = localId;
    return acc;
  },
  {},
);

export function SyncLiveResultsButton() {
  const applyLiveResults = useSimulation((s) => s.applyLiveResults);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch(ESPN_SCOREBOARD_URL);
      if (!response.ok) throw new Error("ESPN unavailable");

      const data = await response.json();
      const espnMatches = parseEspnScoreboard(data);
      const groupEntries = seed.groups.flatMap((group) =>
        group.matches.map((match) => groupMatchToEntry(match, group.letter, {})),
      );
      const { updates, finishedCount, liveCount } = buildLiveGroupResults(
        groupEntries,
        espnMatches,
        ESPN_TO_LOCAL,
      );

      const totalCount = finishedCount + liveCount;
      if (totalCount === 0) {
        window.alert("Chưa có trận vòng bảng nào kết thúc hoặc đang diễn ra trên ESPN.");
        return;
      }

      let message = "";
      if (finishedCount > 0 && liveCount > 0) {
        message = `Áp dụng ${totalCount} kết quả thật (${finishedCount} trận đã kết thúc, ${liveCount} trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
      } else if (finishedCount > 0) {
        message = `Áp dụng ${finishedCount} kết quả thật (trận đã kết thúc) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
      } else {
        message = `Áp dụng ${liveCount} kết quả thật (trận đang diễn ra) vào mô phỏng? Tỉ số hiện tại của các trận này sẽ bị ghi đè.`;
      }

      const confirmed = window.confirm(message);
      if (!confirmed) return;

      applyLiveResults(updates);
    } catch {
      window.alert("Không thể tải kết quả từ ESPN. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="sync-live-results"
      disabled={loading}
      onClick={handleSync}
      className="px-3 py-1.5 text-xs rounded-lg border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
    >
      {loading ? "Đang tải..." : "Đồng bộ kết quả thật"}
    </button>
  );
}