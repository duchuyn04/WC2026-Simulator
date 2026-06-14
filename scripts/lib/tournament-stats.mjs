const METRIC_KEYS = {
  goals: "Goals",
  assists: "Assists",
  penalties: "Penalties",
  penaltiesScored: "PenaltiesScored",
  yellowCards: "YellowCards",
  directRedCards: "DirectRedCards",
  indirectRedCards: "IndirectRedCards",
  ownGoals: "OwnGoals",
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

export function isLiveOrCompletedMatch(match) {
  const status = Number(match?.OfficialityStatus);
  if (status === 2) {
    return true;
  }
  const hasScores =
    match?.HomeTeamScore !== null &&
    match?.HomeTeamScore !== undefined &&
    match?.AwayTeamScore !== null &&
    match?.AwayTeamScore !== undefined &&
    Number.isFinite(Number(match?.HomeTeamScore)) &&
    Number.isFinite(Number(match?.AwayTeamScore));
  return status === 1 && hasScores;
}

export function detailsOwnGoals(rawDetails) {
  if (!Array.isArray(rawDetails)) return 0;
  const seenEvents = new Set();
  let count = 0;
  for (const event of rawDetails) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
    const isOwnGoal = event.ownGoal === true || event.type?.type === "own-goal";
    const rawClock = String(event.clock?.value ?? event.clock?.displayValue ?? "");
    const clock = event.clock?.value ? String(Math.floor(Number(event.clock.value) / 60)) : rawClock.replace(/[^0-9]/g, "");
    const type = isOwnGoal ? "ownGoal" : "goal";
    const key = `${clock}-${athleteName}-${type}`;
    if (event.scoringPlay && isOwnGoal && !seenEvents.has(key)) {
      seenEvents.add(key);
      count++;
    }
  }
  return count;
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
    ownGoals: 0,
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
      total.ownGoals += statValue(rows, METRIC_KEYS.ownGoals);
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
    ownGoals: leaderboard(players, "ownGoals", limit),
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

export function patchMatchPlayerStats(
  liveMatch,
  playerStats,
  espnSummary,
  fifaTeamId,
  espnTeamId
) {
  const rawDetails = [
    ...(espnSummary?.header?.competitions?.[0]?.details ?? []),
    ...(espnSummary?.keyEvents ?? [])
  ];

  const seenEvents = new Set();
  const details = [];
  for (const event of rawDetails) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
    const isOwnGoal = event.ownGoal === true || event.type?.type === "own-goal";
    const rawClock = String(event.clock?.value ?? event.clock?.displayValue ?? "");
    const clock = event.clock?.value ? String(Math.floor(Number(event.clock.value) / 60)) : rawClock.replace(/[^0-9]/g, "");
    
    // Determine event type category for safer deduplication
    let eventType = "other";
    if (event.yellowCard === true || event.type?.type === "yellow-card") {
      eventType = "yellowCard";
    } else if (event.redCard === true || event.type?.type === "red-card" || event.type?.type === "direct-red-card" || event.type?.type === "indirect-red-card") {
      eventType = "redCard";
    } else if (event.type?.type === "assist") {
      eventType = "assist";
    } else if (event.penaltyKick === true || event.type?.type === "penalty-kick" || event.type?.type === "penalty-goal") {
      eventType = "penalty";
    } else if (event.scoringPlay === true) {
      eventType = isOwnGoal ? "ownGoal" : "goal";
    } else if (event.type?.type) {
      eventType = event.type.type;
    }

    const key = `${clock}-${athleteName}-${eventType}`;
    if (!seenEvents.has(key)) {
      seenEvents.add(key);
      details.push(event);
    }
  }

  // Retrieve players of this team in liveMatch
  const teamPlayers =
    String(liveMatch?.HomeTeam?.IdTeam) === fifaTeamId
      ? (liveMatch?.HomeTeam?.Players ?? [])
      : String(liveMatch?.AwayTeam?.IdTeam) === fifaTeamId
      ? (liveMatch?.AwayTeam?.Players ?? [])
      : [];

  const goalMinutesByPlayer = new Map();

  const countsByName = {};

  const getOrCreateCountObj = (name) => {
    if (!countsByName[name]) {
      countsByName[name] = {
        Goals: 0,
        Assists: 0,
        YellowCards: 0,
        DirectRedCards: 0,
        Penalties: 0,
        PenaltiesScored: 0,
        OwnGoals: 0,
      };
    }
    return countsByName[name];
  };

  for (const event of details) {
    const athleteName = event.participants?.[0]?.athlete?.displayName ?? event.participants?.[0]?.athlete?.shortName ?? "";
    if (!athleteName) continue;

    const isOwnGoal = event.ownGoal === true || event.type?.type === "own-goal";
    const teamId = event.team?.id ? String(event.team.id) : "";
    const isOurTeam = teamId === espnTeamId;

    if (event.scoringPlay) {
      if (isOwnGoal) {
        // Own goal conceded by the opponent (so opponent's team got the goal credited on scoreboard,
        // which means the teamId on the own-goal scoring event is the opponent team)
        if (teamId && !isOurTeam) {
          const counts = getOrCreateCountObj(athleteName);
          counts.OwnGoals++;
        }
      } else {
        // Regular goal
        if (isOurTeam) {
          const counts = getOrCreateCountObj(athleteName);
          const rawClock = String(event.clock?.value ?? event.clock?.displayValue ?? "");
          const clock = event.clock?.value ? String(Math.floor(Number(event.clock.value) / 60)) : rawClock.replace(/[^0-9]/g, "");
          
          let minutesSet = goalMinutesByPlayer.get(athleteName);
          if (!minutesSet) {
            minutesSet = new Set();
            goalMinutesByPlayer.set(athleteName, minutesSet);
          }
          
          if (!minutesSet.has(clock)) {
            counts.Goals++;
            minutesSet.add(clock);
          }
        }
      }
    }

    // Assists
    const isAssist = event.type?.type === "assist" || event.type?.text?.toLowerCase() === "assist";
    if (isAssist && isOurTeam) {
      const counts = getOrCreateCountObj(athleteName);
      counts.Assists++;
    }

    // Yellow Cards
    const isYellowCard = event.yellowCard === true || event.type?.type === "yellow-card" || event.type?.text?.toLowerCase().includes("yellow card");
    if (isYellowCard && isOurTeam) {
      const counts = getOrCreateCountObj(athleteName);
      counts.YellowCards++;
    }

    // Red Cards
    const isRedCard = event.redCard === true || event.type?.type === "red-card" || event.type?.type === "direct-red-card" || event.type?.type === "indirect-red-card" || event.type?.text?.toLowerCase().includes("red card");
    if (isRedCard && isOurTeam) {
      const counts = getOrCreateCountObj(athleteName);
      counts.DirectRedCards++;
    }

    // Penalties
    const isPenalty = event.penaltyKick === true || event.type?.type === "penalty-kick" || event.type?.type === "penalty-goal" || event.type?.text?.toLowerCase().includes("penalty");
    if (isPenalty && isOurTeam) {
      const counts = getOrCreateCountObj(athleteName);
      counts.Penalties++;
      if (event.scoringPlay && !isOwnGoal) {
        counts.PenaltiesScored++;
      }
    }
  }

  for (const [espnName, counts] of Object.entries(countsByName)) {
    // Match player
    const matchedPlayer = teamPlayers.find((p) => {
      const pName = p.PlayerName?.[0]?.Description ?? p.ShortName?.[0]?.Description ?? "";
      return matchesPlayerName(espnName, pName);
    });

    if (matchedPlayer) {
      const playerId = String(matchedPlayer.IdPlayer);
      let statsRows = playerStats[playerId];
      if (!statsRows) {
        statsRows = [];
        playerStats[playerId] = statsRows;
      }

      for (const [metricKey, countVal] of Object.entries(counts)) {
        if (countVal === 0) continue;

        let rowIndex = statsRows.findIndex((row) => row[0] === metricKey);
        if (rowIndex === -1) {
          statsRows.push([metricKey, 0, false]);
          rowIndex = statsRows.length - 1;
        }

        const currentVal = Number(statsRows[rowIndex][1]) || 0;
        if (currentVal < countVal) {
          statsRows[rowIndex][1] = countVal;
        }
      }
    }
  }
}


