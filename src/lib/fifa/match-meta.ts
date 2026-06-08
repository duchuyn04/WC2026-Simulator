const VN_TZ = "Asia/Ho_Chi_Minh";

export type MatchScheduleFields = {
  date?: string;
  localDate?: string;
  stadium?: string;
  city?: string;
};

export function formatVietnamDateTime(isoUtc?: string): string | null {
  if (!isoUtc) return null;
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return null;

  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return `${date} · ${time}`;
}

export function formatVenue(stadium?: string, city?: string): string | null {
  if (stadium && city) return `${stadium}, ${city}`;
  return stadium ?? city ?? null;
}

export function formatMatchMeta(match: MatchScheduleFields & { matchNumber?: number }) {
  const vietnamTime = formatVietnamDateTime(match.date);
  const venue = formatVenue(match.stadium, match.city);
  return { vietnamTime, venue };
}