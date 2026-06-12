export interface Match {
  HomeTeam?: { IdTeam?: string | number };
  AwayTeam?: { IdTeam?: string | number };
  HomeTeamScore?: number | string | null;
  AwayTeamScore?: number | string | null;
}

export function getH2HStats(matches: Match[], teamAId: string, teamBId: string) {
  let total = 0;
  let winsA = 0;
  let draws = 0;
  let winsB = 0;

  for (const match of matches) {
    const isHomeA = String(match.HomeTeam?.IdTeam) === teamAId && String(match.AwayTeam?.IdTeam) === teamBId;
    const isHomeB = String(match.HomeTeam?.IdTeam) === teamBId && String(match.AwayTeam?.IdTeam) === teamAId;

    if (isHomeA || isHomeB) {
      if (match.HomeTeamScore == null || match.AwayTeamScore == null) continue;

      total++;
      const scoreHome = Number(match.HomeTeamScore);
      const scoreAway = Number(match.AwayTeamScore);

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
