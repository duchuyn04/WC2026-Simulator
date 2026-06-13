import { describe, expect, it } from "vitest";
import {
  aggregatePlayerStats,
  buildLeaderboards,
  getDataHubId,
  isCompletedMatch,
  matchesPlayerName,
  patchMatchPlayerStats,
  detailsOwnGoals,
} from "../../../scripts/lib/tournament-stats.mjs";

function rows(values: Record<string, number>) {
  return Object.entries(values).map(([name, value]) => [name, value, false]);
}

function match(
  teamId: string,
  teamName: string,
  code: string,
  players: Array<{ id: string; name: string; stats: Record<string, number> }>,
) {
  return {
    liveMatch: {
      HomeTeam: {
        IdTeam: teamId,
        Abbreviation: code,
        TeamName: [{ Locale: "en-GB", Description: teamName }],
        Players: players.map((player) => ({
          IdPlayer: player.id,
          PlayerName: [{ Locale: "en-GB", Description: player.name }],
          ShortName: [{ Locale: "en-GB", Description: player.name }],
          PlayerPicture: { PictureUrl: `https://example.com/${player.id}.png` },
        })),
      },
      AwayTeam: { Players: [] },
    },
    playerStats: Object.fromEntries(
      players.map((player) => [player.id, rows(player.stats)]),
    ),
  };
}

describe("isCompletedMatch", () => {
  it("accepts only matches with an official result and scores", () => {
    expect(
      isCompletedMatch({
        ResultType: 1,
        OfficialityStatus: 1,
        HomeTeamScore: 2,
        AwayTeamScore: 0,
      }),
    ).toBe(true);
    expect(
      isCompletedMatch({
        ResultType: 0,
        OfficialityStatus: 0,
        HomeTeamScore: null,
        AwayTeamScore: null,
      }),
    ).toBe(false);
    expect(
      isCompletedMatch({
        ResultType: 1,
        OfficialityStatus: 1,
        HomeTeamScore: null,
        AwayTeamScore: null,
      }),
    ).toBe(false);
  });
});

describe("detailsOwnGoals", () => {
  it("correctly identifies and deduplicates own goal events", () => {
    const rawDetails = [
      {
        clock: { value: 12 },
        scoringPlay: true,
        ownGoal: true,
        participants: [{ athlete: { displayName: "John Doe" } }]
      },
      {
        clock: { value: 12 },
        scoringPlay: true,
        type: { type: "own-goal" },
        participants: [{ athlete: { displayName: "John Doe" } }]
      },
      {
        clock: { value: 45 },
        scoringPlay: true,
        ownGoal: false,
        participants: [{ athlete: { displayName: "Jane Doe" } }]
      }
    ];
    expect(detailsOwnGoals(rawDetails)).toBe(1);
  });
});

describe("getDataHubId", () => {
  it("prefers live data, falls back to the calendar and reports missing IDs", () => {
    expect(
      getDataHubId(
        { Properties: { IdIFES: "calendar-id" } },
        { Properties: { IdIFES: "live-id" } },
      ),
    ).toBe("live-id");
    expect(
      getDataHubId({ Properties: { IdIFES: "calendar-id" } }, {}),
    ).toBe("calendar-id");
    expect(getDataHubId({}, {})).toBeNull();
  });
});

describe("aggregatePlayerStats", () => {
  it("combines the same player across matches and counts both red-card types", () => {
    const matches = [
      match("1", "Mexico", "MEX", [
        {
          id: "10",
          name: "Alex Player",
          stats: {
            Goals: 1,
            Assists: 2,
            Penalties: 1,
            PenaltiesScored: 1,
            YellowCards: 1,
            DirectRedCards: 1,
            OwnGoals: 1,
          },
        },
      ]),
      match("1", "Mexico", "MEX", [
        {
          id: "10",
          name: "Alex Player",
          stats: {
            Goals: 2,
            Assists: 1,
            Penalties: 2,
            PenaltiesScored: 1,
            YellowCards: 2,
            IndirectRedCards: 1,
            OwnGoals: 2,
          },
        },
      ]),
    ];

    expect(aggregatePlayerStats(matches)).toMatchObject([
      {
        playerId: "10",
        goals: 3,
        assists: 3,
        penalties: 3,
        penaltiesScored: 2,
        yellowCards: 3,
        redCards: 2,
        ownGoals: 3,
      },
    ]);
  });
});

describe("buildLeaderboards", () => {
  it("sorts by value, then name, limits results and calculates penalty rate", () => {
    const players = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      name: index === 0 ? "Zulu" : `Player ${String(index).padStart(2, "0")}`,
      stats: {
        Goals: index === 1 ? 5 : 1,
        Penalties: index === 0 ? 2 : 1,
        PenaltiesScored: index === 0 ? 1 : 0,
        OwnGoals: index === 2 ? 3 : 1,
      },
    }));

    const result = buildLeaderboards(
      [match("1", "Mexico", "MEX", players)],
      10,
    );

    expect(result.goals).toHaveLength(10);
    expect(result.goals[0]?.playerId).toBe("1");
    expect(result.goals[1]?.name).toBe("Player 02");
    expect(result.penalties[0]).toMatchObject({
      playerId: "0",
      value: 2,
      scored: 1,
      successRate: 50,
    });
    expect(result.ownGoals).toHaveLength(10);
    expect(result.ownGoals[0]?.playerId).toBe("2");
    expect(result.ownGoals[0]?.value).toBe(3);
  });

  it("keeps players from different teams separate", () => {
    const result = buildLeaderboards([
      match("1", "Mexico", "MEX", [
        { id: "10", name: "Player A", stats: { Goals: 1 } },
      ]),
      match("2", "Canada", "CAN", [
        { id: "20", name: "Player B", stats: { Goals: 2 } },
      ]),
    ]);

    expect(
      result.goals.map((leader: { team: { code: string } }) => leader.team.code),
    ).toEqual([
      "CAN",
      "MEX",
    ]);
  });

  it("ignores stat rows that cannot be mapped to a FIFA player", () => {
    const result = buildLeaderboards([
      {
        liveMatch: { HomeTeam: { Players: [] }, AwayTeam: { Players: [] } },
        playerStats: { unknown: rows({ Goals: 4 }) },
      },
    ]);

    expect(result.goals).toEqual([]);
  });
});

