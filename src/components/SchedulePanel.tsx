"use client";

import { useMemo, useState } from "react";
import { FlagIcon } from "./FlagIcon";
import { MatchInfo } from "./MatchInfo";
import { useSchedule } from "@/lib/hooks";
import {
  countPickedKnockoutMatches,
  countPlayedGroupMatches,
  filterScheduleEntries,
  groupScheduleByDate,
  type ScheduleEntry,
  type ScheduleFilter,
} from "@/lib/schedule";
import { isPlayedResult } from "@/lib/fifa/types";
import type { Team } from "@/lib/fifa/types";

const FILTERS: { id: ScheduleFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "group", label: "Vòng bảng" },
  { id: "knockout", label: "Knockout" },
];

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

  if (!team) {
    return (
      <span
        className={[
          "text-sm font-medium text-zinc-500",
          side === "away" ? "text-right block" : "",
        ].join(" ")}
      >
        {placeholder}
      </span>
    );
  }

  const tone = isWinner
    ? "text-amber-300"
    : isLoser
      ? "text-zinc-500"
      : "text-zinc-100";

  if (side === "home") {
    return (
      <div className={`flex items-center gap-2 min-w-0 ${tone}`} title={team.name}>
        <FlagIcon code={team.code} size="sm" title={team.name} />
        <span className="text-sm font-semibold truncate leading-none">{team.code}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 min-w-0 justify-end ${tone}`}
      title={team.name}
    >
      <span className="text-sm font-semibold truncate leading-none">{team.code}</span>
      <FlagIcon code={team.code} size="sm" title={team.name} />
    </div>
  );
}

function ScoreDisplay({ entry }: { entry: ScheduleEntry }) {
  if (entry.kind === "group") {
    if (!isPlayedResult(entry.result)) {
      return <span className="font-mono text-sm text-zinc-600">– : –</span>;
    }
    return (
      <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
        {entry.result.home} : {entry.result.away}
      </span>
    );
  }

  if (!entry.winner) {
    return <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Chưa chọn</span>;
  }

  return (
    <span className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wide">
      ✓ {entry.winner.code}
    </span>
  );
}

function ScheduleMatchCard({ entry }: { entry: ScheduleEntry }) {
  const winnerId = entry.kind === "knockout" ? entry.winner?.id : undefined;

  return (
    <article
      data-testid={`schedule-match-${entry.matchNumber}`}
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 px-3 py-2">
        <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-xs font-medium text-zinc-400">
          {entry.stageLabel}
        </span>
        <ScoreDisplay entry={entry} />
      </div>

      <div className="px-3 pt-2">
        <MatchInfo
          date={entry.date}
          stadium={entry.stadium}
          city={entry.city}
          matchNumber={entry.matchNumber}
          compact
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 py-2.5 px-3">
        <MatchSide
          team={entry.home}
          placeholder={entry.homePlaceholder}
          winnerId={winnerId}
          side="home"
        />
        <span className="text-zinc-700 text-sm select-none">vs</span>
        <MatchSide
          team={entry.away}
          placeholder={entry.awayPlaceholder}
          winnerId={winnerId}
          side="away"
        />
      </div>
    </article>
  );
}

export function SchedulePanel() {
  const entries = useSchedule();
  const [filter, setFilter] = useState<ScheduleFilter>("all");

  const filtered = useMemo(
    () => filterScheduleEntries(entries, filter),
    [entries, filter]
  );
  const dateGroups = useMemo(() => groupScheduleByDate(filtered), [filtered]);

  const playedGroup = countPlayedGroupMatches(entries);
  const pickedKnockout = countPickedKnockoutMatches(entries);

  return (
    <div className="space-y-6" data-testid="schedule-panel">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Lịch thi đấu</h2>
        <p className="mt-1 text-sm text-zinc-500">
          104 trận · giờ Việt Nam · cập nhật theo kịch bản mô phỏng của bạn
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-400">
          <span>
            Vòng bảng:{" "}
            <span className="font-mono text-amber-400/90">{playedGroup}/72</span> đã nhập tỉ số
          </span>
          <span>
            Knockout:{" "}
            <span className="font-mono text-emerald-400/90">{pickedKnockout}/32</span> đã chọn đội thắng
          </span>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Lọc lịch thi đấu"
      >
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            data-testid={`schedule-filter-${item.id}`}
            onClick={() => setFilter(item.id)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              filter === item.id
                ? "bg-amber-500 text-black"
                : "border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {dateGroups.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">Không có trận nào trong bộ lọc này.</p>
      ) : (
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <section key={group.dateKey} data-testid={`schedule-date-${group.dateKey}`}>
              <h3 className="sticky top-[9.5rem] z-10 mb-3 rounded-lg border border-zinc-800 bg-[#0c0f14]/95 px-4 py-2 text-sm font-semibold text-amber-400/90 backdrop-blur capitalize">
                {group.dateLabel}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.entries.map((entry) => (
                  <ScheduleMatchCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}