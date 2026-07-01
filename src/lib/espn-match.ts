import type { ScheduleEntry } from "./schedule";
import type { MatchResult } from "./fifa/types";

export const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";

export type EspnScoreboardMatch = {
  id: string;
  date: string;
  status: string;
  state: "pre" | "in" | "post";
  shortDetail: string;
  displayClock: string;
  homeId?: string;
  awayId?: string;
  homeScore?: string;
  awayScore?: string;
  winnerId?: string;
  cards?: EspnCardEvent[];
};

export type EspnCardEvent = {
  teamId: string;
  type: "yellow-card" | "red-card";
};

export const ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary";

type EspnScoreboardResponse = {
  events?: Array<{
    id?: string;
    date?: string;
    competitions?: Array<{
      status?: {
        displayClock?: string;
        type?: {
          name?: string;
          state?: "pre" | "in" | "post";
          shortDetail?: string;
        };
      };
      competitors?: Array<{
        homeAway?: "home" | "away";
        score?: string;
        winner?: boolean;
        team?: { id?: string };
      }>;
      details?: Array<{
        redCard?: boolean;
        yellowCard?: boolean;
        team?: { id?: string };
      }>;
    }>;
  }>;
};

export function parseEspnScoreboard(data: EspnScoreboardResponse): EspnScoreboardMatch[] {
  return (data.events ?? []).flatMap((event) => {
    const competition = event.competitions?.[0];
    const home = competition?.competitors?.find((team) => team.homeAway === "home");
    const away = competition?.competitors?.find((team) => team.homeAway === "away");
    const winner = competition?.competitors?.find((team) => team.winner);

    if (!event.id || !event.date || !competition) return [];

    const cards: EspnCardEvent[] = [];
    if (competition.details) {
      for (const d of competition.details) {
        if (d.team?.id) {
          if (d.yellowCard) cards.push({ teamId: d.team.id, type: "yellow-card" });
          else if (d.redCard) cards.push({ teamId: d.team.id, type: "red-card" });
        }
      }
    }

    return [{
      id: event.id,
      date: event.date,
      status: competition.status?.type?.name ?? "",
      state: competition.status?.type?.state ?? "pre",
      shortDetail: competition.status?.type?.shortDetail ?? "",
      displayClock: competition.status?.displayClock ?? "",
      homeId: home?.team?.id,
      awayId: away?.team?.id,
      homeScore: home?.score,
      awayScore: away?.score,
      ...(winner?.team?.id ? { winnerId: winner.team.id } : {}),
      cards,
    }];
  });
}

