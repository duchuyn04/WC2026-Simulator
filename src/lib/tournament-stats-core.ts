const METRIC_KEYS = {
  goals: "Goals",
  assists: "Assists",
  penalties: "Penalties",
  penaltiesScored: "PenaltiesScored",
  yellowCards: "YellowCards",
  directRedCards: "DirectRedCards",
  indirectRedCards: "IndirectRedCards",
} as const;

type LocalizedText = { Locale?: string; Description?: string };

export function pickLocalizedName(values: LocalizedText[] | undefined, fallback = "") {
  if (!Array.isArray(values)) return fallback;
  return (
    values.find((value) => value?.Locale === "en-GB")?.Description ??
    values.find((value) => value?.Description)?.Description ??
    fallback
  );
}

export function isCompletedMatch(match: {
  ResultType?: number;
  OfficialityStatus?: number;
  HomeTeamScore?: number | string | null;
  AwayTeamScore?: number | string | null;
}) {
  return (
    Number(match?.ResultType) > 0 &&
    Number(match?.OfficialityStatus) === 1 &&
    match?.HomeTeamScore !== null &&
    match?.HomeTeamScore !== undefined &&
    match?.AwayTeamScore !== null &&
    match?.AwayTeamScore !== undefined &&
    Number.isFinite(Number(match?.HomeTeamScore)) &&
    Number.isFinite(Number(match?.AwayTeamScore))
  );
}

export function getDataHubId(
  calendarMatch: { Properties?: { IdIFES?: string | number } },
  liveMatch: { Properties?: { IdIFES?: string | number } },
) {
  const value = liveMatch?.Properties?.IdIFES ?? calendarMatch?.Properties?.IdIFES;
  return value ? String(value) : null;
}

