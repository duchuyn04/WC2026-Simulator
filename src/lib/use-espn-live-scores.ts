"use client";

import { useEffect, useState } from "react";
import {
  ESPN_SCOREBOARD_URL,
  parseEspnScoreboard,
  type EspnScoreboardMatch,
} from "./espn-match";

export function useEspnLiveScores(): {
  matches: EspnScoreboardMatch[];
  loading: boolean;
} {
  const [matches, setMatches] = useState<EspnScoreboardMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchScores = async () => {
      try {
        const url = new URL(ESPN_SCOREBOARD_URL);
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const parsedMatches = parseEspnScoreboard(data);
        if (mounted) {
          setMatches(parsedMatches);
          setLoading(false);
        }
      } catch {
        // Keep UI usable when ESPN is temporarily unavailable
        if (mounted) setLoading(false);
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { matches, loading };
}
