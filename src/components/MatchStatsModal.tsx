"use client";

import Image from "next/image";
import SoccerSkeleton from "./SoccerSkeleton";
import { useEffect, useMemo, useState } from "react";
import teamsData from "../../data/fifa-teams-squads.json";
import { ESPN_TEAM_MAP } from "../lib/espn-mapping";
import { useSimulation } from "../lib/store";
import { espnScoresToResult } from "../lib/espn-match";

interface MatchStatsModalProps {
  entry?: import("@/lib/schedule").ScheduleEntry;
  gameId: string | null;
  matchDate?: string | null;
  onClose: () => void;
}

type EspnTeam = {
  id: string;
  displayName: string;
  logo?: string;
};

type EspnBoxscoreTeam = {
  team: EspnTeam;
  statistics?: Array<{
    name: string;
    displayValue: string;
  }>;
};

type EspnDetail = {
  id?: string;
  clock?: { displayValue?: string };
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  team?: { id?: string };
  participants?: Array<{
    athlete?: { id?: string; displayName?: string; shortName?: string };
  }>;
  type?: { text?: string; type?: string };
};

interface EspnAthlete {
  id: string;
  displayName: string;
  shortName?: string;
  headshot?: {
    href: string;
  };
}

interface EspnRosterItem {
  starter: boolean;
  jersey: string;
  position: {
    abbreviation: string;
    name?: string;
    displayName?: string;
  };
  athlete: EspnAthlete;
}

interface EspnTeamRoster {
  homeAway: "home" | "away";
  team: {
    id: string;
  };
  roster: EspnRosterItem[];
}

type EspnSummary = {
  header?: {
    season?: { name?: string };
    competitions?: Array<{
      date?: string;
      venue?: { fullName?: string; address?: { city?: string } };
      status?: { type?: { name?: string; shortDetail?: string; description?: string } };
      competitors?: Array<{
        id?: string;
        homeAway?: "home" | "away";
        score?: string;
        team?: {
          id?: string;
          displayName?: string;
          logos?: Array<{ href?: string }>;
        };
      }>;
      details?: EspnDetail[];
    }>;
  };
  boxscore?: { teams?: EspnBoxscoreTeam[] };
  keyEvents?: EspnDetail[];
  rosters?: EspnTeamRoster[];
};

const STAT_KEYS = [
  { key: "possessionPct", label: "Kiểm soát bóng" },
  { key: "totalShots", label: "Số cú sút" },
  { key: "shotsOnTarget", label: "Sút trúng đích" },
  { key: "wonCorners", label: "Phạt góc" },
  { key: "foulsCommitted", label: "Phạm lỗi" },
  { key: "offsides", label: "Việt vị" },
  { key: "saves", label: "Cứu thua" },
] as const;

