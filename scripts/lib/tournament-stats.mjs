const METRIC_KEYS = {
  goals: "Goals",
  assists: "Assists",
  penalties: "Penalties",
  penaltiesScored: "PenaltiesScored",
  yellowCards: "YellowCards",
  directRedCards: "DirectRedCards",
  indirectRedCards: "IndirectRedCards",
};

export function pickLocalizedName(values, fallback = "") {
  if (!Array.isArray(values)) return fallback;
  return (
    values.find((value) => value?.Locale === "en-GB")?.Description ??
    values.find((value) => value?.Description)?.Description ??
    fallback
  );
}

export function isCompletedMatch(match) {
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

export function getDataHubId(calendarMatch, liveMatch) {
  const value =
    liveMatch?.Properties?.IdIFES ?? calendarMatch?.Properties?.IdIFES;
  return value ? String(value) : null;
}

function statValue(rows, name) {
  const row = Array.isArray(rows) ? rows.find((item) => item?.[0] === name) : null;
  const value = Number(row?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function mapTeam(team) {
  if (!team?.IdTeam) return null;
  return {
    id: String(team.IdTeam),
    name: pickLocalizedName(team.TeamName, team.ShortClubName ?? team.Abbreviation ?? ""),
    code: team.Abbreviation ?? team.IdCountry ?? "",
    flagUrl: team.Abbreviation ? `/flags/${team.Abbreviation}.png` : null,
  };
}

function buildPlayerDirectory(liveMatch) {
  const directory = new Map();

  for (const team of [liveMatch?.HomeTeam, liveMatch?.AwayTeam]) {
    const teamInfo = mapTeam(team);
    for (const player of team?.Players ?? []) {
      if (!player?.IdPlayer) continue;
      directory.set(String(player.IdPlayer), {
        playerId: String(player.IdPlayer),
        name: pickLocalizedName(player.PlayerName, `Player ${player.IdPlayer}`),
        shortName: pickLocalizedName(player.ShortName, ""),
        pictureUrl: player.PlayerPicture?.PictureUrl ?? null,
        team: teamInfo,
      });
    }
  }

  return directory;
}

function createPlayerTotal(player) {
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

export function aggregatePlayerStats(matches) {
  const totals = new Map();

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

function compareLeaders(metric, secondaryMetric) {
  return (left, right) => {
    const metricDifference = right[metric] - left[metric];
    if (metricDifference !== 0) return metricDifference;

    if (secondaryMetric) {
      const secondaryDifference = right[secondaryMetric] - left[secondaryMetric];
      if (secondaryDifference !== 0) return secondaryDifference;
    }

    return left.name.localeCompare(right.name, "en");
  };
}

function leaderboard(players, metric, limit = 10, secondaryMetric) {
  return players
    .filter((player) => player[metric] > 0)
    .sort(compareLeaders(metric, secondaryMetric))
    .slice(0, limit)
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      shortName: player.shortName,
      pictureUrl: player.pictureUrl,
      team: player.team,
      value: player[metric],
    }));
}

export function buildLeaderboards(matches, limit = 10) {
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

export function matchesPlayerName(nameA, nameB) {
  if (!nameA || !nameB) return false;

  const normalize = (str) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const normA = normalize(nameA);
  const normB = normalize(nameB);

  if (normA === normB) return true;

  const wordsA = normA.split(/\s+/).filter(w => w.length > 0);
  const wordsB = normB.split(/\s+/).filter(w => w.length > 0);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  if (wordsA.length === 1) {
    return wordsB.includes(wordsA[0]);
  }
  if (wordsB.length === 1) {
    return wordsA.includes(wordsB[0]);
  }

  if (wordsA.length === 2 && wordsA[0].length === 1) {
    return wordsB.length >= 2 && wordsB[0].startsWith(wordsA[0]) && wordsB[wordsB.length - 1] === wordsA[1];
  }
  if (wordsB.length === 2 && wordsB[0].length === 1) {
    return wordsA.length >= 2 && wordsA[0].startsWith(wordsB[0]) && wordsA[wordsA.length - 1] === wordsB[1];
  }

  const lastA = wordsA[wordsA.length - 1];
  const lastB = wordsB[wordsB.length - 1];
  if (lastA === lastB) {
    const firstA = wordsA[0];
    const firstB = wordsB[0];
    if (firstA === firstB) return true;
    if (firstA.length === 1 && firstB.startsWith(firstA)) return true;
    if (firstB.length === 1 && firstA.startsWith(firstB)) return true;
    return false;
  }

  return false;
}

