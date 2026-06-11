import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";
    const res = await fetch(url, { next: { revalidate: 30 } }); // Cache 30 seconds

    if (!res.ok) {
      throw new Error("Failed to fetch ESPN scoreboard");
    }

    const data = await res.json();

    const matches = (data.events || []).map((e: any) => {
      const comp = e.competitions?.[0];
      if (!comp) return null;

      const home = comp.competitors?.find((c: any) => c.homeAway === "home");
      const away = comp.competitors?.find((c: any) => c.homeAway === "away");

      return {
        id: e.id,
        date: e.date,
        status: comp.status?.type?.name, // STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL
        shortDetail: comp.status?.type?.shortDetail, // e.g. "FT", "89'"
        homeId: home?.team?.id,
        awayId: away?.team?.id,
        homeScore: home?.score,
        awayScore: away?.score,
      };
    }).filter(Boolean);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("ESPN Scoreboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch scoreboard" }, { status: 500 });
  }
}
