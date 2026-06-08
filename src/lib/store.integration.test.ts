import { beforeEach, describe, it, expect, test } from "vitest";
import { useSimulation } from "./store";
import { seed } from "./data";
import { calculateGroupStandings } from "./fifa/standings";
import { getDependentKnockoutMatches } from "./fifa/knockout-sync";
import { resolveFullBracket } from "./fifa/__tests__/helpers/scenarios";

function resetStore() {
  useSimulation.setState({
    matchResults: {},
    manualOrder: {},
    groupInputMode: "scores",
    thirdPlaceOrder: null,
    knockoutWinners: {},
    knockoutSyncNotice: null,
    activeTab: "groups",
  });
}

describe("useSimulation store", () => {
  beforeEach(() => resetStore());

  it("setScore updates matchResults", () => {
    const group = seed.groups[0];
    const match = group.matches.find((m) => m.home && m.away)!;
    useSimulation.getState().setScore(match.id, 2, 1);
    expect(useSimulation.getState().matchResults[match.id]).toEqual({ home: 2, away: 1 });
  });

  it("setScore clears manual order for that group", () => {
    const group = seed.groups[0];
    useSimulation.getState().setManualOrder(group.letter, group.teams.map((t) => t.id));
    const match = group.matches.find((m) => m.home && m.away)!;
    useSimulation.getState().setScore(match.id, 1, 0);
    expect(useSimulation.getState().manualOrder[group.letter]).toBeNull();
  });

  it("setScore sets knockout sync notice instead of wiping all picks", () => {
    const group = seed.groups[0];
    const match = group.matches.find((m) => m.home && m.away)!;
    useSimulation.getState().setKnockoutWinner(79, group.teams[0].id);
    useSimulation.getState().setScore(match.id, 3, 0);
    const state = useSimulation.getState();
    expect(state.knockoutSyncNotice?.pending).toBe(true);
  });

  it("dismissKnockoutSyncNotice clears pending flag", () => {
    useSimulation.setState({
      knockoutSyncNotice: { pending: true, picksRemoved: 0 },
    });
    useSimulation.getState().dismissKnockoutSyncNotice();
    expect(useSimulation.getState().knockoutSyncNotice?.pending).toBe(false);
  });

  it("setKnockoutWinner cascades to dependent matches", () => {
    const deps = getDependentKnockoutMatches(73);
    const dep = [...deps][0] as number | undefined;
    expect(dep).toBeDefined();

    useSimulation.getState().setKnockoutWinner(73, seed.groups[0].teams[0].id);
    useSimulation.getState().setKnockoutWinner(dep!, seed.groups[1].teams[0].id);
    useSimulation.getState().setKnockoutWinner(73, null);
    expect(useSimulation.getState().knockoutWinners[dep!]).toBeUndefined();
  });

  it("resetAll clears everything", () => {
    useSimulation.getState().setScore("x", 1, 1);
    useSimulation.getState().setGroupInputMode("ranks");
    useSimulation.getState().resetAll();
    const s = useSimulation.getState();
    expect(s.matchResults).toEqual({});
    expect(s.knockoutWinners).toEqual({});
    expect(s.knockoutSyncNotice).toBeNull();
    expect(s.groupInputMode).toBe("scores");
  });

  it("đặt lại → thứ hạng → tỉ số không khôi phục BXH từ manualOrder", () => {
    const group = seed.groups[0];
    const match = group.matches.find((m) => m.home && m.away)!;
    useSimulation.getState().setScore(match.id, 3, 0);
    useSimulation.getState().resetAll();
    useSimulation.getState().setGroupInputMode("ranks");
    useSimulation.getState().setGroupInputMode("scores");

    const state = useSimulation.getState();
    expect(state.matchResults).toEqual({});
    expect(state.manualOrder[group.letter]).toBeUndefined();

    const standing = state.getGroupStandings().find((s) => s.letter === group.letter)!;
    const fromScores = calculateGroupStandings(group, {});
    expect(standing.ranked.map((r) => r.team.id)).toEqual(
      fromScores.ranked.map((r) => r.team.id)
    );
    expect(standing.first.points).toBe(0);
  });

  it("chuyển từ thứ hạng về tỉ số xóa manualOrder", () => {
    useSimulation.getState().setGroupInputMode("ranks");
    expect(Object.keys(useSimulation.getState().manualOrder).length).toBeGreaterThan(0);
    useSimulation.getState().setGroupInputMode("scores");
    expect(useSimulation.getState().manualOrder).toEqual({});
  });

  it("setGroupInputMode ranks seeds manual order for all groups", () => {
    useSimulation.getState().setGroupInputMode("ranks");
    const state = useSimulation.getState();
    expect(state.groupInputMode).toBe("ranks");
    for (const group of seed.groups) {
      expect(state.manualOrder[group.letter]).toHaveLength(4);
    }
    expect(state.thirdPlaceOrder).toHaveLength(12);
    expect(state.knockoutSyncNotice?.pending).toBe(true);
  });

  it("setThirdPlaceOrder reorders qualified teams", () => {
    useSimulation.getState().setGroupInputMode("ranks");
    const initial = useSimulation.getState().thirdPlaceOrder!;
    const reordered = [...initial.slice(1), initial[0]!];
    useSimulation.getState().setThirdPlaceOrder(reordered);
    const third = useSimulation.getState().getThirdPlace();
    expect(third.qualified[0]?.team.id).toBe(reordered[0]);
    expect(third.qualified).toHaveLength(8);
  });

  it("rank mode pick updates standings", () => {
    const group = seed.groups[0];
    useSimulation.getState().setGroupInputMode("ranks");
    const reversed = [...group.teams].reverse().map((t) => t.id);
    useSimulation.getState().setManualOrder(group.letter, reversed);
    const standing = useSimulation.getState().getGroupStandings().find((s) => s.letter === group.letter)!;
    expect(standing.first.team.id).toBe(reversed[0]);
    expect(standing.fourth.team.id).toBe(reversed[3]);
  });

  test.each(seed.groups.map((g) => g.letter))(
    "manual order for group %s updates knockout sync",
    (letter) => {
      resetStore();
      const group = seed.groups.find((g) => g.letter === letter)!;
      const ids = [...group.teams].reverse().map((t) => t.id);
      useSimulation.getState().setManualOrder(letter, ids);
      expect(useSimulation.getState().knockoutSyncNotice?.pending).toBe(true);
      const standings = useSimulation.getState().getGroupStandings();
      const standing = standings.find((s) => s.letter === letter)!;
      expect(standing.first.team.id).toBe(ids[0]);
    }
  );
});

