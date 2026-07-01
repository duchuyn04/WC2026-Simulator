type EspnScheduleCompetitor = {
  id?: string;
  homeAway?: "home" | "away";
  score?: { value?: number };
  team?: { displayName?: string };
};

type EspnScheduleEvent = {
  id: string;
  date: string;
  name?: string;
  shortName?: string;
  competitions?: Array<{
    competitors?: EspnScheduleCompetitor[];
    status?: { type?: { completed?: boolean } };
  }>;
};

export type RecentTeamMatch = {
  id: string;
  date: string;
  name?: string;
  shortName?: string;
  result: "W" | "L" | "D";
  homeTeam: { id?: string; name?: string; score?: number };
  awayTeam: { id?: string; name?: string; score?: number };
};

export async function fetchTeamMatches(espnId: string): Promise<RecentTeamMatch[]> {
  // Lấy lịch thi đấu và kết quả của đội
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${espnId}/schedule`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch ESPN");
  
  const data = await res.json();
  const events = (data.events || []) as EspnScheduleEvent[];
  
  // Lọc ra các trận đã đá xong
  const completed = events.filter((e) => e.competitions?.[0]?.status?.type?.completed);
  
  // Sắp xếp theo ngày mới nhất
  completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Lấy 5 trận gần nhất
  return completed.slice(0, 5).map((e) => {
    const comp = e.competitions?.[0];
    const competitors = comp?.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];
    
    // Determine result for the requested team
    let result: RecentTeamMatch["result"] = 'D';
    const isHome = home?.id === espnId;
    const teamScore = isHome ? home?.score?.value : away?.score?.value;
    const oppScore = isHome ? away?.score?.value : home?.score?.value;
    
    if (typeof teamScore === "number" && typeof oppScore === "number") {
      if (teamScore > oppScore) result = 'W';
      else if (teamScore < oppScore) result = 'L';
    }
    
    return {
      id: e.id,
      date: e.date,
      name: e.name ? e.name.replace(' at ', ' vs ') : e.name,
      shortName: e.shortName ? e.shortName.replace(' @ ', ' vs ') : e.shortName,
      result,
      homeTeam: {
        id: home?.id,
        name: home?.team?.displayName,
        score: home?.score?.value
      },
      awayTeam: {
        id: away?.id,
        name: away?.team?.displayName,
        score: away?.score?.value
      }
    };
  });
}
