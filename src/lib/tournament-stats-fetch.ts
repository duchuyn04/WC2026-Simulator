import defaultStatsData from "../../data/fifa-tournament-stats.json";

function getOfflineFallback(): TournamentStatsSnapshot {
  const data = JSON.parse(JSON.stringify(defaultStatsData)) as TournamentStatsSnapshot;
  if (data && data.source) {
    data.source.provider = "FIFA (Offline Fallback)";
  }
  return data;
}



export async function fetchTournamentStatsFromFifa(): Promise<TournamentStatsSnapshot> {
  // Khắc phục triệt để lỗi Connection Starvation (mất 20s+ mới fetch xong score):
  // Vì Next.js App được deploy lên GitHub Pages không có API Routes, fallback này sẽ bị kích hoạt.
  // Thuật toán cũ tự động fetch song song 150+ requests (calendar, player stats, espn summary) 
  // làm cạn kiệt connection pool của trình duyệt (giới hạn 6 connections/host).
  // Vì CI đã tự động build tĩnh lại app mỗi 15 phút cùng file JSON mới nhất,
  // chúng ta chỉ cần trả về file JSON tĩnh này là đã có dữ liệu đủ mới và mượt mà!
  return getOfflineFallback();
}

export type TournamentStatsSnapshot = {
  source: {
    provider: string;
    seasonId: string;
    calendarUrl: string;
  };
  fetchedAt: string;
  completedMatches: number;
  skippedMatches: number;
  leaderboards: typeof defaultStatsData.leaderboards;
};
