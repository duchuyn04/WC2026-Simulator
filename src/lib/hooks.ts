"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulation } from "./store";
import { computeStandings } from "./compute-standings";
import { rankThirdPlaceTeams } from "./fifa/third-place";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { seed } from "./data";
import { buildScheduleEntries } from "./schedule";
import { fetchTeamSquadFromFifa } from "./fifa-squads-fetch";
import type { Team } from "./fifa/types";

/** Chờ localStorage hydrate xong trước khi render UI (tránh nhảy về tab đầu). */
export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const api = useSimulation.persist;
    if (!api) {
      Promise.resolve().then(() => setHydrated(true));
      return;
    }
    const unsub = api.onFinishHydration(() => setHydrated(true));
    if (api.hasHydrated()) {
      Promise.resolve().then(() => setHydrated(true));
    }
    return unsub;
  }, []);

  return hydrated;
}

export function useGroupStandings() {
  const matchResults = useSimulation((s) => s.matchResults);
  const manualOrder = useSimulation((s) => s.manualOrder);
  const fairPlayData = useSimulation((s) => s.fairPlayData);
  return useMemo(
    () => computeStandings(matchResults, manualOrder, fairPlayData),
    [matchResults, manualOrder, fairPlayData]
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
  const knockoutMatches = useResolvedKnockoutMatches();
  return useMemo(() => {
    return buildScheduleEntries(scheduleMockResults, knockoutMatches);
  }, [scheduleMockResults, knockoutMatches]);
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function useLiveSquadSync<
  T extends {
    id: string;
    pictureUrl?: string | null;
    jerseyNumber?: number | null;
    position?: string | null;
    realPosition?: string | null;
  }
>(team: { id: string; squad: T[] }, staticFetchedAt: string | null): T[] {
  const [liveSquad, setLiveSquad] = useState<T[] | null>(null);

  useEffect(() => {
    const fetchedAtTime = staticFetchedAt ? new Date(staticFetchedAt).getTime() : 0;
    const now = Date.now();
    const isStale = now - fetchedAtTime > TWENTY_FOUR_HOURS_MS;

    if (!isStale) return;

    let active = true;
    fetchTeamSquadFromFifa(team.id).then((freshPlayers) => {
      if (!active || !freshPlayers || freshPlayers.length === 0) return;

      setLiveSquad((current) => {
        if (current) return current;

        const merged = team.squad.map((player) => {
          const fresh =
            freshPlayers.find((p) => p.id === player.id) ??
            freshPlayers.find((p) => p.jerseyNumber === player.jerseyNumber);
          if (!fresh || !fresh.pictureUrl) return player;
          return { ...player, pictureUrl: fresh.pictureUrl, pictureSource: "fifa" } as T;
        });
        return merged;
      });
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, staticFetchedAt]);

  return liveSquad ?? team.squad;
}
