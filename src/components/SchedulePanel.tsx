"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlagIcon } from "./FlagIcon";
import { useSchedule } from "@/lib/hooks";
import { useSimulation } from "@/lib/store";
import {
  filterScheduleEntries,
  groupScheduleByDate,
  type ScheduleEntry,
  type ScheduleFilter,
} from "@/lib/schedule";
import { isPlayedResult } from "@/lib/fifa/types";
import type { Team } from "@/lib/fifa/types";
import { ESPN_TEAM_MAP } from "@/lib/espn-mapping";
import { EspnStandingsBoard } from "./EspnStandingsBoard";
import { TournamentStatsBoard } from "./TournamentStatsBoard";
import { MatchStatsModal } from "./MatchStatsModal";
import { H2HModal } from "./H2HModal";
import {
  findEspnMatch,
  getEspnLiveClock,
  hasEspnMatchScore,
  isEspnMatchHalftime,
  isEspnMatchLive,
  parseEspnScoreboard,
  type EspnScoreboardMatch,
} from "@/lib/espn-match";


const ESPN_TO_LOCAL = Object.entries(ESPN_TEAM_MAP).reduce((acc, [localId, espnId]) => {
  acc[espnId] = localId;
  return acc;
}, {} as Record<string, string>);

function useEspnLiveScores() {
  const [matches, setMatches] = useState<EspnScoreboardMatch[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchScores = async () => {
      try {
        const url = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000";
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        
        const parsedMatches = parseEspnScoreboard(data);

        if (mounted && parsedMatches.length > 0) {
          setMatches(parsedMatches);
        }
      } catch {
        // Keep the local schedule usable when ESPN is temporarily unavailable.
      }
    };

    fetchScores();
    const interval = setInterval(fetchScores, 30000); // 30s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return matches;
}

type SchedulePanelFilter = ScheduleFilter | "espn-standings" | "stats";

const FILTERS: { id: SchedulePanelFilter; label: string }[] = [
  { id: "all", label: "Tất cả trận đấu" },
  { id: "group", label: "Vòng bảng" },
  { id: "knockout", label: "Nhánh Knockout" },
  { id: "espn-standings", label: "BXH Thực tế" },
  { id: "stats", label: "Thống kê" },
];

function getTeamSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-and-/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function MatchSide({
  team,
  placeholder,
  winnerId,
  side,
}: {
  team: Team | null;
  placeholder: string;
  winnerId?: string;
  side: "home" | "away";
}) {
  const isWinner = team && winnerId === team.id;
  const isLoser = team && winnerId && winnerId !== team.id;
  const toggleFavoriteTeam = useSimulation((s) => s.toggleFavoriteTeam);
  const favoriteTeams = useSimulation((s) => s.favoriteTeams);

  if (!team) {
    return (
      <span className="text-sm font-medium text-zinc-500">
        {placeholder}
      </span>
    );
  }

  const tone = isWinner
    ? "text-amber-300"
    : isLoser
      ? "text-zinc-500"
      : "text-zinc-100";

  const isFav = favoriteTeams.includes(team.id);

  if (side === "home") {
    return (
      <Link href={`/teams/${getTeamSlug(team.name)}`} className={`flex items-center justify-end gap-2 min-w-0 ${tone} hover:underline decoration-zinc-500`} title={team.name}>
        <span className="text-sm font-semibold truncate leading-none">{team.name}</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavoriteTeam(team.id);
          }}
          className="hover:opacity-80 transition-opacity relative"
          title="Yêu thích đội"
        >
          <FlagIcon code={team.code} size="sm" title={team.name} />
          {isFav && <span className="absolute -top-1 -right-1 text-[8px]">⭐</span>}
        </button>
      </Link>
    );
  }

  return (
    <Link
      href={`/teams/${getTeamSlug(team.name)}`}
      className={`flex items-center gap-2 min-w-0 ${tone} hover:underline decoration-zinc-500`}
      title={team.name}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavoriteTeam(team.id);
        }}
        className="hover:opacity-80 transition-opacity relative"
        title="Yêu thích đội"
      >
        <FlagIcon code={team.code} size="sm" title={team.name} />
        {isFav && <span className="absolute -top-1 -right-1 text-[8px]">⭐</span>}
      </button>
      <span className="text-sm font-semibold truncate leading-none">{team.name}</span>
    </Link>
  );
}

