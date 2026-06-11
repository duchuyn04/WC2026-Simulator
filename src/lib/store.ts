"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { resolveKnockoutBracket, getMatchesByStage } from "./fifa/bracket";
import { calculateGroupStandings } from "./fifa/standings";
import { computeStandings } from "./compute-standings";
import { rankThirdPlaceTeams, seedThirdPlaceOrder } from "./fifa/third-place";
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

export type GroupInputMode = "scores" | "ranks";

type SimulationStore = {
  matchResults: Record<string, MatchResult>;
  manualOrder: Record<string, string[] | null>;
  groupInputMode: GroupInputMode;
  thirdPlaceOrder: string[] | null;
  knockoutWinners: Record<number, string>;
  knockoutSyncNotice: KnockoutSyncNotice | null;
  activeTab: TabId;
  scrollPositions: ScrollPositions;
  bracketView: BracketView;
  favoriteMatches: string[];
  favoriteTeams: string[];
  setActiveTab: (tab: TabId) => void;
  setScrollPosition: (tab: ScrollableTabId, y: number) => void;
  setBracketView: (view: BracketView) => void;
  setGroupInputMode: (mode: GroupInputMode) => void;
  setThirdPlaceOrder: (teamIds: string[]) => void;
  clearThirdPlaceOrder: () => void;
  dismissKnockoutSyncNotice: () => void;
  toggleFavoriteMatch: (matchId: string) => void;
  toggleFavoriteTeam: (teamId: string) => void;
  setScore: (matchId: string, home?: number | null, away?: number | null) => void;
  setManualOrder: (group: string, teamIds: string[]) => void;
  clearManualOrder: (group: string) => void;
  setKnockoutWinner: (matchNumber: number, teamId: string | null) => void;
  resetAll: () => void;
  getGroupStandings: () => GroupStanding[];
  getThirdPlace: () => ReturnType<typeof rankThirdPlaceTeams>;
  getKnockout: () => ReturnType<typeof getMatchesByStage>;
};

function seedManualOrdersFromStandings(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>
): Record<string, string[] | null> {
  const next = { ...manualOrder };
  for (const group of seed.groups) {
    if (next[group.letter]) continue;
    const standing = calculateGroupStandings(group, matchResults);
    next[group.letter] = standing.ranked.map((row) => row.team.id);
  }
  return next;
}

function resolveThirdPlaceForStore(
  standings: GroupStanding[],
  groupInputMode: GroupInputMode,
  thirdPlaceOrder: string[] | null
) {
  if (groupInputMode === "ranks" && thirdPlaceOrder) {
    return rankThirdPlaceTeams(standings, thirdPlaceOrder);
  }
  return rankThirdPlaceTeams(standings);
}

