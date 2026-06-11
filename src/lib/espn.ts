export async function fetchTeamMatches(espnId: string) {
  // Lấy lịch thi đấu và kết quả của đội
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/${espnId}/schedule`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Failed to fetch ESPN");
  
  const data = await res.json();
  const events = data.events || [];
  
  // Lọc ra các trận đã đá xong
  const completed = events.filter((e: any) => e.competitions?.[0]?.status?.type?.completed);
  
  // Sắp xếp theo ngày mới nhất
  completed.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Lấy 5 trận gần nhất
  return completed.slice(0, 5).map((e: any) => {
    const comp = e.competitions[0];
    const competitors = comp.competitors || [];
    const home = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
    const away = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
    
    // Determine result for the requested team
    let result = 'D';
    const isHome = home?.id === espnId;
    const teamScore = isHome ? home?.score?.value : away?.score?.value;
    const oppScore = isHome ? away?.score?.value : home?.score?.value;
    
    if (teamScore > oppScore) result = 'W';
    else if (teamScore < oppScore) result = 'L';
    
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
