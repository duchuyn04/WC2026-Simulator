"use client";

import { useEffect, useMemo, useState } from "react";
import { useSimulation } from "./store";
import { computeStandings } from "./compute-standings";
import { rankThirdPlaceTeams } from "./fifa/third-place";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { seed } from "./data";
import { buildScheduleEntries } from "./schedule";
import { fetchTeamSquadFromFifa } from "./fifa-squads-fetch";
import { ESPN_SCOREBOARD_URL, parseEspnScoreboard, type EspnScoreboardMatch } from "./espn-match";
import { ESPN_TEAM_MAP } from "./espn-mapping";
import {
  applyLiveMatchesToStandings,
  ESPN_STANDINGS_URL,
  espnGroupsToGroupStandings,
  parseEspnStandings,
} from "./espn-standings";
import type { GroupStanding, ResolvedKnockoutMatch, Team } from "./fifa/types";

const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce((acc, [localId, espnId]) => {
  acc[espnId] = localId;
  return acc;
}, {} as Record<string, string>);

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
    return resolveKnockoutMatches(
      standings,
      knockoutWinners,
      groupInputMode === "ranks" ? thirdPlaceOrder : null
    );
  }, [standings, knockoutWinners, groupInputMode, thirdPlaceOrder]);
}

export function useKnockout() {
  const resolved = useResolvedKnockoutMatches();
  return useMemo(() => getMatchesByStage(resolved), [resolved]);
}

function unresolvedKnockoutMatches(): ResolvedKnockoutMatch[] {
  return seed.knockout.map((match) => ({
    ...match,
    resolvedHome: null,
    resolvedAway: null,
    winner: null,
  }));
}

function resolveKnockoutMatches(
  standings: GroupStanding[],
  knockoutWinners: Record<number, string>,
  thirdPlaceOrder: string[] | null = null
) {
  const third = thirdPlaceOrder
    ? rankThirdPlaceTeams(standings, thirdPlaceOrder)
    : rankThirdPlaceTeams(standings);
  const winners: Record<number, Team> = {};
  const losers: Record<number, Team> = {};
  const allTeams = new Map(seed.groups.flatMap((group) => group.teams.map((team) => [team.id, team])));

  for (const [num, teamId] of Object.entries(knockoutWinners)) {
    const team = allTeams.get(teamId);
    if (team) winners[Number(num)] = team;
  }

  return resolveKnockoutBracket(seed.knockout, standings, third.qualifyingGroups, winners, losers);
}

function sameKickoff(left?: string, right?: string) {
  if (!left || !right) return false;
  return new Date(left).getTime() === new Date(right).getTime();
}

function hasKickedOff(value?: string) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) && time <= Date.now();
}

function realKnockoutWinners(
  standings: GroupStanding[],
  espnMatches: EspnScoreboardMatch[]
) {
  const winners: Record<number, string> = {};

  for (let pass = 0; pass < seed.knockout.length; pass++) {
    let changed = false;
    for (const match of resolveKnockoutMatches(standings, winners)) {
      if (winners[match.matchNumber] || !match.resolvedHome || !match.resolvedAway) continue;

      const espn = espnMatches.find((candidate) => {
        const homeId = candidate.homeId ? ESPN_TO_LOCAL[candidate.homeId] : undefined;
        const awayId = candidate.awayId ? ESPN_TO_LOCAL[candidate.awayId] : undefined;
        return (
          candidate.state === "post" &&
          hasKickedOff(candidate.date) &&
          sameKickoff(candidate.date, match.date) &&
          homeId === match.resolvedHome?.team.id &&
          awayId === match.resolvedAway?.team.id
        );
      });
      const winnerId = espn?.winnerId ? ESPN_TO_LOCAL[espn.winnerId] : undefined;
      if (winnerId) {
        winners[match.matchNumber] = winnerId;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return winners;
}

function useRealTournamentData() {
  const [data, setData] = useState<{
    standings: GroupStanding[];
    espnMatches: EspnScoreboardMatch[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStandings = async () => {
      try {
        const [standingsResponse, scoreboardResponse] = await Promise.all([
          fetch(ESPN_STANDINGS_URL),
          fetch(ESPN_SCOREBOARD_URL),
        ]);
        if (!standingsResponse.ok || !scoreboardResponse.ok) return;

        const [standingsData, scoreboardData] = await Promise.all([
          standingsResponse.json(),
          scoreboardResponse.json(),
        ]);
        const espnMatches = parseEspnScoreboard(scoreboardData);
        const realStandings = espnGroupsToGroupStandings(
          applyLiveMatchesToStandings(parseEspnStandings(standingsData), espnMatches)
        );

        if (mounted && realStandings.length === seed.groups.length) {
          setData({ standings: realStandings, espnMatches });
        }
      } catch {
        // Keep placeholders when ESPN is unavailable.
      }
    };

    fetchStandings();
    const interval = setInterval(fetchStandings, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return data;
}

export function useSchedule() {
  // "Khớp thực tế": base dates/venues/placeholders/stages for all 104 entries come from seed inside buildScheduleEntries.
  // scheduleMockResults: separate from simulator matchResults so mocking in Lịch thi đấu does not affect Mô phỏng.
  const scheduleMockResults = useSimulation((s) => s.scheduleMockResults);
  const realData = useRealTournamentData();
  return useMemo(() => {
    return buildScheduleEntries(
      scheduleMockResults,
      realData
        ? resolveKnockoutMatches(
            realData.standings,
            realKnockoutWinners(realData.standings, realData.espnMatches)
          )
        : unresolvedKnockoutMatches()
    );
  }, [scheduleMockResults, realData]);
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
