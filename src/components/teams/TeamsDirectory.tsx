"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { flagCdnUrl, flagUrl } from "@/lib/data";

type Confederation = "All" | "AFC" | "CAF" | "CONCACAF" | "CONMEBOL" | "OFC" | "UEFA";

type TeamCard = {
  id: string;
  code: string;
  name: string;
  slug: string;
  confederationId: string;
  group: string | null;
  worldRanking: number | null;
  appearances: number | null;
  hostTeam: boolean;
  squadCount: number;
  headCoachName: string | null;
};

const filters: Confederation[] = ["All", "AFC", "CAF", "CONCACAF", "CONMEBOL", "OFC", "UEFA"];

export function TeamsDirectory({ teams }: { teams: TeamCard[] }) {
  const [activeFilter, setActiveFilter] = useState<Confederation>("All");

  useEffect(() => {
    const savedFilter = sessionStorage.getItem("teamsFilter") as Confederation;
    if (savedFilter && filters.includes(savedFilter)) {
      Promise.resolve().then(() => setActiveFilter(savedFilter));
    }
    // Clear it so it only persists when returning from a team page
    sessionStorage.removeItem("teamsFilter");
  }, []);

  const handleFilterChange = (filter: Confederation) => {
    setActiveFilter(filter);
  };

  const filteredTeams = teams.filter(
    (team) => activeFilter === "All" || team.confederationId === activeFilter,
  );

  return (
    <section className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:mb-6 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-1.5 sm:gap-2 sm:p-2">
          {filters.map((filter) => {
            const count = filter === "All" ? teams.length : teams.filter((team) => team.confederationId === filter).length;
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                className={[
                  "rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition-colors sm:px-4 sm:py-2 sm:text-sm",
                  isActive
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white",
                ].join(" ")}
                aria-pressed={isActive}
              >
                {filter}
                <span className={isActive ? "ml-2 text-zinc-800" : "ml-2 text-amber-300"}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-1.5 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-sm">
            Teams & stats
          </p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {activeFilter === "All" ? "All teams" : activeFilter}
          </h2>
        </div>
        <p className="text-xs font-medium text-zinc-300 sm:text-sm">
          Hiển thị {filteredTeams.length} / {teams.length} đội
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.slug}`}
            onClick={() => sessionStorage.setItem("teamsFilter", activeFilter)}
            className="group overflow-hidden rounded-xl border border-zinc-800 bg-[#11151d] transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-[#151a24] sm:rounded-3xl"
          >
            <div className="relative border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_16rem)] p-2 sm:p-5">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:gap-4">
                <img
                  src={flagCdnUrl(team.code, 160)}
                  alt={`Cờ ${team.name}`}
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-12 rounded-md object-cover ring-1 ring-white/25 sm:h-16 sm:w-24 sm:rounded-2xl"
                  onError={(event) => {
                    event.currentTarget.src = flagUrl(team.code);
                  }}
                />
                <div className="flex w-full flex-row items-center gap-1 text-left sm:mt-0 sm:w-auto sm:flex-col sm:items-end sm:gap-2 sm:text-right">
                  <span className="rounded-full bg-zinc-950/80 px-1.5 py-0.5 text-[9px] font-black text-amber-300 sm:px-3 sm:py-1 sm:text-xs">
                    {team.confederationId}
                  </span>
                  {team.hostTeam && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-zinc-950 sm:px-3 sm:py-1 sm:text-xs">
                      Host
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-2 truncate text-sm font-black leading-tight tracking-tight group-hover:text-amber-300 sm:mt-5 sm:text-2xl">
                {team.name}
              </h3>
              <p className="mt-1 truncate text-[10px] font-medium text-zinc-300 sm:text-sm">
                Group {team.group} · FIFA #{team.worldRanking ?? "-"}
              </p>
              <p className="mt-1 truncate text-[10px] font-medium text-zinc-400 sm:hidden">
                {team.squadCount} cầu thủ · {team.appearances ?? "-"} lần
              </p>
            </div>

            <div className="hidden grid-cols-3 divide-x divide-zinc-800 text-center text-xs text-zinc-500 sm:grid">
              <div className="p-2 sm:p-3">
                <b className="block text-sm sm:text-base text-zinc-100">{team.squadCount}</b>
                <span className="text-[10px] sm:text-xs text-zinc-300">Cầu thủ</span>
              </div>
              <div className="p-2 sm:p-3">
                <b className="block text-sm sm:text-base text-zinc-100">{team.appearances ?? "-"}</b>
                <span className="text-[10px] sm:text-xs text-zinc-300">Lần dự</span>
              </div>
              <div className="p-2 sm:p-3">
                <b className="block truncate text-sm sm:text-base text-zinc-100">{team.headCoachName ?? "-"}</b>
                <span className="text-[10px] sm:text-xs text-zinc-300">HLV</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
