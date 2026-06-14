"use client";

import Image from "next/image";
import { useState } from "react";
import defaultStatsData from "../../data/fifa-tournament-stats.json";
import { FlagIcon } from "./FlagIcon";
import { fetchTournamentStatsFromFifa } from "@/lib/tournament-stats-fetch";
import { useSimulation } from "../lib/store";

type StatsLoadSource = "api" | "client" | "failed";

type CategoryId =
  | "goals"
  | "assists"
  | "penalties"
  | "ownGoals"
  | "yellowCards"
  | "redCards";

type Leader = {
  playerId: string;
  name: string;
  shortName: string;
  pictureUrl: string | null;
  team: {
    id: string;
    name: string;
    code: string;
    flagUrl: string | null;
  } | null;
  value: number;
  scored?: number;
  successRate?: number;
};

const CATEGORIES: Array<{
  id: CategoryId;
  label: string;
  heading: string;
  valueLabel: string;
}> = [
  { id: "goals", label: "Bàn thắng", heading: "Vua phá lưới", valueLabel: "bàn" },
  { id: "assists", label: "Kiến tạo", heading: "Kiến tạo nhiều nhất", valueLabel: "kiến tạo" },
  { id: "penalties", label: "Penalty", heading: "Sút penalty nhiều nhất", valueLabel: "lần sút" },
  { id: "ownGoals", label: "Phản lưới", heading: "Phản lưới nhà nhiều nhất", valueLabel: "bàn" },
  { id: "yellowCards", label: "Thẻ vàng", heading: "Nhận thẻ vàng nhiều nhất", valueLabel: "thẻ" },
  { id: "redCards", label: "Thẻ đỏ", heading: "Nhận thẻ đỏ nhiều nhất", valueLabel: "thẻ" },
];


function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function PlayerAvatar({ leader }: { leader: Leader }) {
  if (!leader.pictureUrl) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500">
        <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-700 bg-zinc-800">
      <Image
        src={leader.pictureUrl}
        alt=""
        fill
        sizes="48px"
        className="object-cover object-top"
        unoptimized
      />
    </div>
  );
}

export function TournamentStatsBoard() {
  const [categoryId, setCategoryId] = useState<CategoryId>("goals");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const tournamentStats = useSimulation((s) => s.tournamentStats);
  const statsFetchedAt = useSimulation((s) => s.statsFetchedAt);
  const setTournamentStats = useSimulation((s) => s.setTournamentStats);

  const statsData = {
    completedMatches: defaultStatsData.completedMatches,
    fetchedAt: statsFetchedAt || defaultStatsData.fetchedAt,
    leaderboards: tournamentStats || defaultStatsData.leaderboards,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/tournament-stats");
      if (response.ok) {
        const data = await response.json();
        if (!data.error && data.leaderboards) {
          setTournamentStats(data);
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to fetch api stats during manual refresh:", error);
    }

    try {
      const fallbackStats = await fetchTournamentStatsFromFifa();
      setTournamentStats(fallbackStats);
    } catch (fallbackError) {
      console.error("Failed to fetch fallback stats during manual refresh:", fallbackError);
    } finally {
      setIsRefreshing(false);
    }
  };

  const category = CATEGORIES.find((item) => item.id === categoryId) ?? CATEGORIES[0];
  const leaderboards = statsData.leaderboards as Record<CategoryId, Leader[]>;
  const leaders = leaderboards[category.id] ?? [];

  return (
    <section className="min-w-0 space-y-5" data-testid="tournament-stats">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Dữ liệu chính thức từ FIFA
            </p>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
            >
              {isRefreshing ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Đã tổng hợp {statsData.completedMatches} trận hoàn tất
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Cập nhật: {formatUpdatedAt(statsData.fetchedAt)}
        </p>
      </div>

      <div
        className="flex max-w-full gap-2 overflow-x-auto border-b border-zinc-800 pb-px"
        role="tablist"
        aria-label="Danh mục thống kê cầu thủ"
      >
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={categoryId === item.id}
            data-testid={`stats-category-${item.id}`}
            onClick={() => setCategoryId(item.id)}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors",
              categoryId === item.id
                ? "border-[#ff4d6d] text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-100">{category.heading}</h3>
            <p className="text-xs text-zinc-500">Top 10 cầu thủ tại World Cup 2026</p>
          </div>
          <span className="rounded-full bg-[#6a041f]/30 px-3 py-1 text-xs font-semibold text-[#ff6b86]">
            {category.label}
          </span>
        </div>

        {leaders.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <p className="font-semibold text-zinc-300">
              Chưa có dữ liệu {category.label.toLocaleLowerCase("vi-VN")}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Bảng xếp hạng sẽ tự động cập nhật sau khi FIFA công bố thống kê trận đấu.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-zinc-800/70">
            {leaders.map((leader, index) => (
              <li
                key={leader.playerId}
                className="grid grid-cols-[2rem_3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-900/50 sm:grid-cols-[2.5rem_3rem_minmax(0,1fr)_8rem]"
              >
                <span
                  className={[
                    "font-mono text-sm font-black",
                    index === 0 ? "text-amber-300" : index < 3 ? "text-zinc-300" : "text-zinc-600",
                  ].join(" ")}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <PlayerAvatar leader={leader} />

                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-100">{leader.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    {leader.team?.code && (
                      <FlagIcon
                        code={leader.team.code}
                        size="sm"
                        title={leader.team.name}
                      />
                    )}
                    <span className="truncate">{leader.team?.name ?? "Không xác định"}</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-xl font-black text-emerald-400">
                    {leader.value}
                  </p>
                  <p className="text-[11px] text-zinc-500">{category.valueLabel}</p>
                  {category.id === "penalties" && (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {leader.scored ?? 0}/{leader.value} thành công · {leader.successRate ?? 0}%
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