function statValue(rows: unknown, name: string) {
  const list = Array.isArray(rows) ? rows : [];
  const row = list.find((item) => Array.isArray(item) && item[0] === name);
  const value = Number((row as [string, number] | undefined)?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function mapTeam(team: {
  IdTeam?: string | number;
  TeamName?: LocalizedText[];
  ShortClubName?: string;
  Abbreviation?: string;
  IdCountry?: string;
} | null | undefined) {
  if (!team?.IdTeam) return null;
  return {
    id: String(team.IdTeam),
    name: pickLocalizedName(team.TeamName, team.ShortClubName ?? team.Abbreviation ?? ""),
    code: team.Abbreviation ?? team.IdCountry ?? "",
    flagUrl: team.Abbreviation ? `/flags/${team.Abbreviation}.png` : null,
  };
}

type PlayerTotal = {
  playerId: string;
  name: string;
  shortName: string;
  pictureUrl: string | null;
  team: ReturnType<typeof mapTeam>;
  goals: number;
  assists: number;
  penalties: number;
  penaltiesScored: number;
  yellowCards: number;
  redCards: number;
};

function buildPlayerDirectory(liveMatch: {
  HomeTeam?: { Players?: Array<Record<string, unknown>> } & Record<string, unknown>;
  AwayTeam?: { Players?: Array<Record<string, unknown>> } & Record<string, unknown>;
}) {
  const directory = new Map<string, Omit<PlayerTotal, "goals" | "assists" | "penalties" | "penaltiesScored" | "yellowCards" | "redCards">>();

  for (const team of [liveMatch?.HomeTeam, liveMatch?.AwayTeam]) {
    const teamInfo = mapTeam(team as Parameters<typeof mapTeam>[0]);
    for (const player of team?.Players ?? []) {
      const id = player?.IdPlayer;
      if (!id) continue;
      directory.set(String(id), {
        playerId: String(id),
        name: pickLocalizedName(
          player.PlayerName as LocalizedText[] | undefined,
          `Player ${String(id)}`,
        ),
        shortName: pickLocalizedName(player.ShortName as LocalizedText[] | undefined, ""),
        pictureUrl: (player.PlayerPicture as { PictureUrl?: string } | undefined)?.PictureUrl ?? null,
        team: teamInfo,
      });
    }
  }

  return directory;
}

function createPlayerTotal(
  player: Omit<PlayerTotal, "goals" | "assists" | "penalties" | "penaltiesScored" | "yellowCards" | "redCards">,
): PlayerTotal {
  return {
    ...player,
    goals: 0,
    assists: 0,
    penalties: 0,
    penaltiesScored: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

export function aggregatePlayerStats(
  matches: Array<{
    liveMatch: Parameters<typeof buildPlayerDirectory>[0];
    playerStats?: Record<string, unknown>;
  }>,
) {
  const totals = new Map<string, PlayerTotal>();

  for (const match of matches) {
    const directory = buildPlayerDirectory(match.liveMatch);

    for (const [playerId, rows] of Object.entries(match.playerStats ?? {})) {
      const player = directory.get(String(playerId));
      if (!player) continue;

      const total = totals.get(player.playerId) ?? createPlayerTotal(player);
      total.goals += statValue(rows, METRIC_KEYS.goals);
      total.assists += statValue(rows, METRIC_KEYS.assists);
      total.penalties += statValue(rows, METRIC_KEYS.penalties);
      total.penaltiesScored += statValue(rows, METRIC_KEYS.penaltiesScored);
      total.yellowCards += statValue(rows, METRIC_KEYS.yellowCards);
      total.redCards +=
        statValue(rows, METRIC_KEYS.directRedCards) +
        statValue(rows, METRIC_KEYS.indirectRedCards);
      totals.set(player.playerId, total);
    }
  }

  return [...totals.values()];
}

function compareLeaders(metric: keyof PlayerTotal, secondaryMetric?: keyof PlayerTotal) {
  return (left: PlayerTotal, right: PlayerTotal) => {
    const metricDifference = Number(right[metric]) - Number(left[metric]);
    if (metricDifference !== 0) return metricDifference;

    if (secondaryMetric) {
      const secondaryDifference = Number(right[secondaryMetric]) - Number(left[secondaryMetric]);
      if (secondaryDifference !== 0) return secondaryDifference;
    }

    return left.name.localeCompare(right.name, "en");
  };
}

function leaderboard(
  players: PlayerTotal[],
  metric: keyof PlayerTotal,
  limit = 10,
  secondaryMetric?: keyof PlayerTotal,
) {
  return players
    .filter((player) => Number(player[metric]) > 0)
    .sort(compareLeaders(metric, secondaryMetric))
    .slice(0, limit)
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      shortName: player.shortName,
      pictureUrl: player.pictureUrl,
      team: player.team,
      value: Number(player[metric]),
    }));
}

export function buildLeaderboards(
  matches: Array<{
    liveMatch: Parameters<typeof buildPlayerDirectory>[0];
    playerStats?: Record<string, unknown>;
  }>,
  limit = 10,
) {
  const players = aggregatePlayerStats(matches);
  const penalties = players
    .filter((player) => player.penalties > 0)
    .sort(compareLeaders("penalties", "penaltiesScored"))
    .slice(0, limit)
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      shortName: player.shortName,
      pictureUrl: player.pictureUrl,
      team: player.team,
      value: player.penalties,
      scored: player.penaltiesScored,
      successRate:
        player.penalties > 0
          ? Math.round((player.penaltiesScored / player.penalties) * 100)
          : 0,
    }));

  return {
    goals: leaderboard(players, "goals", limit),
    assists: leaderboard(players, "assists", limit),
    penalties,
    yellowCards: leaderboard(players, "yellowCards", limit),
    redCards: leaderboard(players, "redCards", limit),
  };
}

export const TOURNAMENT_STATS_SEASON_ID = "285023";
export const TOURNAMENT_STATS_CALENDAR_URL = `https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=${TOURNAMENT_STATS_SEASON_ID}`;
export const TOURNAMENT_STATS_POLL_MS = 5 * 60 * 1000;
/** Slower poll when fetching directly from FIFA in the browser (GitHub Pages). */
export const TOURNAMENT_STATS_CLIENT_POLL_MS = 30 * 60 * 1000;