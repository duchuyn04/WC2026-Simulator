import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
    const res = await fetch(url, { next: { revalidate: 60 } }); // Cache 60s

    if (!res.ok) {
      throw new Error("Failed to fetch ESPN standings");
    }

    const data = await res.json();
    
    // d.children is an array of groups (Group A -> Group L)
    const groups = (data.children || []).map((group: any) => {
      const entries = group.standings?.entries || [];
      return {
        name: group.name,
        abbreviation: group.abbreviation,
        teams: entries.map((entry: any) => {
          const stats = entry.stats || [];
          const getStat = (name: string) => stats.find((s: any) => s.name === name)?.value ?? 0;
          
          return {
            espnTeamId: entry.team?.id,
            teamName: entry.team?.displayName || entry.team?.name,
            rank: entry.note?.rank || getStat("rank"),
            points: getStat("points"),
            gamesPlayed: getStat("gamesPlayed"),
            wins: getStat("wins"),
            ties: getStat("ties"),
            losses: getStat("losses"),
            pointDifferential: getStat("pointDifferential"),
            pointsFor: getStat("pointsFor"),
            pointsAgainst: getStat("pointsAgainst")
          };
        }).sort((a: any, b: any) => a.rank - b.rank)
      };
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("ESPN Standings Error:", error);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