export function isEspnMatchHalftime(match: EspnScoreboardMatch) {
  if (match.state !== "in") return false;

  const statusUpper = match.status.toUpperCase();
  const shortUpper = match.shortDetail.toUpperCase().trim();
  if (
    statusUpper.includes("HALFTIME") ||
    statusUpper.includes("HALF-TIME") ||
    statusUpper.includes("HALF_TIME") ||
    shortUpper === "HT" ||
    shortUpper === "HALF" ||
    shortUpper === "HALFTIME" ||
    shortUpper === "HALF-TIME" ||
    shortUpper.startsWith("HT ")
  ) {
    return true;
  }

  const clock = match.displayClock.trim();
  // Clock stops at 45:00 / 45:00+ during the halftime intermission before
  // ESPN transitions to a dedicated halftime status. Treat those as HT too.
  if (/^45(:00)?(\+0+)?$/.test(clock)) return true;
  // "45'+3'" style stoppage clock counts as in-play until 45:00 is reached.
  if (/^45'\+0+$/.test(clock)) return true;

  return false;
}

export function isEspnMatchLive(match: EspnScoreboardMatch) {
  if (match.state !== "in") return false;
  if (isEspnMatchHalftime(match)) return false;
  return true;
}

export function hasEspnMatchScore(match: EspnScoreboardMatch) {
  return match.state === "in" || match.state === "post";
}

export function getEspnLiveClock(match: EspnScoreboardMatch) {
  return match.displayClock || match.shortDetail;
}

export function findEspnMatch(
  entry: ScheduleEntry,
  matches: EspnScoreboardMatch[],
  espnToLocal: Record<string, string>
): EspnScoreboardMatch | undefined {
  if (!entry.date) return undefined;

  const entryTime = new Date(entry.date).getTime();
  if (Number.isNaN(entryTime)) return undefined;

  const sameKickoff = matches.filter((match) => {
    const matchTime = new Date(match.date).getTime();
    return !Number.isNaN(matchTime) && matchTime === entryTime;
  });

  if (sameKickoff.length === 1) return sameKickoff[0];
  if (!entry.home?.id || !entry.away?.id) return undefined;

  const hasSameTeams = (match: EspnScoreboardMatch) => {
    const espnHome = match.homeId ? espnToLocal[match.homeId] : undefined;
    const espnAway = match.awayId ? espnToLocal[match.awayId] : undefined;

    return (
      (espnHome === entry.home?.id && espnAway === entry.away?.id) ||
      (espnHome === entry.away?.id && espnAway === entry.home?.id)
    );
  };

  return sameKickoff.find(hasSameTeams) ?? matches.find((match) => {
    const matchTime = new Date(match.date).getTime();
    return (
      !Number.isNaN(matchTime) &&
      Math.abs(matchTime - entryTime) <= 6 * 60 * 60 * 1000 &&
      hasSameTeams(match)
    );
  });
}

function parseEspnScore(value?: string): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function espnScoresToResult(
  entry: ScheduleEntry,
  espn: EspnScoreboardMatch,
  espnToLocal: Record<string, string>
): MatchResult | null {
  if (!hasEspnMatchScore(espn)) return null;

  const espnHomeScore = parseEspnScore(espn.homeScore);
  const espnAwayScore = parseEspnScore(espn.awayScore);
  if (espnHomeScore === null || espnAwayScore === null) return null;

  const espnHomeLocal = espn.homeId ? espnToLocal[espn.homeId] : undefined;
  const espnAwayLocal = espn.awayId ? espnToLocal[espn.awayId] : undefined;

  if (espnHomeLocal === entry.home?.id && espnAwayLocal === entry.away?.id) {
    return { home: espnHomeScore, away: espnAwayScore };
  }
  if (espnHomeLocal === entry.away?.id && espnAwayLocal === entry.home?.id) {
    return { home: espnAwayScore, away: espnHomeScore };
  }

  if (!espn.homeId || !espn.awayId) {
    return { home: espnHomeScore, away: espnAwayScore };
  }

  return null;
}

/** Categorization result for an entry in the Live tab. */
export type LiveCategory = "live" | "upcoming" | "none";

/**
 * Live tab ngày giới hạn hôm qua + hôm nay + ngày mai (theo giờ địa phương).
 * Mở rộng từ 2 ngày lên 3 ngày để hiển thị trận đã kết thúc gần đây.
 * `now` inject được để test — mặc định lấy thời gian hiện tại.
 */
export function isWithinThreeDays(date: Date, now: number = Date.now()): boolean {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  for (let offset = -1; offset <= 1; offset++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + offset);
    if (target.getTime() === day.getTime()) return true;
  }
  return false;
}

/** @deprecated Dùng isWithinThreeDays thay thế */
export const isTodayOrTomorrow = isWithinThreeDays;

/**
 * Phán đoán trận đã kết thúc khi ESPN chưa trả data — kickoff >3h.
 * `now` inject được để test. Chỉ là fallback an toàn khi ESPN chưa load.
 */
export function hasProbablyEnded(kickoff: Date, now: number = Date.now()): boolean {
  return now - kickoff.getTime() > 3 * 60 * 60 * 1000;
}

/**
 * Quyết định một schedule entry thuộc nhóm nào trên Live tab.
 *
 * Nguyên tắc: khi ESPN đã load (`espnLoaded=true`) → tin tưởng `state` thật của server,
 * KHÔNG dùng heuristic `hasProbablyEnded`. Điều này tránh bug: trận đang đá hiệp phụ
 * (state="in" nhưng >3h do ET/penalty) bị biến mất khỏi UI. Heuristic chỉ còn là
 * fallback cho cửa sổ ngắn khi ESPN chưa trả data lần đầu.
 *
 * - "live"     : ESPN báo đang đá (không halftime)
 * - "upcoming" : ESPN chưa load + chưa đến 3h; HOẶC ESPN đã load + state "pre" + trong 2 ngày
 * - "none"     : còn lại (đặc biệt ESPN loaded + state "post" → đã xong thật)
 */
export function categorizeLiveEntry(args: {
  eventDate: Date;
  espnMatch?: EspnScoreboardMatch;
  espnLoaded: boolean;
  now?: number;
}): LiveCategory {
  const { eventDate, espnMatch, espnLoaded, now = Date.now() } = args;
  if (Number.isNaN(eventDate.getTime())) return "none";

  // Cả trận đang đá lẫn đang nghỉ giữa hiệp (HT) đều là "live"
  if (espnMatch && espnMatch.state === "in") return "live";

  if (!isWithinThreeDays(eventDate, now)) return "none";

  if (espnLoaded) {
    // ESPN đã phản hồi — tin tưởng state thật, không phán đoán.
    // Trận đã post (kể cả ET/penalty) → bỏ khỏi upcoming.
    if (!espnMatch || espnMatch.state === "pre") return "upcoming";
    return "none";
  }

  // ESPN chưa load — fallback heuristic trong cửa sổ chờ.
  if (!hasProbablyEnded(eventDate, now)) return "upcoming";
  return "none";
}
