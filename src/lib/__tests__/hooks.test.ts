// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSchedule } from "../hooks";
import { useSimulation } from "../store";

function resetStore() {
  useSimulation.setState({
    matchResults: {},
    manualOrder: {},
    groupInputMode: "scores",
    thirdPlaceOrder: null,
    knockoutWinners: {},
    scheduleMockResults: {},
  });
}

describe("useSchedule", () => {
  beforeEach(() => resetStore());

  it("uses resolved knockout teams", () => {
    const { result } = renderHook(() => useSchedule());
    const match73 = result.current.find((entry) => entry.matchNumber === 73);

    expect(match73?.home?.name).not.toBe("2A");
    expect(match73?.away?.name).not.toBe("2B");
    expect(match73?.home).toBeTruthy();
    expect(match73?.away).toBeTruthy();
  });
});
