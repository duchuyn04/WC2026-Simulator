"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulation } from "./store";
import { calculateGroupStandings, buildStandingsFromOrder } from "./fifa/standings";
import { rankThirdPlaceTeams } from "./fifa/third-place";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { seed } from "./data";
import { buildScheduleEntries } from "./schedule";
import type { GroupStanding, MatchResult, Team } from "./fifa/types";

function computeStandings(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>
): GroupStanding[] {
  return seed.groups.map((group) => {
    const manual = manualOrder[group.letter];
    if (manual) {
      const teams = manual
        .map((id) => group.teams.find((t) => t.id === id))
        .filter((t): t is Team => !!t);
      if (teams.length === 4) return buildStandingsFromOrder(group, teams);
    }
    return calculateGroupStandings(group, matchResults);
  });
}

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
  return useMemo(() => rankThirdPlaceTeams(standings), [standings]);
}

function useResolvedKnockoutMatches() {
  const standings = useGroupStandings();
  const knockoutWinners = useSimulation((s) => s.knockoutWinners);

  return useMemo(() => {
    const third = rankThirdPlaceTeams(standings);
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
  }, [standings, knockoutWinners]);
}

export function useKnockout() {
  const resolved = useResolvedKnockoutMatches();
  return useMemo(() => getMatchesByStage(resolved), [resolved]);
}

export function useSchedule() {
  const matchResults = useSimulation((s) => s.matchResults);
  const resolved = useResolvedKnockoutMatches();
  return useMemo(
    () => buildScheduleEntries(matchResults, resolved),
    [matchResults, resolved]
  );
}
