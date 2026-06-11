import { NextResponse } from 'next/server';
import { ESPN_TEAM_MAP } from '@/lib/espn-mapping';
import { fetchTeamMatches } from '@/lib/espn';

// Cache trong 1 giờ để không bị spam API ESPN
export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (teamId) {
    const espnId = ESPN_TEAM_MAP[teamId];
    if (!espnId) return NextResponse.json({ error: 'Team not found in mapping' }, { status: 404 });
    const data = await fetchTeamMatches(espnId);
    return NextResponse.json({ teamId, recentMatches: data });
  }

  // Nếu không truyền teamId, lấy cho toàn bộ 48 đội
  const results: Record<string, any> = {};
  const entries = Object.entries(ESPN_TEAM_MAP);
  
  // Gọi API theo nhóm 5 request để tránh bị rate limit
  for (let i = 0; i < entries.length; i += 5) {
    const chunk = entries.slice(i, i + 5);
    await Promise.all(chunk.map(async ([wcId, espnId]) => {
      try {
        results[wcId] = await fetchTeamMatches(espnId);
      } catch (err) {
        console.error(`Failed to fetch for ${wcId}:`, err);
        results[wcId] = [];
      }
    }));
  }

  return NextResponse.json(results);
}
