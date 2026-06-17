import { describe, expect, it, vi } from "vitest";
import { fetchTeamSquadFromFifa, normalizeSquadPlayer } from "../fifa-squads-fetch";

const mockFetch = vi.fn();
(globalThis as unknown as Record<string, unknown>).fetch = mockFetch;

describe("normalizeSquadPlayer", () => {
  it("maps FIFA API player to local shape", () => {
    const input = {
      IdPlayer: "403001",
      PlayerName: [{ Locale: "en-GB", Description: "DIOGO COSTA" }],
      ShortName: [{ Locale: "en-GB", Description: "D. COSTA" }],
      JerseyNum: 1,
      PositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
      RealPositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
      BirthDate: "1999-09-19T00:00:00Z",
      Height: 188,
      Weight: 86,
      IdCountry: "POR",
      PlayerPicture: {
        Id: "7C3541E5-A8CB-458C-B3687F57C1B5AE03",
        PictureUrl: "https://digitalhub.fifa.com/transform/7c3541e5-a8cb-458c-b368-7f57c1b5ae03/DIOGO-COSTA_403001",
      },
    };

    const result = normalizeSquadPlayer(input);
    expect(result.id).toBe("403001");
    expect(result.name).toBe("DIOGO COSTA");
    expect(result.pictureUrl).toBe("https://digitalhub.fifa.com/transform/7c3541e5-a8cb-458c-b368-7f57c1b5ae03/DIOGO-COSTA_403001");
    expect(result.pictureSource).toBe("fifa");
  });

  it("returns null pictureUrl when FIFA has no image", () => {
    const input = {
      IdPlayer: "999999",
      PlayerName: [{ Locale: "en-GB", Description: "NO IMAGE" }],
      ShortName: [{ Locale: "en-GB", Description: "NO IMAGE" }],
      JerseyNum: 99,
      PositionLocalized: [{ Locale: "en-GB", Description: "Forward" }],
      RealPositionLocalized: [{ Locale: "en-GB", Description: "Forward" }],
      BirthDate: "2000-01-01T00:00:00Z",
      Height: 180,
      Weight: 75,
      IdCountry: "ARG",
      PlayerPicture: null,
    };

    const result = normalizeSquadPlayer(input);
    expect(result.pictureUrl).toBeNull();
    expect(result.pictureSource).toBeNull();
  });
});

describe("fetchTeamSquadFromFifa", () => {
  it("returns normalized players on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          Players: [
            {
              IdPlayer: "403001",
              PlayerName: [{ Locale: "en-GB", Description: "DIOGO COSTA" }],
              ShortName: [{ Locale: "en-GB", Description: "D. COSTA" }],
              JerseyNum: 1,
              PositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
              RealPositionLocalized: [{ Locale: "en-GB", Description: "Goalkeeper" }],
              BirthDate: "1999-09-19T00:00:00Z",
              Height: 188,
              Weight: 86,
              IdCountry: "POR",
              PlayerPicture: {
                PictureUrl: "https://example.com/diogo.png",
              },
            },
          ],
        }),
    });

    const players = await fetchTeamSquadFromFifa("43963");
    expect(players).toHaveLength(1);
    expect(players?.[0].id).toBe("403001");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.fifa.com/api/v3/teams/43963/squad?idCompetition=17&idSeason=285023&language=en",
      { headers: { Accept: "application/json" } }
    );
  });

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const players = await fetchTeamSquadFromFifa("43963");
    expect(players).toBeNull();
  });
});