function ScoreDisplay({
  entry,
  espnMatch,
}: {
  entry: ScheduleEntry;
  espnMatch?: EspnScoreboardMatch;
}) {
  if (espnMatch && hasEspnMatchScore(espnMatch)) {
    const isLive = isEspnMatchLive(espnMatch);
    const isHalftime = isEspnMatchHalftime(espnMatch);
    const liveClock = getEspnLiveClock(espnMatch);
    return (
      <div className="flex flex-col items-center">
        <span className="font-mono text-sm font-black text-emerald-400 tabular-nums whitespace-nowrap">
          {espnMatch.homeScore} - {espnMatch.awayScore}
        </span>
        {isLive && (
          <span className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-rose-500 animate-pulse">
            LIVE {liveClock}
          </span>
        )}
        {!isLive && isHalftime && (
          <span className="mt-0.5 whitespace-nowrap text-[9px] font-bold text-amber-400">
            HT
          </span>
        )}
        {!isLive && !isHalftime && espnMatch.shortDetail && (
          <span className="text-[9px] font-bold text-zinc-500 mt-0.5 whitespace-nowrap">{espnMatch.shortDetail}</span>
        )}
      </div>
    );
  }

  if (entry.kind === "group") {
    if (!isPlayedResult(entry.result)) {
      return <span className="font-mono text-sm text-zinc-600">vs</span>;
    }
    return (
      <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums whitespace-nowrap">
        {entry.result.home} - {entry.result.away}
      </span>
    );
  }

  if (!entry.winner) {
    return <span className="text-sm text-zinc-600">vs</span>;
  }

  return (
    <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wide">
      ✓ {entry.winner.code}
    </span>
  );
}

function MatchScoreButton({
  entry,
  espnMatch,
  onOpen,
}: {
  entry: ScheduleEntry;
  espnMatch?: EspnScoreboardMatch;
  onOpen?: () => void;
}) {
  const score = <ScoreDisplay entry={entry} espnMatch={espnMatch} />;

  if (!onOpen) return score;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group/score min-w-14 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      title="Xem chi tiết và thống kê trận đấu"
      aria-label={`Xem chi tiết trận ${entry.matchNumber}`}
    >
      {score}
      <span className="mt-0.5 block text-[8px] font-semibold uppercase tracking-wide text-zinc-700 opacity-0 transition-opacity group-hover/score:opacity-100">
        Chi tiết
      </span>
    </button>
  );
}



