"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

type Leader = {
  displayValue: string;
  value: number;
  athlete: {
    id: string;
    displayName: string;
    shortName: string;
    headshot?: { href: string; alt: string };
    jersey?: string;
    team: {
      id: string;
      displayName: string;
      logos: { href: string }[];
    };
  };
};

type StatCategory = {
  name: string;
  displayName: string;
  leaders: Leader[];
};

export function EspnStatsBoard() {
  const [stats, setStats] = useState<StatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"scoring" | "discipline" | "performance">("scoring");

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        // Using season=2026 if available, else will return default or empty
        const res = await fetch("https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats([]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const getVisibleStats = () => {
    if (view === "scoring") {
      return stats.filter(s => s.name.toLowerCase().includes("goal") || s.name.toLowerCase().includes("assist") || s.name.toLowerCase().includes("scoring"));
    }
    if (view === "discipline") {
      return stats.filter(s => s.name.toLowerCase().includes("foul") || s.name.toLowerCase().includes("card") || s.name.toLowerCase().includes("discipline"));
    }
    if (view === "performance") {
      return stats.filter(s => !s.name.toLowerCase().includes("goal") && !s.name.toLowerCase().includes("assist") && !s.name.toLowerCase().includes("foul") && !s.name.toLowerCase().includes("card"));
    }
    return stats;
  };

  const visibleStats = getVisibleStats();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#6a041f] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-rose-500 py-12">Lỗi tải dữ liệu thống kê: {error}</div>;
  }

  if (stats.length === 0) {
    return <div className="text-center text-zinc-500 py-12">Chưa có dữ liệu thống kê cho giải đấu này.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-lg w-fit mx-auto border border-zinc-800/50">
        <button
          onClick={() => setView("scoring")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === "scoring" ? "bg-[#6a041f] text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Scoring
        </button>
        <button
          onClick={() => setView("discipline")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === "discipline" ? "bg-[#6a041f] text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Discipline
        </button>
        <button
          onClick={() => setView("performance")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === "performance" ? "bg-[#6a041f] text-white shadow-lg" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Performance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleStats.map((statCategory) => (
          <div key={statCategory.name} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="bg-zinc-800/40 px-4 py-3 border-b border-zinc-800/60">
              <h3 className="font-semibold text-zinc-100">{statCategory.displayName}</h3>
            </div>
            <div className="divide-y divide-zinc-800/40">
              {statCategory.leaders?.map((leader, idx) => (
                <div key={leader.athlete.id} className="flex items-center gap-4 p-4 hover:bg-zinc-800/20 transition-colors">
                  <div className="font-mono text-zinc-500 w-4 text-center">{idx + 1}</div>
                  
                  <div className="relative w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700/50 flex-shrink-0">
                    {leader.athlete.headshot?.href ? (
                      <Image
                        src={leader.athlete.headshot.href}
                        alt={leader.athlete.displayName}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-200 truncate">{leader.athlete.displayName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {leader.athlete.team.logos?.[0]?.href && (
                        <div className="relative w-4 h-4 flex-shrink-0">
                          <Image
                            src={leader.athlete.team.logos[0].href}
                            alt={leader.athlete.team.displayName}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      <span className="text-xs text-zinc-400 truncate">{leader.athlete.team.displayName}</span>
                    </div>
                  </div>
                  
                  <div className="text-xl font-bold text-zinc-100 font-mono">
                    {leader.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {visibleStats.length === 0 && (
          <div className="col-span-full text-center text-zinc-500 py-8">
            Không có dữ liệu cho mục này.
          </div>
        )}
      </div>
    </div>
  );
}
