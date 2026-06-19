import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("react", () => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
}));

import { useState, useEffect } from "react";
import { useLiveSquadSync } from "../hooks";
import { fetchTeamSquadFromFifa } from "../fifa-squads-fetch";

vi.mock("../fifa-squads-fetch");

if (typeof globalThis.document === "undefined") {
  (globalThis as unknown as Record<string, unknown>).document = {
    visibilityState: "visible",
  };
}

async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

describe("useLiveSquadSync", () => {
  let mockSetState: ReturnType<typeof vi.fn>;
  let effectCallback: (() => void | (() => void)) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetState = vi.fn();

    vi.mocked(useState as any).mockImplementation((init: unknown) => [init, mockSetState]);
    vi.mocked(useEffect).mockImplementation((cb: any) => {
      effectCallback = cb;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseTeam = {
    id: "43963",
    squad: [
      {
        id: "403001",
        name: "DIOGO COSTA",
        jerseyNumber: 1,
        pictureUrl: "old-url",
        pictureSource: "fifa" as const,
      },
    ],
  };

  it("does nothing when static data is fresh", () => {
    const freshDate = new Date().toISOString();
    useLiveSquadSync(baseTeam, freshDate);
    effectCallback?.();
    expect(fetchTeamSquadFromFifa).not.toHaveBeenCalled();
  });

  it("fetches fresh squad when static data is stale", async () => {
    vi.mocked(fetchTeamSquadFromFifa).mockResolvedValue([
      {
        id: "403001",
        name: "DIOGO COSTA",
        shortName: null,
        jerseyNumber: 1,
        position: "Goalkeeper",
        realPosition: "Goalkeeper",
        birthDate: null,
        heightCm: null,
        weightKg: null,
        countryCode: "POR",
        pictureUrl: "new-url",
        pictureSource: "fifa" as const,
      },
    ]);

    useLiveSquadSync(baseTeam, "2026-06-15T00:00:00Z");
    effectCallback?.();

    await flushPromises();

    expect(fetchTeamSquadFromFifa).toHaveBeenCalledWith("43963");
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
  });
});
