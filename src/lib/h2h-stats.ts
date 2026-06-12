export interface Match {
  Home?: { IdTeam?: string | number };
  Away?: { IdTeam?: string | number };
  HomeTeamScore?: number | string | null;
  AwayTeamScore?: number | string | null;
}

export function getH2HStats(matches: Match[], teamAId: string, teamBId: string) {
  let total = 0;
  let winsA = 0;
  let draws = 0;
  let winsB = 0;

  for (const match of matches) {
    const isHomeA = String(match.Home?.IdTeam) === teamAId && String(match.Away?.IdTeam) === teamBId;
    const isHomeB = String(match.Home?.IdTeam) === teamBId && String(match.Away?.IdTeam) === teamAId;

    if (isHomeA || isHomeB) {
      if (
        match.HomeTeamScore == null ||
        match.AwayTeamScore == null ||
        match.HomeTeamScore === "" ||
        match.AwayTeamScore === ""
      ) continue;

      const scoreHome = Number(match.HomeTeamScore);
      const scoreAway = Number(match.AwayTeamScore);

      if (Number.isNaN(scoreHome) || Number.isNaN(scoreAway)) continue;

      total++;

      if (scoreHome === scoreAway) {
        draws++;
      } else if (isHomeA) {
        if (scoreHome > scoreAway) winsA++;
        else winsB++;
      } else {
        if (scoreHome > scoreAway) winsB++;
        else winsA++;
      }
    }
  }

  return { total, winsA, draws, winsB };
}
