import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock React module first
vi.mock("react", () => {
  return {
    useState: vi.fn(),
    useEffect: vi.fn(),
  };
});

// Import React hooks and target modules
import { useState, useEffect } from "react";
import { useLiveSync } from "../use-live-sync";
import { useSimulation } from "../store";
import { fetchTournamentStatsFromFifa } from "../tournament-stats-fetch";

if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    visibilityState: "visible",
  };
}

const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

const mockApplyLiveResults = vi.fn();
const mockSetTournamentStats = vi.fn();

vi.mock("../store", () => ({
  useSimulation: vi.fn((selector) => {
    const state = {
      applyLiveResults: mockApplyLiveResults,
      setTournamentStats: mockSetTournamentStats,
    };
    return selector(state);
  }),
}));

vi.mock("../tournament-stats-fetch", () => ({
  fetchTournamentStatsFromFifa: vi.fn(),
}));

describe("useLiveSync", () => {
  let mockSetState: any;
  let effectCallback: (() => any) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).document.visibilityState = "visible";

    mockSetState = vi.fn();
    vi.mocked(useState as any).mockImplementation((init: any) => {
      return [init, mockSetState];
    });

    effectCallback = null;
    vi.mocked(useEffect).mockImplementation((cb: any) => {
      effectCallback = cb;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should register effect and define a 60s interval", async () => {
    useLiveSync();

    expect(useEffect).toHaveBeenCalled();
    expect(effectCallback).toBeTypeOf("function");

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    });

    const spySetInterval = vi.spyOn(globalThis, "setInterval").mockImplementation(() => 123 as any);
    const spyClearInterval = vi.spyOn(globalThis, "clearInterval").mockImplementation(() => {});

    // Execute effect callback
    const cleanup = effectCallback!();

    // Sleep to let the async performSync run
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockFetch).toHaveBeenCalled();
    expect(spySetInterval).toHaveBeenCalledWith(expect.any(Function), 60000);

    if (cleanup) cleanup();
    expect(spyClearInterval).toHaveBeenCalledWith(123);
  });

  it("should not perform sync if document is hidden", async () => {
    (globalThis as any).document.visibilityState = "hidden";
    mockFetch.mockReset();

    useLiveSync();
    effectCallback!();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should fallback to fetchTournamentStatsFromFifa when API fails", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("scoreboard")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ events: [] }),
        });
      }
      if (url.includes("/api/tournament-stats")) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    const mockFallbackStats = { leaderboards: { goals: [] }, fetchedAt: "fallback-time" };
    vi.mocked(fetchTournamentStatsFromFifa).mockResolvedValue(mockFallbackStats as any);

    useLiveSync();
    
    effectCallback!();

    // Sleep to let performSync's promise chain proceed
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchTournamentStatsFromFifa).toHaveBeenCalled();
    expect(mockSetTournamentStats).toHaveBeenCalledWith(mockFallbackStats);
  });
});