describe("matchesPlayerName", () => {
  it("should match names with initials and full names", () => {
    expect(matchesPlayerName("G. Reyna", "Giovanni REYNA")).toBe(true);
    expect(matchesPlayerName("Giovanni Reyna", "G. Reyna")).toBe(true);
    expect(matchesPlayerName("F. Balogun", "Folarin BALOGUN")).toBe(true);
    expect(matchesPlayerName("Maurício", "MAURICIO")).toBe(true);
    expect(matchesPlayerName("Alex Player", "Bob Player")).toBe(false);
  });
});

describe("patchMatchPlayerStats", () => {
  it("should patch missing goals from ESPN data", () => {
    const liveMatch = {
      HomeTeam: {
        IdTeam: "43921",
        Abbreviation: "USA",
        TeamName: [{ Locale: "en", Description: "USA" }],
        Players: [
          { IdPlayer: "419068", PlayerName: [{ Locale: "en", Description: "Giovanni REYNA" }] }
        ]
      },
      AwayTeam: { Players: [] }
    };
    const playerStats = {
      "419068": [["Goals", 0, false]]
    };

    const espnSummary = {
      header: {
        competitions: [{
          details: [
            {
              scoringPlay: true,
              ownGoal: false,
              team: { id: "660" },
              participants: [{ athlete: { displayName: "G. Reyna" } }]
            }
          ]
        }]
      }
    };

    patchMatchPlayerStats(
      liveMatch,
      playerStats,
      espnSummary,
      "43921",
      "660"
    );

    const reynaGoals = playerStats["419068"]?.find((row: any) => row[0] === "Goals")?.[1];
    expect(reynaGoals).toBe(1);
  });

  it("should patch missing own goals from ESPN data", () => {
    const liveMatch = {
      HomeTeam: {
        IdTeam: "1",
        Abbreviation: "MEX",
        TeamName: [{ Locale: "en-GB", Description: "Mexico" }],
        Players: [
          {
            IdPlayer: "10",
            PlayerName: [{ Locale: "en-GB", Description: "Alex Player" }],
            ShortName: [{ Locale: "en-GB", Description: "Alex Player" }],
          }
        ]
      },
      AwayTeam: {
        IdTeam: "2",
        Abbreviation: "USA",
        TeamName: [{ Locale: "en-GB", Description: "USA" }],
        Players: []
      }
    };

    const playerStats = {};
    const espnSummary = {
      header: {
        competitions: [
          {
            details: [
              {
                scoringPlay: true,
                ownGoal: true,
                team: { id: "2" }, // Conceded by USA's opponent (Mexico), so team: "2" got the goal.
                participants: [
                  {
                    athlete: { displayName: "Alex Player" }
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    // Patch Mexico's stats (fifaTeamId = "1", espnTeamId = "1")
    patchMatchPlayerStats(liveMatch, playerStats, espnSummary, "1", "1");

    expect(playerStats["10"]).toBeDefined();
    expect(playerStats["10"].find((r: any) => r[0] === "OwnGoals")[1]).toBe(1);
  });

  it("should deduplicate events to avoid double counting", () => {
    const liveMatch = {
      HomeTeam: {
        IdTeam: "1",
        Abbreviation: "MEX",
        TeamName: [{ Locale: "en-GB", Description: "Mexico" }],
        Players: [
          {
            IdPlayer: "10",
            PlayerName: [{ Locale: "en-GB", Description: "Alex Player" }],
            ShortName: [{ Locale: "en-GB", Description: "Alex Player" }],
          }
        ]
      },
      AwayTeam: {
        IdTeam: "2",
        Abbreviation: "USA",
        TeamName: [{ Locale: "en-GB", Description: "USA" }],
        Players: []
      }
    };

    const playerStats = {};
    const espnSummary = {
      header: {
        competitions: [
          {
            details: [
              {
                clock: { value: 45, displayValue: "45'" },
                scoringPlay: true,
                ownGoal: true,
                team: { id: "2" },
                participants: [
                  {
                    athlete: { displayName: "Alex Player" }
                  }
                ]
              }
            ]
          }
        ]
      },
      keyEvents: [
        {
          clock: { value: 45, displayValue: "45'" },
          scoringPlay: true,
          type: { type: "own-goal" },
          team: { id: "2" },
          participants: [
            {
              athlete: { displayName: "Alex Player" }
            }
          ]
        }
      ]
    };

    patchMatchPlayerStats(liveMatch, playerStats, espnSummary, "1", "1");

    expect(playerStats["10"]).toBeDefined();
    expect(playerStats["10"].find((r: any) => r[0] === "OwnGoals")[1]).toBe(1); // Should only count as 1 due to deduplication
  });
});


