"use client";

import { useState } from "react";
import { PortraitLightbox } from "@/components/PortraitLightbox";

type TeamColors = {
  primary?: string | null;
  secondary?: string | null;
};

type RosterTeam = {
  name: string;
  code: string | null;
  colors: TeamColors;
};

type Coach = {
  name?: string | null;
  alias?: string | null;
  pictureUrl?: string | null;
  countryCode?: string | null;
  birthDate?: string | null;
};

type Player = {
  id: string;
  name?: string | null;
  pictureUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  realPosition?: string | null;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  club?: { name?: string | null } | null;
};

type PlayerGroup = {
  position: string;
  players: Player[];
};

type Props = {
  team: RosterTeam;
  headCoach?: Coach | null;
  groupedPlayers: PlayerGroup[];
};

const positionMap: Record<string, string> = {
  Goalkeeper: "Thủ môn",
  Defender: "Hậu vệ",
  Midfielder: "Tiền vệ",
  Forward: "Tiền đạo",
};

const ageReference = new Date("2026-06-11T00:00:00Z");

function translatePosition(pos?: string | null) {
  if (!pos) return "Cầu thủ";
  return positionMap[pos] || pos;
}

function ageOn(date?: string | null) {
  if (!date) return null;
  const birthDate = new Date(date);
  let age = ageReference.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = ageReference.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ageReference.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function TeamRoster({ team, headCoach, groupedPlayers }: Props) {
  const [activeFilter, setActiveFilter] = useState("all");
  const totalPlayers = groupedPlayers.reduce((sum, group) => sum + group.players.length, 0);
  const visibleGroups =
    activeFilter === "all"
      ? groupedPlayers
      : groupedPlayers.filter((group) => group.position === activeFilter);
  const showHeadCoach = !!headCoach && (activeFilter === "all" || activeFilter === "coach");

  const filters = [
    { id: "all", label: "Tất cả", count: totalPlayers + (headCoach ? 1 : 0) },
    { id: "coach", label: "HLV", count: headCoach ? 1 : 0 },
    ...groupedPlayers.map((group) => ({
      id: group.position,
      label: translatePosition(group.position),
      count: group.players.length,
    })),
  ];

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400">Đội hình</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">Lọc theo vị trí</h2>
          </div>
          <p className="text-xs font-semibold text-zinc-500">
            {activeFilter === "all" ? `${totalPlayers} cầu thủ` : filters.find((item) => item.id === activeFilter)?.label}
          </p>
        </div>

        <div className="mt-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max gap-2">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  disabled={filter.count === 0}
                  aria-pressed={active}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs font-black transition sm:px-4 sm:text-sm",
                    active
                      ? "bg-amber-500 text-zinc-950"
                      : "border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-amber-500/70 hover:text-amber-300",
                    filter.count === 0 ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  {filter.label}
                  <span className={active ? "ml-2 text-zinc-800" : "ml-2 text-zinc-500"}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showHeadCoach && headCoach && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2 sm:mb-4 sm:pb-3">
            <h2 className="text-xl font-black sm:text-2xl">HLV trưởng</h2>
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">
              {headCoach.countryCode}
            </span>
          </div>
          <article className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#11151d] p-2 sm:block sm:max-w-sm sm:rounded-[1.5rem] sm:p-3">
            <div className="relative h-[86px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-64 sm:w-full sm:rounded-2xl [&>div]:h-full [&>img]:h-full sm:[&>div]:h-64 sm:[&>img]:h-64">
              <PortraitLightbox
                src={headCoach.pictureUrl}
                alt={headCoach.name ?? "HLV trưởng"}
                title={headCoach.alias ?? headCoach.name ?? "HLV trưởng"}
                subtitle={`Head coach${ageOn(headCoach.birthDate) ? ` · ${ageOn(headCoach.birthDate)} tuổi` : ""}`}
                placeholderProps={{
                  badge: "HLV",
                  label: "Head coach",
                  name: headCoach.alias ?? headCoach.name,
                  teamCode: team.code,
                  primaryColor: team.colors.primary,
                  secondaryColor: team.colors.secondary,
                }}
              />
              <span className="hidden rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black uppercase text-zinc-950 shadow-lg shadow-black/30 sm:absolute sm:right-3 sm:top-3 sm:inline-flex sm:px-3 sm:py-1 sm:text-sm">
                HLV
              </span>
            </div>
            <div className="min-w-0 flex-1 px-1 pb-1 text-left sm:px-2 sm:pt-4 sm:text-center">
              <h3 className="truncate text-base font-black leading-tight sm:text-lg">
                {headCoach.alias ?? headCoach.name}
              </h3>
              <div className="mt-2 h-px w-4/5 bg-zinc-800 sm:mx-auto sm:mt-4" />
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 sm:mt-3 sm:text-xs">
                Head coach{ageOn(headCoach.birthDate) ? ` · ${ageOn(headCoach.birthDate)} tuổi` : ""}
              </p>
            </div>
          </article>
        </div>
      )}

      {visibleGroups.map(({ position, players }) => (
        <div key={position} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 sm:rounded-3xl sm:p-4">
          <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2 sm:mb-4 sm:pb-3">
            <h2 className="text-xl font-black sm:text-2xl">{translatePosition(position)}</h2>
            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-400">
              {players.length} cầu thủ
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {players.map((player) => (
              <article key={player.id} className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-[#11151d] p-2 sm:block sm:rounded-[1.5rem] sm:p-3">
                <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-64 sm:w-full sm:rounded-2xl [&>div]:h-full [&>img]:h-full sm:[&>div]:h-64 sm:[&>img]:h-64">
                  <PortraitLightbox
                    src={player.pictureUrl}
                    alt={player.name ?? "Cầu thủ"}
                    title={player.name ?? "Cầu thủ"}
                    subtitle={`${translatePosition(player.realPosition ?? player.position)} · ${team.name}`}
                    placeholderProps={{
                      badge: `#${player.jerseyNumber ?? "-"}`,
                      label: translatePosition(player.realPosition ?? player.position),
                      name: player.name,
                      teamCode: team.code,
                      primaryColor: team.colors.primary,
                      secondaryColor: team.colors.secondary,
                    }}
                  />
                  <span className="hidden rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-black text-zinc-950 shadow-lg shadow-black/30 sm:absolute sm:right-3 sm:top-3 sm:inline-flex sm:px-3 sm:py-1 sm:text-base">
                    {player.jerseyNumber ?? "-"}
                  </span>
                </div>
                <div className="min-w-0 flex-1 px-1 text-left sm:px-2 sm:pb-1 sm:pt-4 sm:text-center">
                  <div className="flex min-w-0 items-center gap-1.5 sm:block">
                    <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-zinc-950 sm:hidden">
                      {player.jerseyNumber ?? "-"}
                    </span>
                    <h3 className="truncate text-sm font-black leading-tight sm:text-lg">{player.name}</h3>
                  </div>
                  <div className="mt-2 h-px w-4/5 bg-zinc-800 sm:mx-auto sm:mt-3" />
                  <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:mt-2 sm:text-[11px] sm:tracking-[0.16em]">
                    {translatePosition(player.realPosition ?? player.position)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-amber-300 sm:mt-1 sm:text-sm">
                    {player.club?.name ?? "Chưa có CLB"}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-zinc-500 sm:hidden">
                    {ageOn(player.birthDate) ?? "-"} tuổi · {player.heightCm ?? "-"}cm · {player.weightKg ?? "-"}kg
                  </p>
                </div>
                <div className="hidden text-center text-[10px] text-zinc-500 sm:mt-3 sm:grid sm:w-auto sm:grid-cols-3 sm:gap-2 sm:text-xs">
                  <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{ageOn(player.birthDate) ?? "-"}</b>Tuổi</div>
                  <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{player.heightCm ?? "-"}</b>cm</div>
                  <div className="rounded-lg bg-zinc-900/70 px-1 py-0.5 sm:rounded-xl sm:p-2"><b className="block text-xs text-zinc-200 sm:text-sm">{player.weightKg ?? "-"}</b>kg</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
