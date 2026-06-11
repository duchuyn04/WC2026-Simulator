"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface MatchStatsModalProps {
  gameId: string | null;
  onClose: () => void;
}

const STAT_KEYS = [
  { key: "possessionPct", label: "Kiểm soát bóng (%)" },
  { key: "totalShots", label: "Số cú sút" },
  { key: "shotsOnTarget", label: "Sút trúng đích" },
  { key: "wonCorners", label: "Phạt góc" },
  { key: "foulsCommitted", label: "Phạm lỗi" },
  { key: "yellowCards", label: "Thẻ vàng" },
  { key: "redCards", label: "Thẻ đỏ" },
  { key: "offsides", label: "Việt vị" },
  { key: "saves", label: "Cứu thua" }
];

export function MatchStatsModal({ gameId, onClose }: MatchStatsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gameId) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/match-summary/${gameId}`);
        const json = await res.json();
        if (isMounted) setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  if (!gameId) return null;

  // Render Modal Structure
  const team1 = data?.boxscore?.teams?.[0];
  const team2 = data?.boxscore?.teams?.[1];

  const getStat = (teamData: any, statKey: string) => {
    const stat = teamData?.statistics?.find((s: any) => s.name === statKey);
    return stat ? stat.displayValue : "0";
  };

  const getStatNum = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getUniqueGoals = (teamId: string) => {
    const goals = data?.header?.competitions?.[0]?.details?.filter((d: any) => d.team?.id === teamId && d.scoringPlay) || [];
    const unique: any[] = [];
    const seen = new Set();
    for (const g of goals) {
      const key = `${g.participants?.[0]?.athlete?.id}-${g.clock?.displayValue}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(g);
      }
    }
    return unique;
  };

  const getUniqueRedCards = (teamId: string) => {
    const rcs = data?.keyEvents?.filter((d: any) => d.team?.id === teamId && d.type?.text?.includes("Red Card")) || [];
    const unique: any[] = [];
    const seen = new Set();
    for (const rc of rcs) {
      const key = `${rc.participants?.[0]?.athlete?.id}-${rc.clock?.displayValue}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rc);
      }
    }
    return unique;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden rounded-3xl border border-zinc-800 bg-[#0c0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <h2 className="text-lg font-black text-white">Thống kê trận đấu</h2>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500"></div>
            </div>
          ) : !data || !team1 || !team2 ? (
            <div className="flex h-48 items-center justify-center text-zinc-500">
              Không có dữ liệu thống kê
            </div>
          ) : (
            <div className="space-y-5">
              {/* Teams & Score */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col items-center gap-2 text-center w-[30%]">
                  <Image src={team1.team.logo} alt={team1.team.name} width={56} height={56} className="h-14 w-14 object-contain drop-shadow-md" unoptimized />
                  <span className="font-bold text-white text-sm">{team1.team.name}</span>
                  <div className="flex flex-col items-center mt-1 space-y-0.5">
                    {getUniqueGoals(team1.team.id).map((g: any, i: number) => (
                      <span key={`g-${i}`} className="text-xs text-zinc-400">
                        {g.participants?.[0]?.athlete?.shortName} {g.clock?.displayValue}{g.ownGoal ? " (OG)" : ""}{g.penaltyKick ? " (P)" : ""}
                      </span>
                    ))}
                    {getUniqueRedCards(team1.team.id).map((rc: any, i: number) => (
                      <span key={`rc-${i}`} className="text-xs text-rose-500 font-medium">
                        {rc.participants?.[0]?.athlete?.displayName} {rc.clock?.displayValue} 🟥
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-start pt-2 w-[40%]">
                  <div className="text-4xl font-black text-amber-400 leading-none">
                    {data.header?.competitions?.[0]?.competitors?.find((c:any) => c.id === team1.team.id)?.score ?? "?"} - {data.header?.competitions?.[0]?.competitors?.find((c:any) => c.id === team2.team.id)?.score ?? "?"}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{data.header?.competitions?.[0]?.status?.type?.shortDetail || "Kết thúc"}</div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center w-[30%]">
                  <Image src={team2.team.logo} alt={team2.team.name} width={56} height={56} className="h-14 w-14 object-contain drop-shadow-md" unoptimized />
                  <span className="font-bold text-white text-sm">{team2.team.name}</span>
                  <div className="flex flex-col items-center mt-1 space-y-0.5">
                    {getUniqueGoals(team2.team.id).map((g: any, i: number) => (
                      <span key={`g-${i}`} className="text-xs text-zinc-400">
                        {g.participants?.[0]?.athlete?.shortName} {g.clock?.displayValue}{g.ownGoal ? " (OG)" : ""}{g.penaltyKick ? " (P)" : ""}
                      </span>
                    ))}
                    {getUniqueRedCards(team2.team.id).map((rc: any, i: number) => (
                      <span key={`rc-${i}`} className="text-xs text-rose-500 font-medium">
                        {rc.participants?.[0]?.athlete?.displayName} {rc.clock?.displayValue} 🟥
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats List */}
              <div className="mt-6 space-y-3.5">
                {STAT_KEYS.map(({ key, label }) => {
                  const val1 = getStat(team1, key);
                  const val2 = getStat(team2, key);
                  
                  const num1 = getStatNum(val1);
                  const num2 = getStatNum(val2);
                  const total = num1 + num2;
                  const pct1 = total > 0 ? (num1 / total) * 100 : 50;
                  const pct2 = total > 0 ? (num2 / total) * 100 : 50;

                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-zinc-300 w-10 text-center">{val1}</span>
                        <span className="text-zinc-500 text-[11px] uppercase tracking-wide">{label}</span>
                        <span className="text-zinc-300 w-10 text-center">{val2}</span>
                      </div>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div className="bg-emerald-500" style={{ width: `${pct1}%` }}></div>
                        <div className="bg-rose-500" style={{ width: `${pct2}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
