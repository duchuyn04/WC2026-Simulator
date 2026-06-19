// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEspnLiveScores } from "../use-espn-live-scores";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useEspnLiveScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useEspnLiveScores());
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("returns empty array when API returns no events", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [] }),
    });
    const { result } = renderHook(() => useEspnLiveScores());
    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });

  it("parses ESPN response into EspnScoreboardMatch[]", async () => {
    const mockResponse = {
      events: [
        {
          id: "123",
          date: "2025-06-17T20:00:00Z",
          competitions: [
            {
              status: {
                displayClock: "45:00",
                type: { name: "STATUS_HALFTIME", state: "in", shortDetail: "HT" },
              },
              competitors: [
                { homeAway: "home", score: "2", team: { id: "arg" } },
                { homeAway: "away", score: "1", team: { id: "bra" } },
              ],
            },
          ],
        },
      ],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });
    const { result } = renderHook(() => useEspnLiveScores());
    await waitFor(() => {
      expect(result.current).toHaveLength(1);
      expect(result.current[0].id).toBe("123");
      expect(result.current[0].homeScore).toBe("2");
      expect(result.current[0].awayScore).toBe("1");
      expect(result.current[0].state).toBe("in");
    });
  });
});
