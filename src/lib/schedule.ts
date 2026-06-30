import { seed } from "./data";
import type { GroupMatch, MatchResult, ResolvedKnockoutMatch, Team } from "./fifa/types";
import { isPlayedResult } from "./fifa/types";

export type ScheduleFilter = "all" | "group" | "knockout";

export type ScheduleEntry = {
  id: string;
  matchNumber: number;
  date?: string;
  localDate?: string;
  stadium?: string;
  city?: string;
  kind: "group" | "knockout";
  stageLabel: string;
  groupLetter?: string;
  home: Team | null;
  away: Team | null;
  homeCandidates?: Team[];
  awayCandidates?: Team[];
  homePlaceholder: string;
  awayPlaceholder: string;
  result?: MatchResult;
  winner?: Team | null;
  matchday?: number;
};

const STAGE_LABELS: Record<string, string> = {
  "First Stage": "Vòng bảng",
  "Round of 32": "Vòng 32",
  "Round of 16": "Vòng 16",
  "Quarter-final": "Tứ kết",
  "Semi-final": "Bán kết",
  "Play-off for third place": "Tranh hạng 3",
  Final: "Chung kết",
};

export function stageLabel(stage: string, groupLetter?: string): string {
  const base = STAGE_LABELS[stage] ?? stage;
  if (stage === "First Stage" && groupLetter) return `${base} · Bảng ${groupLetter}`;
  return base;
}

export function groupMatchToEntry(
  match: GroupMatch,
  groupLetter: string,
  matchResults: Record<string, MatchResult>,
  matchIndex: number
): ScheduleEntry {
  return {
    id: match.id,
    matchNumber: match.matchNumber,
    date: match.date,
    localDate: match.localDate,
    stadium: match.stadium,
    city: match.city,
    kind: "group",
    stageLabel: stageLabel("First Stage", groupLetter),
    groupLetter,
    home: match.home,
    away: match.away,
    homePlaceholder: match.placeholderA,
    awayPlaceholder: match.placeholderB,
    result: matchResults[match.id],
    matchday: Math.floor(matchIndex / 2) + 1,
  };
}

function winnerCandidates(
  placeholder: string,
  matches: Map<number, ResolvedKnockoutMatch>
): Team[] | undefined {
  const sourceMatch = placeholder.match(/^W(\d+)$/);
  if (!sourceMatch) return undefined;

  const match = matches.get(Number(sourceMatch[1]));
  if (!match || match.winner) return undefined;

  const candidates = [
    match.resolvedHome?.team,
    match.resolvedAway?.team,
  ].filter((team): team is Team => Boolean(team));

  return candidates.length > 0 ? candidates : undefined;
}

export function knockoutMatchToEntry(
  match: ResolvedKnockoutMatch,
  matches = new Map<number, ResolvedKnockoutMatch>()
): ScheduleEntry {
  return {
    id: match.id,
    matchNumber: match.matchNumber,
    date: match.date,
    localDate: match.localDate,
    stadium: match.stadium,
    city: match.city,
    kind: "knockout",
    stageLabel: stageLabel(match.stage),
    home: match.resolvedHome?.team ?? null,
    away: match.resolvedAway?.team ?? null,
    homeCandidates: winnerCandidates(match.placeholderA, matches),
    awayCandidates: winnerCandidates(match.placeholderB, matches),
    homePlaceholder: match.placeholderA,
    awayPlaceholder: match.placeholderB,
    winner: match.winner,
  };
}

export function buildScheduleEntries(
  matchResults: Record<string, MatchResult>,
  knockoutMatches: ResolvedKnockoutMatch[]
): ScheduleEntry[] {
  // "Thực tế": group matches + dates/venues/stages/placeholders come verbatim from FIFA seed (72 group matches).
  // "Theo simulator": knockout teams/winners are resolved at runtime from current standings + picks.
  const groupEntries = seed.groups.flatMap((group) =>
    group.matches.map((match, idx) => groupMatchToEntry(match, group.letter, matchResults, idx))
  );
  const knockoutMap = new Map(knockoutMatches.map((match) => [match.matchNumber, match]));
  const knockoutEntries = knockoutMatches.map((match) => knockoutMatchToEntry(match, knockoutMap));
  return sortScheduleEntries([...groupEntries, ...knockoutEntries]);
}

export function sortScheduleEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
    const db = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.matchNumber - b.matchNumber;
  });
}

export function filterScheduleEntries(
  entries: ScheduleEntry[],
  filter: ScheduleFilter
): ScheduleEntry[] {
  if (filter === "all") return entries;
  if (filter === "group") return entries.filter((entry) => entry.kind === "group");
  return entries.filter((entry) => entry.kind === "knockout");
}

export type ScheduleDateGroup = {
  dateKey: string;
  dateLabel: string;
  entries: ScheduleEntry[];
};

export function groupScheduleByDate(entries: ScheduleEntry[]): ScheduleDateGroup[] {
  const groups = new Map<string, ScheduleEntry[]>();

  for (const entry of entries) {
    let key = "unknown";
    if (entry.date) {
      const d = new Date(entry.date);
      if (!Number.isNaN(d.getTime())) {
        key = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      }
    }
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return a.localeCompare(b);
    })
    .map(([dateKey, items]) => ({
      dateKey,
      dateLabel: formatDateHeader(dateKey, items[0]?.date),
      entries: items,
    }));
}

function formatDateHeader(dateKey: string, iso?: string): string {
  if (dateKey === "unknown" || !iso) return "Chưa có ngày";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Chưa có ngày";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function countPlayedGroupMatches(entries: ScheduleEntry[]): number {
  return entries.filter(
    (entry) => entry.kind === "group" && isPlayedResult(entry.result)
  ).length;
}

export function countPickedKnockoutMatches(entries: ScheduleEntry[]): number {
  return entries.filter((entry) => entry.kind === "knockout" && entry.winner).length;
}
