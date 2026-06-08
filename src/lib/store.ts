"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { calculateGroupStandings, buildStandingsFromOrder } from "./fifa/standings";
import { rankThirdPlaceTeams } from "./fifa/third-place";
import {
  getDependentKnockoutMatches,
  pruneKnockoutWinners,
} from "./fifa/knockout-sync";
import { seed } from "./data";
import type { ScrollableTabId, TabId } from "./tabs";
import type { GroupStanding, MatchResult, Team } from "./fifa/types";

export type KnockoutSyncNotice = {
  pending: boolean;
  picksRemoved: number;
};

export type ScrollPositions = Record<ScrollableTabId, number>;

export type BracketView = {
  userZoom: number;
  pan: { x: number; y: number };
};

type SimulationStore = {
  matchResults: Record<string, MatchResult>;
  manualOrder: Record<string, string[] | null>;
  knockoutWinners: Record<number, string>;
  knockoutSyncNotice: KnockoutSyncNotice | null;
  activeTab: TabId;
  scrollPositions: ScrollPositions;
  bracketView: BracketView;
  setActiveTab: (tab: TabId) => void;
  setScrollPosition: (tab: ScrollableTabId, y: number) => void;
  setBracketView: (view: BracketView) => void;
  dismissKnockoutSyncNotice: () => void;
  setScore: (matchId: string, home?: number | null, away?: number | null) => void;
  setManualOrder: (group: string, teamIds: string[]) => void;
  clearManualOrder: (group: string) => void;
  setKnockoutWinner: (matchNumber: number, teamId: string | null) => void;
  resetAll: () => void;
  getGroupStandings: () => GroupStanding[];
  getThirdPlace: () => ReturnType<typeof rankThirdPlaceTeams>;
  getKnockout: () => ReturnType<typeof getMatchesByStage>;
};

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

function syncKnockoutFromGroups(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>,
  knockoutWinners: Record<number, string>
) {
  const { winners, removedCount } = pruneKnockoutWinners(
    matchResults,
    manualOrder,
    knockoutWinners
  );
  return {
    knockoutWinners: winners,
    knockoutSyncNotice: { pending: true, picksRemoved: removedCount } satisfies KnockoutSyncNotice,
  };
}

export const useSimulation = create<SimulationStore>()(
  persist(
    (set, get) => ({
      matchResults: {},
      manualOrder: {},
      knockoutWinners: {},
      knockoutSyncNotice: null,
      activeTab: "groups",
      scrollPositions: { groups: 0, schedule: 0, third: 0 },
      bracketView: { userZoom: 1, pan: { x: 0, y: 0 } },

      setActiveTab: (tab) =>
        set((s) => {
          const scrollPositions = { ...s.scrollPositions };
          if (
            typeof window !== "undefined" &&
            (s.activeTab === "groups" || s.activeTab === "schedule" || s.activeTab === "third")
          ) {
            scrollPositions[s.activeTab] = window.scrollY;
          }
          return { activeTab: tab, scrollPositions };
        }),

      setScrollPosition: (tab, y) =>
        set((s) => ({
          scrollPositions: { ...s.scrollPositions, [tab]: y },
        })),

      setBracketView: (view) => set({ bracketView: view }),

      dismissKnockoutSyncNotice: () =>
        set((s) =>
          s.knockoutSyncNotice
            ? { knockoutSyncNotice: { ...s.knockoutSyncNotice, pending: false } }
            : {}
        ),

      setScore: (matchId, home, away) =>
        set((s) => {
          const groupLetter = seed.groups.find((g) =>
            g.matches.some((m) => m.id === matchId)
          )?.letter;
          const manualOrder = { ...s.manualOrder };
          if (groupLetter) manualOrder[groupLetter] = null;

          const prev = s.matchResults[matchId] ?? {};
          const next: MatchResult = { ...prev };
          if (home !== undefined) {
            if (home === null) delete next.home;
            else next.home = home;
          }
          if (away !== undefined) {
            if (away === null) delete next.away;
            else next.away = away;
          }

          const matchResults = { ...s.matchResults };
          if (next.home === undefined && next.away === undefined) {
            delete matchResults[matchId];
          } else {
            matchResults[matchId] = next;
          }

          return {
            matchResults,
            manualOrder,
            ...syncKnockoutFromGroups(matchResults, manualOrder, s.knockoutWinners),
          };
        }),

      setManualOrder: (group, teamIds) =>
        set((s) => {
          const manualOrder = { ...s.manualOrder, [group]: teamIds };
          return {
            manualOrder,
            ...syncKnockoutFromGroups(s.matchResults, manualOrder, s.knockoutWinners),
          };
        }),

      clearManualOrder: (group) =>
        set((s) => {
          const manualOrder = { ...s.manualOrder, [group]: null };
          return {
            manualOrder,
            ...syncKnockoutFromGroups(s.matchResults, manualOrder, s.knockoutWinners),
          };
        }),

      setKnockoutWinner: (matchNumber, teamId) =>
        set((s) => {
          const knockoutWinners = { ...s.knockoutWinners };
          if (teamId) knockoutWinners[matchNumber] = teamId;
          else delete knockoutWinners[matchNumber];
          for (const dependent of getDependentKnockoutMatches(matchNumber)) {
            delete knockoutWinners[dependent];
          }
          return { knockoutWinners };
        }),

      resetAll: () =>
        set({
          matchResults: {},
          manualOrder: {},
          knockoutWinners: {},
          knockoutSyncNotice: null,
          scrollPositions: { groups: 0, schedule: 0, third: 0 },
          bracketView: { userZoom: 1, pan: { x: 0, y: 0 } },
          activeTab: "groups",
        }),

      getGroupStandings: () => computeStandings(get().matchResults, get().manualOrder),

      getThirdPlace: () => rankThirdPlaceTeams(get().getGroupStandings()),

      getKnockout: () => {
        const standings = get().getGroupStandings();
        const third = rankThirdPlaceTeams(standings);
        const winners: Record<number, Team> = {};
        const losers: Record<number, Team> = {};

        for (const [num, teamId] of Object.entries(get().knockoutWinners)) {
          const match = seed.knockout.find((m) => m.matchNumber === Number(num));
          if (!match) continue;
          const allTeams = new Map<string, Team>();
          for (const g of seed.groups) {
            for (const t of g.teams) allTeams.set(t.id, t);
          }
          const team = allTeams.get(teamId);
          if (team) winners[Number(num)] = team;
        }

        const resolved = resolveKnockoutBracket(
          seed.knockout,
          standings,
          third.qualifyingGroups,
          winners,
          losers
        );
        return getMatchesByStage(resolved);
      },
    }),
    {
      name: "wc2026-simulation",
      partialize: (state) => ({
        matchResults: state.matchResults,
        manualOrder: state.manualOrder,
        knockoutWinners: state.knockoutWinners,
        activeTab: state.activeTab,
        scrollPositions: state.scrollPositions,
        bracketView: state.bracketView,
      }),
    }
  )
);
