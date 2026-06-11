"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulation } from "./store";
import { computeStandings } from "./compute-standings";
import { rankThirdPlaceTeams } from "./fifa/third-place";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { seed } from "./data";
import { buildScheduleEntries } from "./schedule";
import type { GroupStanding, MatchResult, Team } from "./fifa/types";

/** Chờ localStorage hydrate xong trước khi render UI (tránh nhảy về tab đầu). */
export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useSimulation.persist;
    if (!api) {
      setHydrated(true);
      return;
    }
    const unsub = api.onFinishHydration(() => setHydrated(true));
    if (api.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  return hydrated;
}

export function useGroupStandings() {
  const matchResults = useSimulation((s) => s.matchResults);
  const manualOrder = useSimulation((s) => s.manualOrder);
  return useMemo(
    () => computeStandings(matchResults, manualOrder),
    [matchResults, manualOrder]
  );
}

export function useThirdPlace() {
  const standings = useGroupStandings();
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const thirdPlaceOrder = useSimulation((s) => s.thirdPlaceOrder);

  return useMemo(() => {
    if (groupInputMode === "ranks" && thirdPlaceOrder) {
      return rankThirdPlaceTeams(standings, thirdPlaceOrder);
    }
    return rankThirdPlaceTeams(standings);
  }, [standings, groupInputMode, thirdPlaceOrder]);
}

function useResolvedKnockoutMatches() {
  const standings = useGroupStandings();
  const knockoutWinners = useSimulation((s) => s.knockoutWinners);
  const groupInputMode = useSimulation((s) => s.groupInputMode);
  const thirdPlaceOrder = useSimulation((s) => s.thirdPlaceOrder);

  return useMemo(() => {
    const third =
      groupInputMode === "ranks" && thirdPlaceOrder
        ? rankThirdPlaceTeams(standings, thirdPlaceOrder)
        : rankThirdPlaceTeams(standings);
    const winners: Record<number, Team> = {};
    const losers: Record<number, Team> = {};
    const allTeams = new Map<string, Team>();
    for (const g of seed.groups) {
      for (const t of g.teams) allTeams.set(t.id, t);
    }
    for (const [num, teamId] of Object.entries(knockoutWinners)) {
      const team = allTeams.get(teamId);
      if (team) winners[Number(num)] = team;
    }
    return resolveKnockoutBracket(
      seed.knockout,
      standings,
      third.qualifyingGroups,
      winners,
      losers
    );
  }, [standings, knockoutWinners, groupInputMode, thirdPlaceOrder]);
}

export function useKnockout() {
  const resolved = useResolvedKnockoutMatches();
  return useMemo(() => getMatchesByStage(resolved), [resolved]);
}

export function useSchedule() {
  // "Khớp thực tế": base dates/venues/placeholders/stages for all 104 entries come from seed inside buildScheduleEntries.
  // scheduleMockResults: separate from simulator matchResults so mocking in Lịch thi đấu does not affect Mô phỏng.
  const scheduleMockResults = useSimulation((s) => s.scheduleMockResults);
  return useMemo(() => {
    const actualKnockout = seed.knockout.map((m) => ({
      ...m,
      resolvedHome: m.home ? { team: m.home, label: m.placeholderA } : null,
      resolvedAway: m.away ? { team: m.away, label: m.placeholderB } : null,
      winner: null,
    }));
    return buildScheduleEntries(scheduleMockResults, actualKnockout);
  }, [scheduleMockResults]);
}