function syncKnockoutFromGroups(
  matchResults: Record<string, MatchResult>,
  manualOrder: Record<string, string[] | null>,
  knockoutWinners: Record<number, string>,
  groupInputMode: GroupInputMode = "scores",
  thirdPlaceOrder: string[] | null = null
) {
  const { winners, removedCount } = pruneKnockoutWinners(
    matchResults,
    manualOrder,
    knockoutWinners,
    groupInputMode === "ranks" ? thirdPlaceOrder : null
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
      groupInputMode: "scores",
      thirdPlaceOrder: null,
      knockoutWinners: {},
      knockoutSyncNotice: null,
      favoriteMatches: [],
      favoriteTeams: [],
      activeTab: "groups",
      scrollPositions: { groups: 0, schedule: 0, "fav-matches": 0, "fav-teams": 0, third: 0 },
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

      setGroupInputMode: (mode) =>
        set((s) => {
          if (mode === s.groupInputMode) return {};
          if (mode === "ranks") {
            const manualOrder = seedManualOrdersFromStandings(s.matchResults, s.manualOrder);
            const standings = computeStandings(s.matchResults, manualOrder);
            const thirdPlaceOrder = seedThirdPlaceOrder(standings);
            return {
              groupInputMode: mode,
              manualOrder,
              thirdPlaceOrder,
              ...syncKnockoutFromGroups(
                s.matchResults,
                manualOrder,
                s.knockoutWinners,
                "ranks",
                thirdPlaceOrder
              ),
            };
          }
          return {
            groupInputMode: mode,
            thirdPlaceOrder: null,
            manualOrder: s.groupInputMode === "ranks" ? {} : s.manualOrder,
          };
        }),

      setThirdPlaceOrder: (teamIds) =>
        set((s) => ({
          thirdPlaceOrder: teamIds,
          ...syncKnockoutFromGroups(
            s.matchResults,
            s.manualOrder,
            s.knockoutWinners,
            s.groupInputMode,
            teamIds
          ),
        })),

      clearThirdPlaceOrder: () =>
        set((s) => {
          const standings = computeStandings(s.matchResults, s.manualOrder);
          const thirdPlaceOrder = seedThirdPlaceOrder(standings);
          return {
            thirdPlaceOrder,
            ...syncKnockoutFromGroups(
              s.matchResults,
              s.manualOrder,
              s.knockoutWinners,
              s.groupInputMode,
              thirdPlaceOrder
            ),
          };
        }),

      dismissKnockoutSyncNotice: () =>
        set((s) =>
          s.knockoutSyncNotice
            ? { knockoutSyncNotice: { ...s.knockoutSyncNotice, pending: false } }
            : {}
        ),

      toggleFavoriteMatch: (matchId) =>
        set((s) => ({
          favoriteMatches: s.favoriteMatches.includes(matchId)
            ? s.favoriteMatches.filter((id) => id !== matchId)
            : [...s.favoriteMatches, matchId],
        })),

      toggleFavoriteTeam: (teamId) =>
        set((s) => ({
          favoriteTeams: s.favoriteTeams.includes(teamId)
            ? s.favoriteTeams.filter((id) => id !== teamId)
            : [...s.favoriteTeams, teamId],
        })),

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
            ...syncKnockoutFromGroups(
              matchResults,
              manualOrder,
              s.knockoutWinners,
              s.groupInputMode,
              s.thirdPlaceOrder
            ),
          };
        }),

      setManualOrder: (group, teamIds) =>
        set((s) => {
          const manualOrder = { ...s.manualOrder, [group]: teamIds };
          return {
            manualOrder,
            ...syncKnockoutFromGroups(
              s.matchResults,
              manualOrder,
              s.knockoutWinners,
              s.groupInputMode,
              s.thirdPlaceOrder
            ),
          };
        }),

      clearManualOrder: (group) =>
        set((s) => {
          const manualOrder = { ...s.manualOrder, [group]: null };
          return {
            manualOrder,
            ...syncKnockoutFromGroups(
              s.matchResults,
              manualOrder,
              s.knockoutWinners,
              s.groupInputMode,
              s.thirdPlaceOrder
            ),
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
          groupInputMode: "scores",
          thirdPlaceOrder: null,
          knockoutWinners: {},
          knockoutSyncNotice: null,
          favoriteMatches: [],
          favoriteTeams: [],
          scrollPositions: { groups: 0, schedule: 0, "fav-matches": 0, "fav-teams": 0, third: 0 },
          bracketView: { userZoom: 1, pan: { x: 0, y: 0 } },
          activeTab: "groups",
        }),

      getGroupStandings: () => computeStandings(get().matchResults, get().manualOrder),

      getThirdPlace: () => {
        const state = get();
        return resolveThirdPlaceForStore(
          state.getGroupStandings(),
          state.groupInputMode,
          state.thirdPlaceOrder
        );
      },

      getKnockout: () => {
        const state = get();
        const standings = state.getGroupStandings();
        const third = resolveThirdPlaceForStore(
          standings,
          state.groupInputMode,
          state.thirdPlaceOrder
        );
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
        groupInputMode: state.groupInputMode,
        thirdPlaceOrder: state.thirdPlaceOrder,
        knockoutWinners: state.knockoutWinners,
        favoriteMatches: state.favoriteMatches,
        favoriteTeams: state.favoriteTeams,
        activeTab: state.activeTab,
        scrollPositions: state.scrollPositions,
        bracketView: state.bracketView,
      }),
    }
  )
);
