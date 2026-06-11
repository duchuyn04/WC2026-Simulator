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
      setActiveFilter(savedFilter);
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
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
          {filters.map((filter) => {
            const count = filter === "All" ? teams.length : teams.filter((team) => team.confederationId === filter).length;
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition-colors",
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

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Teams & stats
          </p>
          <h2 className="text-3xl font-black tracking-tight">
            {activeFilter === "All" ? "All teams" : activeFilter}
          </h2>
        </div>
        <p className="text-sm font-medium text-zinc-300">
          Hiển thị {filteredTeams.length} / {teams.length} đội
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.slug}`}
            onClick={() => sessionStorage.setItem("teamsFilter", activeFilter)}
            className="group overflow-hidden rounded-3xl border border-zinc-800 bg-[#11151d] transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-[#151a24]"
          >
            <div className="relative border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_16rem)] p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <img
                  src={flagCdnUrl(team.code, 160)}
                  alt={`Cờ ${team.name}`}
                  className="h-10 w-16 sm:h-16 sm:w-24 rounded-lg sm:rounded-2xl object-cover ring-1 ring-white/25"
                  onError={(event) => {
                    event.currentTarget.src = flagUrl(team.code);
                  }}
                />
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                  <span className="rounded-full bg-zinc-950/80 px-2 py-1 sm:px-3 sm:text-xs font-black text-[10px] text-amber-300">
                    {team.confederationId}
                  </span>
                  {team.hostTeam && (
                    <span className="rounded-full bg-amber-500 px-2 py-1 sm:px-3 text-[10px] sm:text-xs font-black text-zinc-950">
                      Host
                    </span>
                  )}
                </div>
              </div>
              <h3 className="mt-3 sm:mt-5 text-lg sm:text-2xl font-black leading-tight tracking-tight group-hover:text-amber-300">
                {team.name}
              </h3>
              <p className="mt-1 text-[11px] sm:text-sm font-medium text-zinc-300">
                Group {team.group} · FIFA #{team.worldRanking ?? "-"}
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-zinc-800 text-center text-xs text-zinc-500">
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
