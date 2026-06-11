import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ error: 'Game ID is required' }, { status: 400 });
  }

  try {
    const url = `http://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${gameId}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error("Failed to fetch ESPN match summary");
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching match ${gameId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch match details' }, { status: 500 });
  }
}
