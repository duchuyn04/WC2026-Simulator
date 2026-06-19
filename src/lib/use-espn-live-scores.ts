"use client";

import { useEffect, useState } from "react";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard, type EspnScoreboardMatch } from "./espn-match";

export function useEspnLiveScores(): EspnScoreboardMatch[] {
  const [matches, setMatches] = useState<EspnScoreboardMatch[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchScores = async () => {
      try {
        const res = await fetch(ESPN_SCOREBOARD_URL);
        if (!res.ok) return;
        const data = await res.json();
        const parsedMatches = parseEspnScoreboard(data);
        if (mounted && parsedMatches.length > 0) {
          setMatches(parsedMatches);
        }
      } catch {
        // Keep UI usable when ESPN is temporarily unavailable
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return matches;
}