function parseStat(value: string) {
  const parsed = Number.parseFloat(value.replace("%", ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatKickoff(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatKickoffShort(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// ESPN shortDetail for scheduled games looks like "6/14 - 1:00 PM EDT".
// Live/final statuses ("78' - 2nd Half", "Final", "Halftime") must pass through.
function isKickoffString(value?: string) {
  if (!value) return false;
  return /\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}:\d{2}/.test(value) &&
    /(AM|PM|EDT|EST|CDT|CST|MDT|MST|PDT|PST|BST|GMT|UTC)/i.test(value);
}

const FINISHED_PATTERN = /\b(final|full.time|ft|aet|pen)\b/i;

function isLiveStatus(status?: string) {
  if (!status) return false;
  if (isKickoffString(status)) return false;
  return !FINISHED_PATTERN.test(status);
}

interface LocalPlayer {
  name?: string;
  shortName?: string;
  wikiName?: string;
  pictureUrl?: string | null;
}

interface LocalTeam {
  squad: LocalPlayer[];
}

function findLocalPlayerPicture(localTeam: LocalTeam | undefined, espnPlayerName: string): string | undefined {
  if (!localTeam || !espnPlayerName) return undefined;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim();

  const normEspn = normalize(espnPlayerName);
  const espnWords = normEspn.split(/\s+/).filter((w) => w.length >= 3);

  // 1. Exact match on full normalized name
  const exactMatch = localTeam.squad.find((p: LocalPlayer) => {
    const normName = normalize(p.name || "");
    const normShort = normalize(p.shortName || "");
    const normWiki = normalize(p.wikiName || "");
    return (
      normName.replace(/\s+/g, "") === normEspn.replace(/\s+/g, "") ||
      normShort.replace(/\s+/g, "") === normEspn.replace(/\s+/g, "") ||
      normWiki.replace(/\s+/g, "") === normEspn.replace(/\s+/g, "")
    );
  });
  if (exactMatch?.pictureUrl) return exactMatch.pictureUrl;

  // 2. Word overlap matching (e.g. sharing last name/distinct parts)
  for (const p of localTeam.squad) {
    const normName = normalize(p.name || "");
    const normShort = normalize(p.shortName || "");
    const normWiki = normalize(p.wikiName || "");

    const pWords = [
      ...normName.split(/\s+/),
      ...normShort.split(/\s+/),
      ...normWiki.split(/\s+/),
    ].filter((w) => w.length >= 3);

    const hasOverlap = espnWords.some((ew) => pWords.includes(ew));
    if (hasOverlap && p.pictureUrl) {
      return p.pictureUrl;
    }
  }

  return undefined;
}


const summaryCache = new Map<string, { data: EspnSummary; timestamp: number }>();
const CACHE_TTL = 30_000;

export function MatchStatsModal({ gameId, matchDate, entry, onClose }: MatchStatsModalProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "timeline" | "lineup">("stats");
  const [response, setResponse] = useState<{
    gameId: string;
    data: EspnSummary | null;
    error: string | null;
  } | null>(() => {
    if (!gameId) return null;
    const cached = summaryCache.get(gameId);
    if (cached) return { gameId, data: cached.data, error: null };
    return null;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab("stats");
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    const cached = summaryCache.get(gameId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResponse({ gameId, data: cached.data, error: null });
      if (!isLiveStatus(cached.data.header?.competitions?.[0]?.status?.type?.shortDetail)) return;
    }

    const controller = new AbortController();
    let livePoll: ReturnType<typeof setInterval> | null = null;

    const fetchSummary = () => {
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${gameId}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error(`ESPN tr\u1EA3 v\u1EC1 l\u1ED7i ${response.status}`);
          return response.json() as Promise<EspnSummary>;
        })
        .then((data) => {
          summaryCache.set(gameId, { data, timestamp: Date.now() });
          setResponse({ gameId, data, error: null });
          if (!isLiveStatus(data.header?.competitions?.[0]?.status?.type?.shortDetail) && livePoll) {
            clearInterval(livePoll);
            livePoll = null;
          }
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
          setResponse({ gameId, data: null, error: reason instanceof Error ? reason.message : "Kh\u00F4ng th\u1EC3 t\u1EA3i d\u1EEF li\u1EC7u tr\u1EADn \u0111\u1EA5u" });
        });
    };

    fetchSummary();

    if (isLiveStatus(cached?.data.header?.competitions?.[0]?.status?.type?.shortDetail)) {
      livePoll = setInterval(fetchSummary, 15_000);
    }

    return () => {
      controller.abort();
      if (livePoll) clearInterval(livePoll);
    };
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [gameId, onClose]);

  const loading = response?.gameId !== gameId;
  const data = response?.gameId === gameId ? response.data : null;
  const error = response?.gameId === gameId ? response.error : null;

  const view = useMemo(() => {
    const competition = data?.header?.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const homeHeader = competitors.find((team) => team.homeAway === "home") ?? competitors[0];
    const awayHeader = competitors.find((team) => team.homeAway === "away") ?? competitors[1];
    const boxscoreTeams = data?.boxscore?.teams ?? [];

    const makeTeam = (header: typeof homeHeader) => {
      if (!header?.id) return null;
      const boxscore = boxscoreTeams.find((team) => team.team.id === header.id);
      return {
        id: header.id,
        name: header.team?.displayName ?? boxscore?.team.displayName ?? "TBD",
        logo: header.team?.logos?.[0]?.href ?? boxscore?.team.logo,
        score: header.score ?? "-",
        statistics: boxscore?.statistics ?? [],
      };
    };

    const details = [
      ...(competition?.details ?? []),
      ...(data?.keyEvents ?? []),
    ];

    return {
      competition,
      home: makeTeam(homeHeader),
      away: makeTeam(awayHeader),
      rosters: data?.rosters ?? [],
      details,
    };
  }, [data]);

  const applyLiveResults = useSimulation((s) => s.applyLiveResults);

  const canApply =
    entry?.kind === "group" &&
    view.home?.score != null &&
    view.away?.score != null;

  const handleApply = () => {
    if (!entry || !canApply || !view.home || !view.away) return;

    const espnToLocal = Object.entries(ESPN_TEAM_MAP).reduce(
      (acc, [localId, espnId]) => {
        acc[espnId] = localId;
        return acc;
      },
      {} as Record<string, string>
    );

    const espn: import("../lib/espn-match").EspnScoreboardMatch = {
      id: gameId ?? "",
      date: matchDate ?? view.competition?.date ?? "",
      status: view.competition?.status?.type?.name ?? "",
      state: "post",
      shortDetail: view.competition?.status?.type?.shortDetail ?? "",
      displayClock: view.competition?.status?.type?.shortDetail ?? "",
      homeId: view.home.id,
      awayId: view.away.id,
      homeScore: view.home.score,
      awayScore: view.away.score,
    };

    const result = espnScoresToResult(entry, espn, espnToLocal);
    if (result) {
      applyLiveResults({ [entry.id]: result });
    }
  };

  const details = view.details;

  const getUniqueEvents = (teamId: string, predicate: (event: EspnDetail) => boolean) => {
    const seen = new Set<string>();
    return details.filter((event) => {
      if (event.team?.id !== teamId || !predicate(event)) return false;
      const athlete = event.participants?.[0]?.athlete;
      const key = `${athlete?.id ?? athlete?.displayName ?? "team"}-${event.clock?.displayValue}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getStat = (team: typeof view.home, key: string) =>
    team?.statistics.find((stat) => stat.name === key)?.displayValue ?? "0";

  const getCards = (teamId: string, type: "yellow-card" | "red-card") =>
    getUniqueEvents(teamId, (event) => event.type?.type === type).length;

  const hasStats = Boolean(view.home?.statistics.length || view.away?.statistics.length);

  const timelineEvents = useMemo(() => {
    const allowedTypes = new Set(["goal", "yellow-card", "red-card", "substitution"]);
    const events: Array<{
      id: string;
      minute: number;
      displayMinute: string;
      type: "goal" | "yellow-card" | "red-card" | "substitution";
      teamId: string;
      playerName: string;
      detail: string;
      playerImage?: string;
      fallbackImage?: string;
    }> = [];

    const seen = new Set<string>();

    for (const det of view.details) {
      let type = det.type?.type;
      if (det.scoringPlay) {
        type = "goal";
      }
      if (!type || !allowedTypes.has(type)) continue;

      const teamId = det.team?.id;
      if (!teamId) continue;

      const clock = det.clock?.displayValue || "";
      const minute = parseInt(clock) || 0;

      const p1 = det.participants?.[0]?.athlete;
      const p2 = det.participants?.[1]?.athlete;
      const key = `${type}-${p1?.id ?? p1?.displayName ?? ""}-${clock}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let playerName = p1?.shortName ?? p1?.displayName ?? "";
      let detail = "";

      if (type === "goal") {
        if (det.ownGoal) detail = "OG";
        else if (det.penaltyKick) detail = "P";
      } else if (type === "substitution") {
        playerName = p2?.shortName ?? p2?.displayName ?? playerName;
        detail = p1?.shortName ?? p1?.displayName ?? "";
      }

      let playerImage = "";
      const mainPlayer = (type === "substitution" && p2) ? p2 : p1;
      if (mainPlayer?.id) {
        playerImage = `https://a.espncdn.com/i/headshots/soccer/players/full/${mainPlayer.id}.png`;
      }

      let fallbackImage = "";
      const mainPlayerName = mainPlayer?.shortName ?? mainPlayer?.displayName ?? "";
      if (teamId && mainPlayerName) {
        const localTeamId = Object.keys(ESPN_TEAM_MAP).find(
          (key) => ESPN_TEAM_MAP[key] === teamId
        );
        const localTeam = teamsData.teams.find((t) => t.id === localTeamId) as unknown as LocalTeam | undefined;
        const localPicture = findLocalPlayerPicture(localTeam, mainPlayerName);
        if (localPicture) {
          fallbackImage = localPicture;
        }
      }

      events.push({
        id: det.id ?? String(events.length),
        minute,
        displayMinute: clock,
        type: type as "goal" | "yellow-card" | "red-card" | "substitution",
        teamId,
        playerName,
        detail,
        playerImage,
        fallbackImage,
      });
    }

    events.sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));
    return events;
  }, [view.details]);

  const lineupData = useMemo(() => {
    if (!view.rosters || view.rosters.length === 0) return null;

    const parseTeamRoster = (homeAway: "home" | "away") => {
      const teamRoster = view.rosters.find((r) => r.homeAway === homeAway);
      if (!teamRoster) return null;

      const starters = (teamRoster.roster ?? []).filter((p) => p.starter);
      
      const getPositionGroup = (p: EspnRosterItem) => {
        const name = p.position?.name?.toLowerCase() || "";
        const abbr = p.position?.abbreviation?.toLowerCase() || "";

        if (name.includes("goalkeeper") || abbr === "g" || abbr === "gk") {
          return "GK";
        }
        if (name.includes("defender") || name.includes("back") || abbr === "d" || abbr === "cb" || abbr === "lb" || abbr === "rb" || abbr === "df") {
          return "DF";
        }
        if (name.includes("midfielder") || name.includes("midfield") || abbr === "m" || abbr === "dm" || abbr === "am" || abbr === "cm" || abbr === "lm" || abbr === "rm" || abbr === "mf") {
          return "MF";
        }
        if (name.includes("forward") || name.includes("striker") || name.includes("winger") || abbr === "f" || abbr === "fw" || abbr === "cf" || abbr === "st") {
          return "FW";
        }
        
        // Fallback checks on abbreviations
        if (abbr.includes("d")) return "DF";
        if (abbr.includes("m")) return "MF";
        if (abbr.includes("f")) return "FW";
        if (abbr.includes("g")) return "GK";

        return "MF"; // Default fallback
      };

      const gk = starters.filter((p) => getPositionGroup(p) === "GK");
      const df = starters.filter((p) => getPositionGroup(p) === "DF");
      const mf = starters.filter((p) => getPositionGroup(p) === "MF");
      const fw = starters.filter((p) => getPositionGroup(p) === "FW");

      const mapPlayer = (p: EspnRosterItem) => {
        const teamId = teamRoster.team?.id;
        const mainPlayerName = p.athlete?.shortName ?? p.athlete?.displayName ?? "";
        let fallbackImage = "";
        
        if (teamId && mainPlayerName) {
          const localTeamId = Object.keys(ESPN_TEAM_MAP).find(
            (key) => ESPN_TEAM_MAP[key] === teamId
          );
          const localTeam = teamsData.teams.find((t) => t.id === localTeamId) as unknown as LocalTeam | undefined;
          const localPicture = findLocalPlayerPicture(localTeam, mainPlayerName);
          if (localPicture) {
            fallbackImage = localPicture;
          }
        }

        const playerId = p.athlete?.id;
        let goalsCount = 0;
        let yellowCardsCount = 0;
        let redCardsCount = 0;

        if (playerId || mainPlayerName) {
          const seenEvents = new Set<string>();
          for (const det of view.details) {
            const athlete = det.participants?.[0]?.athlete;
            const athleteId = athlete?.id;
            const athleteName = athlete?.shortName || athlete?.displayName || "";

            const matches = playerId 
              ? (athleteId === playerId)
              : (athleteName && mainPlayerName && (athleteName.toLowerCase() === mainPlayerName.toLowerCase()));

            if (!matches) continue;

            const clock = det.clock?.displayValue || "";
            const eventType = det.type?.type || "";
            const isGoal = Boolean(det.scoringPlay);

            const eventKey = `${isGoal ? "goal" : eventType}-${clock}`;
            if (seenEvents.has(eventKey)) continue;
            seenEvents.add(eventKey);

            if (isGoal) {
              goalsCount++;
            } else if (eventType === "yellow-card") {
              yellowCardsCount++;
            } else if (eventType === "red-card") {
              redCardsCount++;
            }
          }
        }

        return {
          id: p.athlete?.id,
          name: p.athlete?.shortName ?? p.athlete?.displayName ?? "",
          jersey: p.jersey,
          playerImage: p.athlete?.headshot?.href ?? "",
          fallbackImage,
          goals: goalsCount,
          yellowCards: yellowCardsCount,
          redCards: redCardsCount,
        };
      };

      return {
        gk: gk.map(mapPlayer),
        df: df.map(mapPlayer),
        mf: mf.map(mapPlayer),
        fw: fw.map(mapPlayer),
      };
    };

    return {
      home: parseTeamRoster("home"),
      away: parseTeamRoster("away"),
    };
  }, [view.rosters, view.details]);

  if (!gameId) return null;

  const firstHalfEnd = timelineEvents.findIndex((e) => e.minute > 45);
  const halfTimeIndex = firstHalfEnd > 0 ? firstHalfEnd : -1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="match-stats-title"
        aria-modal="true"
        role="dialog"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0c0f14] shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 sm:px-6">
          <div>
            <h2 id="match-stats-title" className="text-base font-black text-white sm:text-lg">
              Chi tiết trận đấu
            </h2>
            <p className="text-xs text-zinc-500">Dữ liệu trực tiếp từ ESPN</p>
          </div>
          <div className="flex items-center gap-2">
            {canApply && (
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/50"
              >
                Áp dụng vào mô phỏng
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết trận đấu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xl text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              ×
            </button>
          </div>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6 transform-gpu">
          {loading ? (
            <SoccerSkeleton variant="match-detail" />
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <p className="font-semibold text-rose-400">Không thể tải chi tiết trận đấu</p>
              <p className="text-sm text-zinc-500">{error}</p>
            </div>
          ) : !view.home || !view.away ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">
              ESPN chưa có dữ liệu cho trận đấu này.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
                <div className="mb-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {data?.header?.season?.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatKickoff(matchDate ?? view.competition?.date)}
                    {view.competition?.venue?.fullName ? ` · ${view.competition.venue.fullName}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                  {[view.home, view.away].map((team, index) => {
                    const goals = getUniqueEvents(team.id, (event) => Boolean(event.scoringPlay));
                    const redCards = getUniqueEvents(team.id, (event) => event.type?.type === "red-card");

                    const groupedScorers = (() => {
                      const groups = new Map<
                        string,
                        {
                          name: string;
                          minutes: Array<{ display: string; flag: string }>;
                          firstMinute: number;
                        }
                      >();
                      for (const goal of goals) {
                        const athlete = goal.participants?.[0]?.athlete;
                        const key = athlete?.id ?? athlete?.displayName ?? "team";
                        const name = athlete?.shortName ?? athlete?.displayName ?? "Bàn thắng";
                        const minuteRaw = goal.clock?.displayValue ?? "";
                        const flag = goal.ownGoal ? " (OG)" : goal.penaltyKick ? " (P)" : "";
                        const minuteNum = parseInt(minuteRaw) || 0;
                        const existing = groups.get(key);
                        if (existing) {
                          existing.minutes.push({ display: minuteRaw, flag });
                        } else {
                          groups.set(key, { name, minutes: [{ display: minuteRaw, flag }], firstMinute: minuteNum });
                        }
                      }
                      return Array.from(groups.values()).sort((a, b) => a.firstMinute - b.firstMinute);
                    })();

                    return (
                      <div
                        key={team.id}
                        className={`flex min-w-0 flex-col items-center text-center ${index === 1 ? "col-start-3" : ""}`}
                      >
                        {team.logo ? (
                          <Image
                            src={team.logo}
                            alt=""
                            width={64}
                            height={64}
                            className="h-12 w-12 object-contain sm:h-16 sm:w-16"
                            unoptimized
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-zinc-800 sm:h-16 sm:w-16" />
                        )}
                        <span className="mt-2 text-sm font-bold text-white sm:text-base">{team.name}</span>
                        <div className="mt-2 space-y-1">
                          {groupedScorers.map((scorer, scorerIndex) => (
                            <p
                              key={`${scorer.name}-${scorerIndex}`}
                              className="text-[11px] text-zinc-400 sm:text-xs"
                            >
                              {scorer.name}{" "}
                              {scorer.minutes.map((m) => `${m.display}${m.flag}`).join(", ")}
                            </p>
                          ))}
                          {redCards.map((card, cardIndex) => (
                            <p key={card.id ?? cardIndex} className="text-[11px] font-medium text-rose-400 sm:text-xs">
                              {card.participants?.[0]?.athlete?.displayName ?? "Thẻ đỏ"}{" "}
                              {card.clock?.displayValue} ■
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className="col-start-2 row-start-1 flex min-w-24 flex-col items-center pt-1">
                    <div className="font-mono text-3xl font-black leading-none text-emerald-400 sm:text-4xl">
                      {view.home.score} - {view.away.score}
                    </div>
                    <div className="mt-2 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {isKickoffString(view.competition?.status?.type?.shortDetail)
                        ? formatKickoffShort(matchDate ?? view.competition?.date)
                        : (view.competition?.status?.type?.shortDetail ??
                           view.competition?.status?.type?.description ??
                           "Scheduled")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("stats")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === "stats"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Thống kê
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === "timeline"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("lineup")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === "lineup"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Đội hình
                </button>
              </div>

              {activeTab === "stats" && (
                hasStats ? (
                  <div>
                    <div className="space-y-4">
                      {[
                        ...STAT_KEYS.map((stat) => ({
                          ...stat,
                          home: getStat(view.home, stat.key),
                          away: getStat(view.away, stat.key),
                        })),
                        {
                          key: "yellowCards",
                          label: "Thẻ vàng",
                          home: String(getCards(view.home.id, "yellow-card")),
                          away: String(getCards(view.away.id, "yellow-card")),
                        },
                        {
                          key: "redCards",
                          label: "Thẻ đỏ",
                          home: String(getCards(view.home.id, "red-card")),
                          away: String(getCards(view.away.id, "red-card")),
                        },
                      ].map((stat) => {
                        const homeValue = parseStat(stat.home);
                        const awayValue = parseStat(stat.away);
                        const total = homeValue + awayValue;
                        const homeWidth = total > 0 ? (homeValue / total) * 100 : 50;

                        return (
                          <div key={stat.key}>
                            <div className="mb-1.5 grid grid-cols-[3rem_1fr_3rem] items-center text-sm font-bold">
                              <span className="text-center text-zinc-200">{stat.home}</span>
                              <span className="text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
                                {stat.label}
                              </span>
                              <span className="text-center text-zinc-200">{stat.away}</span>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                              <div className="bg-emerald-500" style={{ width: `${homeWidth}%` }} />
                              <div className="flex-1 bg-rose-500" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center">
                    <p className="font-semibold text-zinc-300">Thống kê sẽ có khi trận đấu bắt đầu</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Bạn vẫn có thể xem giờ thi đấu, sân vận động và trạng thái trận ở phía trên.
                    </p>
                  </div>
                )
              )}

              {activeTab === "timeline" && (
                timelineEvents.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                  Chưa có sự kiện nào cho trận đấu này.
                </div>
              ) : (
                <div className="relative">
                  {timelineEvents.map((event, i) => {
                    const isHome = event.teamId === view.home?.id;
                    const isHalfTime = halfTimeIndex === i;

                    const icon =
                      event.type === "goal" ? "⚽" :
                      event.type === "substitution" ? "↔" :
                      event.type === "yellow-card" ? "🟨" :
                      event.type === "red-card" ? "🟥" : "";

                    return (
                      <div key={event.id}>
                        {isHalfTime && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="flex-1 border-t border-zinc-700/50" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                              HIỆP 1
                            </span>
                            <div className="flex-1 border-t border-zinc-700/50" />
                          </div>
                        )}
                        <div className="relative flex items-start gap-3 py-1.5">
                          <div className={`flex flex-1 items-center justify-end gap-2 ${isHome ? "" : "invisible"}`}>
                              {isHome && (
                                <>
                                  <span className="shrink-0 text-xs text-zinc-500">{event.detail}</span>
                                  <span className="truncate text-right text-xs font-medium text-zinc-200">
                                    {event.playerName}
                                  </span>
                                </>
                              )}
                          </div>

                          <div className="flex shrink-0 flex-col items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm leading-none">
                              {icon}
                            </div>
                            <div className="mt-0.5 text-[10px] font-bold tabular-nums text-zinc-500">
                              {event.displayMinute}
                            </div>
                          </div>

                          <div className={`flex flex-1 items-center gap-2 ${!isHome ? "" : "invisible"}`}>
                              {!isHome && (
                                <>
                                  <span className="truncate text-xs font-medium text-zinc-200">
                                    {event.playerName}
                                  </span>
                                  <span className="shrink-0 text-xs text-zinc-500">{event.detail}</span>
                                </>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 border-t border-zinc-700/50" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      KẾT THÚC
                    </span>
                    <div className="flex-1 border-t border-zinc-700/50" />
                  </div>
                </div>
              )
            )}

              {activeTab === "lineup" && (
                !lineupData || !lineupData.home || !lineupData.away ? (
                  <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
                    Chưa có dữ liệu đội hình cho trận đấu này.
                  </div>
                ) : (
                  <div className="relative mx-auto max-w-md p-2">
                    {/* 2D Pitch Container */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-white/20 bg-emerald-950 p-6 flex flex-col justify-between shadow-inner">
                      {/* Pitch lines */}
                      <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/20 -translate-y-1/2" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/20 rounded-full" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/30 rounded-full" />
                      
                      {/* Penalty boxes */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-14 border-2 border-white/20 border-t-0" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-5 border-2 border-white/20 border-t-0" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-14 border-2 border-white/20 border-b-0" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-5 border-2 border-white/20 border-b-0" />

                      {/* Team Labels */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-zinc-100 border border-white/10 select-none z-20">
                        {view.away?.logo ? (
                          <Image src={view.away.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" unoptimized />
                        ) : (
                          <span>🛡️</span>
                        )}
                        <span>{view.away?.name}</span>
                      </div>

                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-zinc-100 border border-white/10 select-none z-20">
                        {view.home?.logo ? (
                          <Image src={view.home.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 object-contain" unoptimized />
                        ) : (
                          <span>🏠</span>
                        )}
                        <span>{view.home?.name}</span>
                      </div>

                      {(() => {
                        const renderPlayerNode = (
                          p: {
                            id?: string;
                            name: string;
                            jersey: string;
                            playerImage?: string;
                            fallbackImage?: string;
                            goals: number;
                            yellowCards: number;
                            redCards: number;
                          },
                          isHome: boolean
                        ) => (
                          <div key={p.id} className="flex flex-col items-center text-center w-14 z-10">
                            <div className="relative">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white border border-white/50 ${isHome ? 'bg-blue-600' : 'bg-rose-600'}`}>
                                {p.jersey}
                              </div>

                              {/* Cards Overlay (Top-Right) */}
                              {(p.yellowCards > 0 || p.redCards > 0) && (
                                <div className="absolute -top-1 -right-1 flex items-center justify-center bg-black/80 rounded-full w-3.5 h-3.5 text-[8px] border border-white/30" title={p.redCards > 0 ? "Thẻ đỏ" : "Thẻ vàng"}>
                                  {p.redCards > 0 ? "🟥" : "🟨"}
                                </div>
                              )}

                              {/* Goals Overlay (Bottom-Right) */}
                              {p.goals > 0 && (
                                <div className="absolute -bottom-1 -right-1 flex items-center justify-center bg-black/80 rounded-full px-0.5 min-w-[14px] h-3.5 text-[8px] text-white font-bold border border-white/30" title={`${p.goals} bàn thắng`}>
                                  ⚽{p.goals > 1 && <span className="ml-[1px] text-[7px]">{p.goals}</span>}
                                </div>
                              )}
                            </div>
                            <span className="mt-1 text-[9px] font-bold text-white truncate w-full drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]">
                              {p.name}
                            </span>
                          </div>
                        );

                        return (
                          <>
                            {/* AWAY TEAM (Top Half) */}
                            <div className="flex flex-col justify-between h-[45%]">
                              {/* GK */}
                              <div className="flex justify-center">
                                {lineupData.away.gk.map((p) => renderPlayerNode(p, false))}
                              </div>
                              {/* DF */}
                              <div className="flex justify-around">
                                {lineupData.away.df.map((p) => renderPlayerNode(p, false))}
                              </div>
                              {/* MF */}
                              <div className="flex justify-around px-2">
                                {lineupData.away.mf.map((p) => renderPlayerNode(p, false))}
                              </div>
                              {/* FW */}
                              <div className="flex justify-around px-4">
                                {lineupData.away.fw.map((p) => renderPlayerNode(p, false))}
                              </div>
                            </div>

                            {/* HOME TEAM (Bottom Half) */}
                            <div className="flex flex-col-reverse justify-between h-[45%]">
                              {/* GK */}
                              <div className="flex justify-center">
                                {lineupData.home.gk.map((p) => renderPlayerNode(p, true))}
                              </div>
                              {/* DF */}
                              <div className="flex justify-around">
                                {lineupData.home.df.map((p) => renderPlayerNode(p, true))}
                              </div>
                              {/* MF */}
                              <div className="flex justify-around px-2">
                                {lineupData.home.mf.map((p) => renderPlayerNode(p, true))}
                              </div>
                              {/* FW */}
                              <div className="flex justify-around px-4">
                                {lineupData.home.fw.map((p) => renderPlayerNode(p, true))}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