function ScheduleTableRow({
  entry,
  espnMatches,
  onOpenMatch,
  onOpenH2H,
}: {
  entry: ScheduleEntry;
  espnMatches: EspnScoreboardMatch[];
  onOpenMatch: (gameId: string, matchDate?: string) => void;
  onOpenH2H: (home: { id: string; name: string; flagUrl: string }, away: { id: string; name: string; flagUrl: string }) => void;
}) {
  const winnerId = entry.kind === "knockout" ? entry.winner?.id : undefined;
  const toggleFavoriteMatch = useSimulation((s) => s.toggleFavoriteMatch);
  const favoriteMatches = useSimulation((s) => s.favoriteMatches);
  const isFavMatch = favoriteMatches.includes(entry.id);
  let timeStr = "--:--";
  if (entry.date) {
    const d = new Date(entry.date);
    if (!Number.isNaN(d.getTime())) {
      timeStr = new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(d);
    }
  }

  const matchedEspn = findEspnMatch(entry, espnMatches, ESPN_TO_LOCAL);
  let espnMatch = matchedEspn;
  if (
    matchedEspn &&
    entry.away?.id &&
    matchedEspn.homeId &&
    ESPN_TO_LOCAL[matchedEspn.homeId] === entry.away.id
  ) {
    espnMatch = {
      ...matchedEspn,
      homeScore: matchedEspn.awayScore,
      awayScore: matchedEspn.homeScore,
    };
  }

  return (
    <tr
      data-testid={`schedule-match-${entry.matchNumber}`}
      className="border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors group"
    >
      <td className="px-4 py-3 text-sm text-zinc-500 text-center w-12">
        {entry.matchNumber}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-300">
        <div className="flex items-center gap-1.5 justify-center">
          <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-mono">{timeStr}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        <div className="flex flex-col items-start gap-1">
          <div className="bg-zinc-900/80 px-2 py-1 rounded-md inline-block whitespace-nowrap">
            {entry.stageLabel}
          </div>
          {(entry.stadium || entry.city) && (
            <div className="text-xs text-zinc-500 whitespace-nowrap" title={`${entry.stadium || ""} ${entry.city ? `- ${entry.city}` : ""}`}>
              {entry.stadium} {entry.city ? `- ${entry.city}` : ""}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right w-[30%]">
        <MatchSide
          team={entry.home}
          placeholder={entry.homePlaceholder}
          winnerId={winnerId}
          side="home"
        />
      </td>
      <td className="px-2 py-3 text-center w-20">
        <MatchScoreButton
          entry={entry}
          espnMatch={espnMatch}
          onOpen={matchedEspn ? () => onOpenMatch(matchedEspn.id, entry.date) : undefined}
        />
      </td>
      <td className="px-4 py-3 text-left w-[30%]">
        <MatchSide
          team={entry.away}
          placeholder={entry.awayPlaceholder}
          winnerId={winnerId}
          side="away"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {entry.home && entry.away && (
            <button
              onClick={() => onOpenH2H(entry.home!, entry.away!)}
              className="text-zinc-500 hover:text-emerald-400 transition-colors"
              title="Lịch sử đối đầu"
              aria-label={`Lịch sử đối đầu ${entry.home.name} vs ${entry.away.name}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => toggleFavoriteMatch(entry.id)}
            className={`transition-colors ${isFavMatch ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title={isFavMatch ? "Bỏ yêu thích" : "Yêu thích trận"}
          >
            {isFavMatch ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-1.81.588l1.15 5.394a.562.562 0 01-.84.61l-4.717-2.784a.563.563 0 00-.57 0l-4.717 2.784a.562.562 0 01-.84-.61l1.15-5.394a.563.563 0 00-1.81-.588l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-1.81.588l1.15 5.394a.562.562 0 01-.84.61l-4.717-2.784a.563.563 0 00-.57 0l-4.717 2.784a.562.562 0 01-.84-.61l1.15-5.394a.563.563 0 00-1.81-.588l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function SchedulePanel({ filterMode = "all" }: { filterMode?: "all" | "fav-matches" | "fav-teams" }) {
  const allEntries = useSchedule();
  const espnMatches = useEspnLiveScores();
  const [selectedFilter, setFilter] = useState<SchedulePanelFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedMatchDate, setSelectedMatchDate] = useState<string | null>(null);
  const [h2hTeams, setH2hTeams] = useState<{ home: { id: string; name: string; flagUrl: string }; away: { id: string; name: string; flagUrl: string } } | null>(null);
  const favoriteMatches = useSimulation((s) => s.favoriteMatches);
  const favoriteTeams = useSimulation((s) => s.favoriteTeams);
  const filter =
    (filterMode === "fav-matches" || filterMode === "fav-teams") &&
    selectedFilter === "knockout"
      ? "all"
      : selectedFilter;





  // In "Yêu thích" modes, hide the full "Nhánh Knockout" sub-filter
  // (the entire KO schedule branch with real dates is still available in the main "Tất cả lịch thi đấu" tab).
  const visibleFilters = useMemo(() => {
    if (filterMode === "fav-matches" || filterMode === "fav-teams") {
      return FILTERS.filter((f) => f.id !== "knockout" && f.id !== "espn-standings" && f.id !== "stats");
    }
    return FILTERS;
  }, [filterMode]);

  const filtered = useMemo(() => {
    if (filter === "espn-standings" || filter === "stats") return []; // Not used for standings or stats
    let list = filterScheduleEntries(allEntries, filter as ScheduleFilter);
    
    if (filterMode === "fav-matches") {
      list = list.filter((e) => favoriteMatches.includes(e.id));
    } else if (filterMode === "fav-teams") {
      list = list.filter(
        (e) =>
          (e.home && favoriteTeams.includes(e.home.id)) ||
          (e.away && favoriteTeams.includes(e.away.id))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.home?.name.toLowerCase().includes(q) ||
          e.away?.name.toLowerCase().includes(q) ||
          e.stadium?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q)
      );
    }
    
    return list;
  }, [allEntries, filter, filterMode, favoriteMatches, favoriteTeams, searchQuery]);

  const dateGroups = useMemo(() => groupScheduleByDate(filtered), [filtered]);

  return (
    <div className="min-w-0 space-y-4" data-testid="schedule-panel">
      {/* Header matching documented behavior and E2E expectations */}
      <div className="flex items-baseline gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Lịch thi đấu</h2>
        <span className="text-sm text-zinc-500">104 trận</span>
      </div>

      {/* Sub-navigation & Toolbar */}
      <div className="flex min-w-0 flex-col justify-between gap-4 border-b border-zinc-800 py-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex w-max min-w-full items-center gap-5 text-sm font-medium sm:gap-6">
            {visibleFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`schedule-filter-${item.id}`}
                onClick={() => setFilter(item.id)}
                className={[
                  "pb-4 transition-colors",
                  filter === item.id
                    ? "underline decoration-[#ff4d6d] decoration-2 underline-offset-8 font-semibold text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex min-w-0 items-center gap-3">
          {filter !== "espn-standings" && filter !== "stats" && (
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm quốc gia, SVĐ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          )}


        </div>
      </div>

      {filter === "stats" ? (
        <TournamentStatsBoard />
      ) : filter === "espn-standings" ? (
        <div className="space-y-8">
          {/* Real external data */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs uppercase tracking-[1px] text-emerald-400 font-semibold">Dữ liệu thực tế (ESPN)</div>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            <EspnStandingsBoard />
          </div>


        </div>
      ) : dateGroups.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">Không có trận nào trong bộ lọc này.</p>
      ) : (
        <div className="max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/50">
                <th className="px-4 py-3 text-center whitespace-nowrap">TRẬN</th>
                <th className="px-4 py-3 text-center">GIỜ</th>
                <th className="px-4 py-3">VÒNG ĐẤU</th>
                <th className="px-4 py-3 text-right">ĐỘI 1</th>
                <th className="px-2 py-3 text-center">TỈ SỐ</th>
                <th className="px-4 py-3">ĐỘI 2</th>
                <th className="px-4 py-3 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {dateGroups.map((group) => (
                <React.Fragment key={group.dateKey}>
                  <tr className="bg-zinc-900/30">
                    <td colSpan={7} className="px-4 py-2">
                      <div className="inline-flex items-center justify-center bg-[#6a041f]/20 text-[#ff4d6d] font-bold px-3 py-1 rounded-full text-sm">
                        {group.dateLabel}
                      </div>
                    </td>
                  </tr>
                  {group.entries.map((entry) => (
                    <ScheduleTableRow
                      key={entry.id}
                      entry={entry}
                      espnMatches={espnMatches}
                      onOpenMatch={(gameId, matchDate) => { setSelectedGameId(gameId); setSelectedMatchDate(matchDate ?? null); }}
                      onOpenH2H={(h, a) => setH2hTeams({ home: h, away: a })}
                    />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <MatchStatsModal gameId={selectedGameId} matchDate={selectedMatchDate} onClose={() => { setSelectedGameId(null); setSelectedMatchDate(null); }} />
      <H2HModal
        teamA={h2hTeams?.home ?? null}
        teamB={h2hTeams?.away ?? null}
        onClose={() => setH2hTeams(null)}
      />
    </div>
  );
}