describe("store → getKnockout", () => {
  beforeEach(() => resetStore());

  test.each(Array.from({ length: 12 }, (_, i) => i))(
    "scenario %i getKnockout returns all stages",
    (i) => {
      const group = seed.groups[i % 12];
      const match = group.matches.find((m) => m.home && m.away)!;
      useSimulation.getState().setScore(match.id, i % 3, (i + 1) % 3);
      const ko = useSimulation.getState().getKnockout();
      expect(ko.r32).toHaveLength(16);
      expect(ko.final).toHaveLength(1);
    }
  );

  it("getGroupStandings matches helper after scores", () => {
    const group = seed.groups[0];
    for (const m of group.matches) {
      if (!m.home || !m.away) continue;
      useSimulation.getState().setScore(m.id, 1, 0);
    }
    const fromStore = useSimulation.getState().getGroupStandings();
    const direct = calculateGroupStandings(group, useSimulation.getState().matchResults);
    expect(fromStore.find((s) => s.letter === "A")?.first.team.id).toBe(direct.first.team.id);
  });

  it("valid knockout pick survives unrelated group edit", () => {
    const standings = useSimulation.getState().getGroupStandings();
    const { resolved } = resolveFullBracket(standings);
    const m79 = resolved.find((m) => m.matchNumber === 79)!;
    if (!m79.resolvedHome?.team) return;
    useSimulation.getState().setKnockoutWinner(79, m79.resolvedHome.team.id);

    const groupB = seed.groups.find((g) => g.letter === "B")!;
    const matchB = groupB.matches.find((m) => m.home && m.away)!;
    useSimulation.getState().setScore(matchB.id, 2, 1);

    expect(useSimulation.getState().knockoutWinners[79]).toBe(m79.resolvedHome.team.id);
  });
});